// ==============================================================================
// FlowAI Server Provider Adapter (Deno edge runtime).
// Resolves provider configuration from environment secrets, performs strict
// fetch calls with timeouts and ONE bounded retry, and normalizes errors.
// When no credentials are configured, `resolveProviderConfig` returns null and
// actions respond with the deterministic rule-based engine (never fabricating
// model output).
// ==============================================================================

export type ProviderId = 'gemini' | 'openai' | 'anthropic';

export interface ProviderRuntimeConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

export interface ChatRequest {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ProviderResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: ProviderId;
}

export type ProviderErrorCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'network'
  | 'bad_response'
  | 'schema'
  | 'timeout';

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: ProviderErrorCode,
    readonly status?: number
  ) {
    super(message);
  }
}

import {
  validateModelLifecycle,
  getDefaultActiveModel,
  getModelMetadata,
  MODEL_REGISTRY,
  ModelMetadata,
} from './modelRegistry.ts';

export {
  validateModelLifecycle,
  getDefaultActiveModel,
  getModelMetadata,
  MODEL_REGISTRY,
};
export type { ModelMetadata };

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
/** Hard server-side bounds (directive: maximum input/output sizes). */
export const MAX_OUTPUT_TOKENS = 2048;
/** Bounded input size. */
export const MAX_INPUT_CHARS = 60_000;

export interface ProviderEnvSource {
  get(key: string): string | undefined;
}

export interface ProviderResolution {
  config: ProviderRuntimeConfig | null;
  /** Set when the preferred provider was named but its secret is missing. */
  unconfiguredReason?: string;
  /** Warning when a model is legacy or mapped from deprecation */
  modelWarning?: string;
}

/**
 * Resolves the provider config from server secrets.
 * Precedence: FLOWAI_PROVIDER (gemini|openai|anthropic) > first available key (gemini > anthropic > openai).
 * Validates the chosen model against the centralized model registry.
 * Returns config=null when no provider key is configured at all.
 */
export function resolveProviderConfig(env: ProviderEnvSource): ProviderResolution {
  const providerPref = (env.get('FLOWAI_PROVIDER') || '').trim().toLowerCase();
  const rawModelOverride = (env.get('FLOWAI_MODEL') || '').trim();
  const geminiKey = (env.get('GEMINI_API_KEY') || '').trim();
  const openaiKey = (env.get('OPENAI_API_KEY') || '').trim();
  const anthropicKey = (env.get('ANTHROPIC_API_KEY') || '').trim();

  const hasGemini = geminiKey.length > 0;
  const hasOpenAI = openaiKey.length > 0;
  const hasAnthropic = anthropicKey.length > 0;

  let provider: ProviderId | null = null;
  if (providerPref === 'gemini' || providerPref === 'openai' || providerPref === 'anthropic') {
    const keyReady =
      providerPref === 'gemini'
        ? hasGemini
        : providerPref === 'anthropic'
        ? hasAnthropic
        : hasOpenAI;

    if (!keyReady) {
      return {
        config: null,
        unconfiguredReason: `Provider '${providerPref}' was selected (FLOWAI_PROVIDER) but its API key secret is missing.`,
      };
    }
    provider = providerPref;
  } else if (providerPref && providerPref !== 'gemini' && providerPref !== 'openai' && providerPref !== 'anthropic') {
    return { config: null, unconfiguredReason: `FLOWAI_PROVIDER='${providerPref}' is not a supported provider (use gemini|openai|anthropic).` };
  } else {
    provider = hasGemini ? 'gemini' : hasAnthropic ? 'anthropic' : hasOpenAI ? 'openai' : null;
  }

  if (!provider) return { config: null };

  const defaultModel = getDefaultActiveModel(provider);
  let effectiveModel = rawModelOverride || defaultModel;
  let modelWarning: string | undefined;

  // Validate model against registry
  const lifecycle = validateModelLifecycle(effectiveModel);
  if (!lifecycle.valid && lifecycle.recommendedModel) {
    modelWarning = lifecycle.warning;
    effectiveModel = lifecycle.recommendedModel;
  } else if (lifecycle.warning) {
    modelWarning = lifecycle.warning;
  }

  const apiKey =
    provider === 'gemini'
      ? geminiKey
      : provider === 'anthropic'
      ? anthropicKey
      : openaiKey;

  return {
    config: { provider, apiKey, model: effectiveModel },
    modelWarning,
  };
}

