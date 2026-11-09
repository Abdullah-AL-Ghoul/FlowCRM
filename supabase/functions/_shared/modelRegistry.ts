// ==============================================================================
// FlowAI Centralized Model Registry & Lifecycle Management
// Canonical directory of supported enterprise LLM models across Gemini, OpenAI,
// and Anthropic, including lifecycle statuses, context limits, capabilities,
// structured output compatibility, and deprecation monitoring.
// ==============================================================================

export type ProviderId = 'gemini' | 'openai' | 'anthropic';
export type ModelLifecycleStatus = 'active' | 'preview' | 'legacy' | 'deprecated' | 'retired';

export interface ModelCapability {
  structuredOutputs: boolean;
  functionCalling: boolean;
  streaming: boolean;
  multimodalVision: boolean;
  multimodalAudio: boolean;
  systemPromptSupport: boolean;
}

export interface ModelMetadata {
  id: string;
  provider: ProviderId;
  name: string;
  status: ModelLifecycleStatus;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability;
  configRequirements: string[];
  fallbackModel: string;
  deprecationDate?: string;
  retirementDate?: string;
  replacementModel?: string;
}

export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
  // Google Gemini Models
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    provider: 'gemini',
    name: 'Gemini 1.5 Flash (Production)',
    status: 'active',
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: true,
      systemPromptSupport: true,
    },
    configRequirements: ['GEMINI_API_KEY'],
    fallbackModel: 'gemini-1.5-flash',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    name: 'Gemini 2.0 Flash (Next-Gen)',
    status: 'active',
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: true,
      systemPromptSupport: true,
    },
    configRequirements: ['GEMINI_API_KEY'],
    fallbackModel: 'gemini-1.5-flash',
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'gemini',
    name: 'Gemini 1.5 Pro',
    status: 'active',
    contextWindow: 2_097_152,
    maxOutputTokens: 8_192,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: true,
      systemPromptSupport: true,
    },
    configRequirements: ['GEMINI_API_KEY'],
    fallbackModel: 'gemini-1.5-flash',
  },
  'gemini-1.0-pro': {
    id: 'gemini-1.0-pro',
    provider: 'gemini',
    name: 'Gemini 1.0 Pro (Legacy)',
    status: 'deprecated',
    contextWindow: 32_768,
    maxOutputTokens: 2_048,
    capabilities: {
      structuredOutputs: false,
      functionCalling: true,
      streaming: true,
      multimodalVision: false,
      multimodalAudio: false,
      systemPromptSupport: false,
    },
    configRequirements: ['GEMINI_API_KEY'],
    fallbackModel: 'gemini-1.5-flash',
    deprecationDate: '2024-05-01',
    retirementDate: '2025-02-15',
    replacementModel: 'gemini-1.5-flash',
  },

  // OpenAI Models
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini (Default Fast)',
    status: 'active',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['OPENAI_API_KEY'],
    fallbackModel: 'gpt-4o',
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o (Omni High-Reasoning)',
    status: 'active',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['OPENAI_API_KEY'],
    fallbackModel: 'gpt-4o-mini',
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'GPT-3.5 Turbo (Legacy)',
    status: 'legacy',
    contextWindow: 16_385,
    maxOutputTokens: 4_096,
    capabilities: {
      structuredOutputs: false,
      functionCalling: true,
      streaming: true,
      multimodalVision: false,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['OPENAI_API_KEY'],
    fallbackModel: 'gpt-4o-mini',
    replacementModel: 'gpt-4o-mini',
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet (Upgraded)',
    status: 'active',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['ANTHROPIC_API_KEY'],
    fallbackModel: 'claude-3-5-haiku-20241022',
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku (Fast)',
    status: 'active',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: {
      structuredOutputs: true,
      functionCalling: true,
      streaming: true,
      multimodalVision: true,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['ANTHROPIC_API_KEY'],
    fallbackModel: 'claude-3-5-sonnet-20241022',
  },
  'claude-2.1': {
    id: 'claude-2.1',
    provider: 'anthropic',
    name: 'Claude 2.1 (Retired)',
    status: 'retired',
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    capabilities: {
      structuredOutputs: false,
      functionCalling: false,
      streaming: true,
      multimodalVision: false,
      multimodalAudio: false,
      systemPromptSupport: true,
    },
    configRequirements: ['ANTHROPIC_API_KEY'],
    fallbackModel: 'claude-3-5-haiku-20241022',
    replacementModel: 'claude-3-5-haiku-20241022',
  },
};

/**
 * Retrieves metadata for a model ID.
 * If the exact ID is unknown, attempts to infer provider or returns null.
 */
export function getModelMetadata(modelId: string): ModelMetadata | null {
  const normalized = modelId.trim().toLowerCase();
  return MODEL_REGISTRY[normalized] ?? null;
}

/**
 * Checks whether a model ID is currently active and non-deprecated.
 * If deprecated or retired, returns recommendation and replacement model.
 */
export function validateModelLifecycle(modelId: string): {
  valid: boolean;
  status: ModelLifecycleStatus;
  warning?: string;
  recommendedModel?: string;
} {
  const meta = getModelMetadata(modelId);
  if (!meta) {
    return {
      valid: true, // Unknown user-provided model override (could be custom or fine-tuned)
      status: 'active',
      warning: `Model '${modelId}' is not in the certified registry; ensuring standard API transport.`,
    };
  }

  if (meta.status === 'deprecated' || meta.status === 'retired') {
    return {
      valid: false,
      status: meta.status,
      warning: `Model '${modelId}' is ${meta.status}. Migrating to '${meta.replacementModel || meta.fallbackModel}'.`,
      recommendedModel: meta.replacementModel || meta.fallbackModel,
    };
  }

  if (meta.status === 'legacy') {
    return {
      valid: true,
      status: 'legacy',
      warning: `Model '${modelId}' is in legacy maintenance mode. Recommended upgrade: '${meta.replacementModel || meta.fallbackModel}'.`,
      recommendedModel: meta.replacementModel || meta.fallbackModel,
    };
  }

  return {
    valid: true,
    status: meta.status,
  };
}

/**
 * Returns the default active model for a given provider.
 */
export function getDefaultActiveModel(provider: ProviderId): string {
  switch (provider) {
    case 'gemini':
      return 'gemini-1.5-flash';
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
  }
}

/**
 * Lists all active certified models for documentation or UI selectors.
 */
export function listActiveCertifiedModels(): ModelMetadata[] {
  return Object.values(MODEL_REGISTRY).filter(
    (m) => m.status === 'active' || m.status === 'preview'
  );
}
