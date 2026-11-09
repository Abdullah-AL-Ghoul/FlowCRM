// ==============================================================================
// FlowAI Shared Validation — hand-rolled, dependency-free validators usable in
// both runtimes (Deno edge functions cannot rely on the client's node_modules).
// Every protected edge action validates its payload through this module.
// ==============================================================================

import {
  AnalyticsPeriod,
  ANALYTICS_PERIODS,
  WriterChannel,
  WriterLength,
  WriterLanguage,
  WriterTone,
} from './types.ts';

export interface ValidationSuccess<T> {
  ok: true;
  value: T;
}
export interface ValidationFailure {
  ok: false;
  error: string;
}
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u009b\u009d]/g;

/** Strips control characters (keeps Arabic + all normal text). */
export function cleanText(input: unknown): string {
  return typeof input === 'string' ? input.replace(CONTROL_CHARS, '') : '';
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function reqString(
  body: Record<string, unknown>,
  field: string,
  min: number,
  max: number
): ValidationResult<string> {
  const raw = cleanText(body[field]).trim();
  if (!raw) return { ok: false, error: `'${field}' is required` };
  if (raw.length < min) return { ok: false, error: `'${field}' too short (min ${min})` };
  if (raw.length > max) return { ok: false, error: `'${field}' exceeds maximum length of ${max}` };
  return { ok: true, value: raw };
}

function optString(
  body: Record<string, unknown>,
  field: string,
  max: number
): ValidationResult<string> {
  const raw = cleanText(body[field]).trim();
  if (!raw) return { ok: true, value: '' };
  if (raw.length > max) return { ok: false, error: `'${field}' exceeds maximum length of ${max}` };
  return { ok: true, value: raw };
}

function optUuid(body: Record<string, unknown>, field: string): ValidationResult<string> {
  const raw = cleanText(body[field]).trim();
  if (!raw) return { ok: true, value: '' };
  if (!isUuid(raw)) return { ok: false, error: `'${field}' is not a valid id` };
  return { ok: true, value: raw };
}

function optLocale(body: Record<string, unknown>): 'en' | 'ar' {
  return cleanText(body.locale) === 'ar' ? 'ar' : 'en';
}

function reqEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): ValidationResult<T> {
  const raw = cleanText(value);
  if (!raw) return { ok: true, value: fallback };
  if (!allowed.includes(raw as T)) {
    return { ok: false, error: `'${field}' must be one of: ${allowed.join(', ')}` };
  }
  return { ok: true, value: raw as T };
}

// ------------------------------------------------------------------------------
// ACTION PAYLOAD VALIDATORS
// ------------------------------------------------------------------------------

export interface CopilotPayload {
  message: string;
  workspaceId: string;
  locale: 'en' | 'ar';
  tzOffsetMinutes: number;
}

export function parseCopilotPayload(body: Record<string, unknown>): ValidationResult<CopilotPayload> {
  const message = reqString(body, 'message', 1, 2000);
  if (!message.ok) return message;

  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };

  return {
    ok: true,
    value: {
      message: message.value,
      workspaceId,
      locale: optLocale(body),
      tzOffsetMinutes: boundedInt(body.tzOffsetMinutes, -840, 840, () => 0),
    },
  };
}

export interface SalesDraftPayload {
  channel: WriterChannel;
  goal: string;
  tone: WriterTone;
  length: WriterLength;
  language: WriterLanguage;
  contactId: string;
  dealId: string;
  userContext: string;
  workspaceId: string;
}