// ------------------------------------------------------------------------------
// PROVIDER CALLS
// ------------------------------------------------------------------------------
export interface ProviderCallOptions {
  timeoutMs?: number;
  retries?: number;
  jsonMode?: boolean;
  fetchImpl?: typeof fetch;
}

async function rawRequest(
  config: ProviderRuntimeConfig,
  body: unknown,
  url: string,
  opts: ProviderCallOptions
): Promise<ProviderResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retries = Math.max(0, Math.min(2, opts.retries ?? 1));

  const attempt = async (): Promise<{ status: number; json: any }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.provider === 'gemini'
            ? { 'x-goog-api-key': config.apiKey }
            : config.provider === 'anthropic'
            ? { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' }
            : { Authorization: `Bearer ${config.apiKey}` }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, json };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR') {
        throw new ProviderError(`Provider request timed out after ${timeoutMs}ms`, 'timeout');
      }
      throw new ProviderError(`Provider network error: ${err?.message ?? 'unknown'}`, 'network');
    } finally {
      clearTimeout(timer);
    }
  };

  let lastError: ProviderError | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const { status, json } = await attempt();

      if (status === 200) {
        return normalizeResponse(config, json, opts.jsonMode ?? false);
      }

      if (status === 401 || status === 403) {
        throw new ProviderError(`Provider rejected credentials (HTTP ${status}). Verify the API key and model name.`, 'unauthorized', status);
      }
      if (status === 429) {
        throw new ProviderError('Provider rate limit reached.', 'rate_limited', status);
      }
      // One bounded retry for transient upstream failures (5xx).
      if (status >= 500 && i < retries) {
        lastError = new ProviderError(`Provider upstream failure (HTTP ${status}).`, 'bad_response', status);
        await sleep(retryBackoffMs(i));
        continue;
      }
      throw new ProviderError(
        `Provider request failed (HTTP ${status}): ${json?.error?.message ?? json?.error?.type ?? 'unknown error'}`,
        'bad_response',
        status
      );
    } catch (err) {
      if (err instanceof ProviderError && (err.code === 'rate_limited' || err.code === 'timeout' || err.code === 'unauthorized')) {
        throw err;
      }
      if (err instanceof ProviderError) {
        lastError = err;
        if (i >= retries) throw err;
        await sleep(retryBackoffMs(i));
        continue;
      }
      throw new ProviderError(`Provider call failed: ${(err as Error)?.message ?? 'unknown'}`, 'network');
    }
  }

  throw lastError ?? new ProviderError('Provider call failed', 'network');
}

function normalizeResponse(config: ProviderRuntimeConfig, json: any, jsonMode: boolean): ProviderResponse {
  let text = '';
  let promptTokens = 0;
  let completionTokens = 0;

  if (config.provider === 'gemini') {
    const candidate = json?.candidates?.[0];
    text = (candidate?.content?.parts ?? [])
      ?.map((p: any) => p?.text ?? '')
      .join('');
    promptTokens = json?.usageMetadata?.promptTokenCount ?? 0;
    completionTokens = json?.usageMetadata?.candidatesTokenCount ?? 0;
  } else if (config.provider === 'anthropic') {
    text = (json?.content ?? [])
      ?.filter((p: any) => p?.type === 'text')
      ?.map((p: any) => p?.text ?? '')
      .join('');
    promptTokens = json?.usage?.input_tokens ?? 0;
    completionTokens = json?.usage?.output_tokens ?? 0;
  } else {
    text = json?.choices?.[0]?.message?.content ?? '';
    promptTokens = json?.usage?.prompt_tokens ?? 0;
    completionTokens = json?.usage?.completion_tokens ?? 0;
  }

  if (typeof text !== 'string') text = '';

  if (jsonMode && !text.trim()) {
    throw new ProviderError('Provider returned an empty JSON response.', 'bad_response');
  }

  return { text, promptTokens, completionTokens, model: config.model, provider: config.provider };
}

