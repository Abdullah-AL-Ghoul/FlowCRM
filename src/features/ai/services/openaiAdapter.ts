import { z } from 'zod';
import { IAIProviderAdapter, CompletionOptions, CompletionResult, StructuredResult } from './aiProviderAdapter';
import { AIProviderId } from '../types/ai.types';

export class OpenAIAdapter implements IAIProviderAdapter {
  readonly id: AIProviderId = 'openai';
  readonly name = 'OpenAI';
  readonly defaultModel = 'gpt-4o-mini';

  private apiKey: string | null = null;
  private model: string;
  private endpoint: string;

  constructor(apiKey?: string, model?: string, endpoint?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) || null;
    this.model = model || this.defaultModel;
    this.endpoint = endpoint || 'https://api.openai.com/v1/chat/completions';
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().startsWith('sk-') && !this.apiKey.includes('placeholder'));
  }

  getProviderInfo() {
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      isAvailable: this.isConfigured(),
      statusNotice: this.isConfigured()
        ? 'Connected to OpenAI API'
        : 'OpenAI API key is not configured in settings or environment',
    };
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not configured.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 2048,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `OpenAI request failed with status ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const totalTokens = data?.usage?.total_tokens || 0;
    const costEstimate = (totalTokens / 1_000_000) * 0.3;

    return {
      text,
      tokensUsed: totalTokens,
      costEstimate,
      providerId: this.id,
      model: this.model,
    };
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: CompletionOptions
  ): Promise<StructuredResult<T>> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API is not configured.');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: `${options.systemPrompt}\nYou must output valid JSON.`,
      });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 2048,
        response_format: { type: 'json_object' },
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `OpenAI request failed with status ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '{}';
    const totalTokens = data?.usage?.total_tokens || 0;
    const costEstimate = (totalTokens / 1_000_000) * 0.3;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (err: any) {
      throw new Error(`Failed to parse OpenAI JSON output: ${err.message}`);
    }

    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(`OpenAI output did not match expected schema: ${validationResult.error.message}`);
    }

    return {
      data: validationResult.data,
      rawText,
      tokensUsed: totalTokens,
      costEstimate,
      providerId: this.id,
      model: this.model,
    };
  }
}
