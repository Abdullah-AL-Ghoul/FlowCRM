// Compatibility re-export: the authoritative prompt templates live in the
// shared cross-runtime module consumed by the edge function. The client and
// tests import this path so prompt content has ONE source of truth.

export {
  FLOWAI_SYSTEM_DIRECTIVE,
  sanitizeUntrustedData,
  wrapUntrustedCRMData,
  wrapUntrustedMeetingNotes,
  buildSalesWriterPrompt,
  buildMeetingIntelligencePrompt,
  PROMPT_VERSION,
} from '../../../../supabase/functions/_shared/prompts';