function retryBackoffMs(attemptIndex: number): number {
  return attemptIndex === 0 ? 500 : 1200;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function clampInput(userText: string): string {
  return userText.length > MAX_INPUT_CHARS ? userText.slice(0, MAX_INPUT_CHARS) : userText;
}

/** Free-form completion. */
export async function callProvider(
  config: ProviderRuntimeConfig,
  request: ChatRequest,
  opts: ProviderCallOptions = {}
): Promise<ProviderResponse> {
  const jsonMode = opts.jsonMode === true;
  const temperature = clampTemperature(request.temperature ?? 0.4);
  const maxOutputTokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(64, request.maxOutputTokens ?? MAX_OUTPUT_TOKENS));

  if (config.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`;
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: clampInput(request.user) }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (request.system) {
      body.system_instruction = { parts: [{ text: request.system }] };
    }
    return rawRequest(config, body, url, opts);
  }

  if (config.provider === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages';
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: maxOutputTokens,
      temperature,
      messages: [{ role: 'user', content: clampInput(request.user) }],
    };
    if (request.system) {
      body.system = request.system;
    }
    return rawRequest(config, body, url, opts);
  }

  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: config.model,
    temperature,
    max_tokens: maxOutputTokens,
    response_format: jsonMode ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: clampInput(request.user) },
    ].filter(m => typeof m.content === 'string' && m.content),
  };
  return rawRequest(config, body, url, opts);
}

/** Streaming chunk receiver for real-time progressive responses. */
export async function callProviderStreamChunks(
  config: ProviderRuntimeConfig,
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  opts: ProviderCallOptions = {}
): Promise<ProviderResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const temperature = clampTemperature(request.temperature ?? 0.4);
  const maxOutputTokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(64, request.maxOutputTokens ?? MAX_OUTPUT_TOKENS));

  let url = '';
  let body: unknown;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`;
    headers['x-goog-api-key'] = config.apiKey;
    body = {
      contents: [{ role: 'user', parts: [{ text: clampInput(request.user) }] }],
      generationConfig: { temperature, maxOutputTokens },
      ...(request.system ? { system_instruction: { parts: [{ text: request.system }] } } : {}),
    };
  } else if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: config.model,
      max_tokens: maxOutputTokens,
      temperature,
      stream: true,
      messages: [{ role: 'user', content: clampInput(request.user) }],
      ...(request.system ? { system: request.system } : {}),
    };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    body = {
      model: config.model,
      temperature,
      max_tokens: maxOutputTokens,
      stream: true,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: clampInput(request.user) },
      ].filter(m => typeof m.content === 'string' && m.content),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new ProviderError(
        `Stream request failed (HTTP ${res.status}): ${errJson?.error?.message || res.statusText}`,
        res.status === 401 ? 'unauthorized' : res.status === 429 ? 'rate_limited' : 'bad_response',
        res.status
      );
    }

    if (!res.body) {
      throw new ProviderError('No response body returned from stream endpoint', 'bad_response');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            let textChunk = '';

            if (config.provider === 'gemini') {
              textChunk = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } else if (config.provider === 'anthropic') {
              if (data?.type === 'content_block_delta') {
                textChunk = data?.delta?.text ?? '';
              }
            } else {
              textChunk = data?.choices?.[0]?.delta?.content ?? '';
            }

            if (textChunk) {
              accumulatedText += textChunk;
              onChunk(textChunk);
            }
          } catch {
            /* ignore incomplete SSE chunks */
          }
        }
      }
    }

    return {
      text: accumulatedText,
      promptTokens: Math.ceil(request.user.length / 4),
      completionTokens: Math.ceil(accumulatedText.length / 4),
      model: config.model,
      provider: config.provider,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ProviderError(`Provider stream timed out after ${timeoutMs}ms`, 'timeout');
    }
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(`Provider stream error: ${err?.message || 'unknown'}`, 'network');
  } finally {
    clearTimeout(timer);
  }
}

/** Structured JSON completion with schema validation delegated to the caller. */
export async function callProviderJson<T>(
  config: ProviderRuntimeConfig,
  request: ChatRequest,
  validate: (raw: string) => T,
  opts: ProviderCallOptions = {}
): Promise<{ data: T; tokens: number; model: string; rawText: string }> {
  const response = await callProvider(config, request, { ...opts, jsonMode: true });

  // Strip markdown fences some models add despite json mode.
  const cleaned = response.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();

  let data: T;
  try {
    data = validate(cleaned);
  } catch (err: any) {
    throw new ProviderError(`Structured output failed schema validation: ${err?.message ?? 'invalid JSON'}`, 'schema');
  }
  if (data === undefined || data === null) {
    throw new ProviderError('Structured output could not be parsed.', 'schema');
  }

  return {
    data,
    tokens: response.promptTokens + response.completionTokens,
    model: response.model,
    rawText: response.text,
  };
}

function clampTemperature(t: number): number {
  return Math.min(1.5, Math.max(0, t));
}
