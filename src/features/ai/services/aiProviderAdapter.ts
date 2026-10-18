import { z } from 'zod';
import { AIProviderId } from '../types/ai.types';

export interface CompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  tokensUsed?: number;
  costEstimate?: number;
  providerId: AIProviderId;
  model: string;
}

export interface StructuredResult<T> {
  data: T;
  rawText: string;
  tokensUsed?: number;
  costEstimate?: number;
  providerId: AIProviderId;
  model: string;
}

export interface IAIProviderAdapter {
  readonly id: AIProviderId;
  readonly name: string;
  readonly defaultModel: string;

  isConfigured(): boolean;
  getProviderInfo(): {
    id: AIProviderId;
    name: string;
    model: string;
    isAvailable: boolean;
    statusNotice?: string;
  };

  generateCompletion(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;

  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: CompletionOptions
  ): Promise<StructuredResult<T>>;
}