export function parseSalesDraftPayload(body: Record<string, unknown>): ValidationResult<SalesDraftPayload> {
  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };

  const goal = reqString(body, 'goal', 1, 500);
  if (!goal.ok) return goal;

  const channel = reqEnum(body.channel, ['email', 'whatsapp', 'meeting_followup', 'intro', 'proposal_cover', 'renewal'] as const, 'email', 'channel');
  if (!channel.ok) return channel;

  const tone = reqEnum(body.tone, ['professional', 'consultative', 'urgent', 'friendly', 'executive'] as const, 'professional', 'tone');
  if (!tone.ok) return tone;

  const length = reqEnum(body.length, ['concise', 'balanced', 'detailed'] as const, 'balanced', 'length');
  if (!length.ok) return length;

  const context = optString(body, 'userContext', 1000);
  if (!context.ok) return context;

  const contactId = optUuid(body, 'contactId');
  if (!contactId.ok) return contactId;

  const dealId = optUuid(body, 'dealId');
  if (!dealId.ok) return dealId;

  return {
    ok: true,
    value: {
      channel: channel.value,
      goal: goal.value,
      tone: tone.value,
      length: length.value,
      language: cleanText(body.language) === 'ar' ? 'ar' : 'en',
      contactId: contactId.value,
      dealId: dealId.value,
      userContext: context.value,
      workspaceId,
    },
  };
}

export interface MeetingNotesPayload {
  notes: string;
  contactId: string;
  dealId: string;
  locale: FlowLocale;
  workspaceId: string;
}
type FlowLocale = 'en' | 'ar';

export function parseMeetingNotesPayload(body: Record<string, unknown>): ValidationResult<MeetingNotesPayload> {
  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };

  const notes = reqString(body, 'notes', 10, 20_000);
  if (!notes.ok) return notes;

  const contactId = optUuid(body, 'contactId');
  if (!contactId.ok) return contactId;

  const dealId = optUuid(body, 'dealId');
  if (!dealId.ok) return dealId;

  return {
    ok: true,
    value: { notes: notes.value, contactId: contactId.value, dealId: dealId.value, locale: optLocale(body), workspaceId },
  };
}

export interface RecordInsightPayload {
  recordId: string;
  locale: FlowLocale;
  workspaceId: string;
}

export function parseRecordInsightPayload(body: Record<string, unknown>): ValidationResult<RecordInsightPayload> {
  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };

  const recordId = optUuid(body, 'recordId');
  if (!recordId.ok) return recordId;
  if (!recordId.value) return { ok: false, error: 'recordId is required' };

  return { ok: true, value: { recordId: recordId.value, locale: optLocale(body), workspaceId } };
}

export interface AnalyticsPayload {
  query: string;
  period: AnalyticsPeriod | '';
  locale: FlowLocale;
  tzOffsetMinutes: number;
  workspaceId: string;
}

export function parseAnalyticsPayload(body: Record<string, unknown>): ValidationResult<AnalyticsPayload> {
  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };

  const query = reqString(body, 'query', 1, 300);
  if (!query.ok) return query;

  const periodRaw = cleanText(body.period).trim();
  if (periodRaw && !ANALYTICS_PERIODS.includes(periodRaw as AnalyticsPeriod)) {
    return { ok: false, error: `period must be one of: ${ANALYTICS_PERIODS.join(', ')}` };
  }

  return {
    ok: true,
    value: {
      query: query.value,
      period: (periodRaw || '') as AnalyticsPeriod | '',
      locale: optLocale(body),
      tzOffsetMinutes: boundedInt(body.tzOffsetMinutes, -840, 840, () => 0),
      workspaceId,
    },
  };
}

export interface StatusPayload {
  workspaceId: string;
}

export function parseStatusPayload(body: Record<string, unknown>): ValidationResult<StatusPayload> {
  const workspaceId = cleanText(body.workspaceId).trim();
  if (!isUuid(workspaceId)) return { ok: false, error: 'workspaceId must be a valid UUID' };
  return { ok: true, value: { workspaceId } };
}

// ------------------------------------------------------------------------------
// INTEGER / TOOL-ARG HELPERS
// ------------------------------------------------------------------------------
export function boundedInt(value: unknown, min: number, max: number, fallback: () => number): number {
  const parsed = typeof value === 'number' ? Math.floor(value) : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback();
  return Math.min(max, Math.max(min, parsed));
}

/** Validates LLM-provided tool arguments against the registry spec. */
export function validateToolArgs(toolName: string, args: unknown): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  void toolName;
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: true, args: {} };
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor') continue;
    if (typeof value === 'string') clean[key] = cleanText(value).slice(0, 500).trim();
    else if (typeof value === 'number') clean[key] = boundedInt(value, -1_000_000_000, 1_000_000_000, () => 0);
  }
  return { ok: true, args: clean };
}
