import { z } from 'zod';
import { IAIProviderAdapter, CompletionOptions, CompletionResult, StructuredResult } from './aiProviderAdapter';
import { AIProviderId } from '../types/ai.types';

export class GeminiAdapter implements IAIProviderAdapter {
  readonly id: AIProviderId = 'gemini';
  readonly name = 'Google Gemini';
  readonly defaultModel = 'gemini-1.5-flash';

  private apiKey: string | null = null;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || null;
    this.model = model || this.defaultModel;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10 && !this.apiKey.includes('placeholder'));
  }

  getProviderInfo() {
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      isAvailable: this.isConfigured(),
      statusNotice: this.isConfigured()
        ? 'Connected to Gemini API'
        : 'Gemini API key is not configured in settings or environment',
    };
  }

  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is not configured. Provide an API key in FlowCRM Settings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.4,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    };

    if (options?.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `Gemini API request failed with status ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const totalTokens = (data?.usageMetadata?.promptTokenCount || 0) + (data?.usageMetadata?.candidatesTokenCount || 0);

    // Approximate cost: $0.075 per 1M input, $0.30 per 1M output for gemini-1.5-flash
    const costEstimate = (totalTokens / 1_000_000) * 0.15;

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
      throw new Error('Gemini API is not configured.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 2048,
        responseMimeType: 'application/json',
      },
    };

    if (options?.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `Gemini API request failed with status ${response.status}`;
      throw new Error(msg);
    }

    const resJson = await response.json();
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const totalTokens = (resJson?.usageMetadata?.promptTokenCount || 0) + (resJson?.usageMetadata?.candidatesTokenCount || 0);
    const costEstimate = (totalTokens / 1_000_000) * 0.15;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (err: any) {
      throw new Error(`Failed to parse model JSON output: ${err.message}`);
    }

    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(`Model output did not match expected schema: ${validationResult.error.message}`);
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
