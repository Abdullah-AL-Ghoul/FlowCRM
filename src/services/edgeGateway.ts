import { supabase } from '../lib/supabase';
import { FlowAIEnvelope, GroundedEvidence } from '../../supabase/functions/_shared/types';

/**
 * Direct, authenticated transport to the FlowAI edge function.
 *
 * Why manual fetch instead of supabase-js functions.invoke: we need to attach
 * an AbortSignal (cancellation of superseded Copilot requests) and read
 * structured error envelopes, which invoke() does not expose.
 *
 * Provider credentials NEVER reach this layer: the function holds all secrets
 * server-side. Payloads here contain only user questions and ids.
 */

export const FLOWAI_FUNCTION_NAME = 'flowai-assistant';

export class FlowAIGatewayError extends Error {
  constructor(
    message: string,
    public code:
      | 'unauthorized'
      | 'forbidden'
      | 'bad_request'
      | 'rate_limited'
      | 'payload_too_large'
      | 'not_configured'
      | 'upstream_error'
      | 'internal'
      | 'network'
      | 'aborted',
    public status?: number
  ) {
    super(message);
  }
}

function gatewayUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new FlowAIGatewayError('VITE_SUPABASE_URL is not configured', 'internal');
  return `${url.replace(/\/$/, '')}/functions/v1/${FLOWAI_FUNCTION_NAME}`;
}

async function authHeaders(): Promise<{ authorization: string; apikey: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new FlowAIGatewayError('No active session — please sign in again.', 'unauthorized');
  }
  const apiKey =
    ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined) ?? '';
  return { authorization: `Bearer ${token}`, apikey: apiKey };
}

export interface GatewayCallResult<T> {
  data: T;
  meta: { engine: 'gemini' | 'openai' | 'anthropic' | 'rules'; promptVersion: string; tool?: string; unconfigured?: boolean };
}

/**
 * Calls an edge function action and returns the unwrapped envelope.
 * Network failure with an undeployed function surfaces as a
 * FlowAIGatewayError('network') so callers can show honest guidance.
 */
export async function callFlowAIAction<T>(
  action: string,
  payload: Record<string, unknown>,
  options?: { signal?: AbortSignal }
): Promise<GatewayCallResult<T>> {
  const headers = await authHeaders();
  let response: Response;

  try {
    response = await fetch(gatewayUrl(), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: options?.signal,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw new FlowAIGatewayError('Request cancelled', 'aborted');
    }
    throw new FlowAIGatewayError(
      'AI gateway unreachable. Confirm the Supabase Edge Function "flowai-assistant" is deployed and reachable.',
      'network'
    );
  }

  let json: FlowAIEnvelope<unknown> & { error?: { code: string; message: string } };
  try {
    json = (await response.json()) as FlowAIEnvelope<unknown>;
  } catch {
    throw new FlowAIGatewayError(`AI gateway returned non-JSON response (HTTP ${response.status}).`, 'upstream_error', response.status);
  }

  if (!response.ok || !json.ok) {
    const errPayload = (!json.ok && json.error) || undefined;
    throw new FlowAIGatewayError(
      errPayload?.message || `AI gateway error (HTTP ${response.status}).`,
      ((errPayload?.code as FlowAIGatewayError['code']) || 'upstream_error'),
      response.status
    );
  }

  return {
    data: json.data as T,
    meta: {
      engine: json.meta.engine,
      promptVersion: json.meta.promptVersion,
      tool: json.meta.tool,
      unconfigured: json.meta.unconfigured,
    },
  };
}

export interface StreamInitPayload {
  toolUsed?: string;
  evidence?: GroundedEvidence[];
  engine?: string;
}

/**
 * Streams tokens/chunks from an edge action via Server-Sent Events (SSE).
 */
export async function callFlowAIStream(
  action: string,
  payload: Record<string, unknown>,
  onDelta: (chunk: string) => void,
  onInit?: (init: StreamInitPayload) => void,
  options?: { signal?: AbortSignal }
): Promise<{ fullText: string; toolUsed?: string; evidence: GroundedEvidence[]; engine: string }> {
  const headers = await authHeaders();
  let response: Response;

  try {
    response = await fetch(gatewayUrl(), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: options?.signal,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw new FlowAIGatewayError('Request cancelled', 'aborted');
    }
    throw new FlowAIGatewayError(
      'AI gateway unreachable. Confirm the Supabase Edge Function "flowai-assistant" is deployed and reachable.',
      'network'
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new FlowAIGatewayError(`AI gateway stream error (HTTP ${response.status}): ${errText}`, 'upstream_error', response.status);
  }

  if (!response.body) {
    throw new FlowAIGatewayError('No streaming response body received', 'upstream_error');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let toolUsed: string | undefined;
  let evidence: GroundedEvidence[] = [];
  let engine = 'rules';
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
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim();
        try {
          const msg = JSON.parse(jsonStr);
          if (msg.type === 'init') {
            toolUsed = msg.toolUsed;
            evidence = msg.evidence || [];
            engine = msg.engine || 'rules';
            onInit?.({ toolUsed, evidence, engine });
          } else if (msg.type === 'delta') {
            accumulated += msg.text;
            onDelta(msg.text);
          } else if (msg.type === 'done') {
            if (msg.fullText && !accumulated) accumulated = msg.fullText;
          }
        } catch {
          /* ignore incomplete line */
        }
      }
    }
  }

  return { fullText: accumulated, toolUsed, evidence, engine };
}

/** Gateway provider status for the Settings UI. */
export async function fetchGatewayStatus(workspaceId: string): Promise<{
  provider?: string;
  model?: string;
  configured: boolean;
  engine: 'gemini' | 'openai' | 'anthropic' | 'rules';
} | null> {
  try {
    const result = await callFlowAIAction<{ provider?: string; model?: string; configured: boolean; engine: 'gemini' | 'openai' | 'anthropic' | 'rules' }>(
      'status',
      { workspaceId }
    );
    return result.data ?? null;
  } catch {
    // Undeployed gateway → status unknown; the UI shows deployment guidance.
    return null;
  }
}

/** Server-authoritative usage counters via SECURITY DEFINER RPC. */
export async function fetchGatewayUsage(workspaceId: string) {
  // The generated client types predate the flowai_usage RPCs — type the call
  // manually to keep the browser bundle depending only on the publishable key.
  const rpcCall = supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  const { data, error } = await rpcCall('get_flowai_usage', {
    p_workspace_id: workspaceId,
    p_hourly_request_limit: 60,
    p_monthly_token_limit: 200000,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    requestsThisHour: Number(row?.requests_this_hour ?? 0),
    tokensThisMonth: Number(row?.tokens_this_month ?? 0),
    hourlyRequestLimit: Number(row?.hourly_request_limit ?? 60),
    monthlyTokenLimit: Number(row?.monthly_token_limit ?? 200000),
  };
}
