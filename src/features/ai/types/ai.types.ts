// ==============================================================================
// FlowAI client-facing types.
// Domain result shapes are re-exported from the shared cross-runtime module
// (supabase/functions/_shared/types.ts) so the client and the edge function
// can never drift apart. Client-only UI types live at the bottom.
// ==============================================================================

import { z } from 'zod';
import {
  ProposedTaskCore,
} from '../../../../supabase/functions/_shared/types';

// ---- Shared cross-runtime shapes (authoritative) ----
export type {
  AnalyticsPeriod,
  AnalyticsQueryType,
  ContactSourcesResult,
  DealRiskSignal,
  DealSummaryResult,
  EvidenceType,
  FlowAIEngine,
  FlowAILocale,
  GroundedEvidence,
  OverdueByAssigneeResult,
  PipelineRowResult,
  RiskLevel,
  SalesWriterResponseCore,
  TaskListResult,
  ToolName,
  WonDealsPeriodResult,
  WriterChannel,
  WriterTone,
  WriterLength,
  WriterLanguage,
} from '../../../../supabase/functions/_shared/types';

export { ANALYTICS_PERIODS } from '../../../../supabase/functions/_shared/types';

import type {
  ContactIntelligenceResultCore,
  DealIntelligenceResultCore,
  MeetingIntelligenceResultCore,
  NLAnalyticsResultCore,
  SalesWriterResponseCore,
  WriterChannel,
  WriterTone,
  WriterLength,
  WriterLanguage,
  GroundedEvidence,
  ContractAnalysisResult,
  ContractRiskClause,
} from '../../../../supabase/functions/_shared/types';

export type { ContractAnalysisResult, ContractRiskClause };

// ---- Compatibility aliases (component-facing names) ----
export type ContactIntelligenceResult = ContactIntelligenceResultCore;
export type DealIntelligenceResult = DealIntelligenceResultCore;
export type MeetingIntelligenceResult = MeetingIntelligenceResultCore;
export type NLAnalyticsResult = NLAnalyticsResultCore;

export interface SalesWriterRequest {
  channel: WriterChannel;
  goal: string;
  tone: WriterTone;
  length: WriterLength;
  language: WriterLanguage;
  contact?: import('../../../types/crm.types').Contact | null;
  deal?: import('../../../types/crm.types').Deal | null;
  userContext?: string;
}

export type SalesWriterResponse = SalesWriterResponseCore;

// Client UI task proposal includes selection state + stable id.
export interface ProposedTask extends ProposedTaskCore {
  id: string;
  selected: boolean;
}

// ------------------------------------------------------------------------------
// CLIENT-ONLY: copilot chat types
// ------------------------------------------------------------------------------
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  evidence?: GroundedEvidence[];
  isAiGenerated?: boolean;
  isStreaming?: boolean;
  engine?: 'gemini' | 'openai' | 'anthropic' | 'rules';
}

// ------------------------------------------------------------------------------
// CLIENT-ONLY: tool argument schemas (mirror the shared registry; zod lives on
// the client for local demo validation; the edge function uses dependency-free
// validators internally).
// ------------------------------------------------------------------------------
export const SearchContactsSchema = z.object({
  query: z.string().describe('Search term for contact name, email, or company'),
  limit: z.number().optional().default(5),
});

export const GetContactSummarySchema = z.object({
  contactId: z.string().describe('UUID of the contact to summarize'),
});

export const GetDealSummarySchema = z.object({
  dealId: z.string().describe('UUID of the deal to inspect'),
});

export const GetTasksSchema = z.object({
  limit: z.number().optional().default(10),
});

export const GetSalesMetricsSchema = z.object({
  period: z.enum(['current_month', 'all_time']).optional().default('current_month'),
});

export const GetPipelineBreakdownSchema = z.object({});

export const GetActivityTimelineSchema = z.object({
  limit: z.number().optional().default(10),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

// ------------------------------------------------------------------------------
// CLIENT-ONLY: usage + lead scoring + data quality
// ------------------------------------------------------------------------------
export interface AIWorkspaceUsage {
  workspaceId: string;
  tokensUsedThisMonth: number;
  maxMonthlyTokens: number;
  requestsThisHour: number;
  maxHourlyRequests: number;
  lastRequestTimestamp: number;
  estimatedCostUsd: number;
}

export interface GatewayUsageSnapshot {
  requestsThisHour: number;
  tokensThisMonth: number;
  hourlyRequestLimit: number;
  monthlyTokenLimit: number;
}

export interface LeadScoreBreakdown {
  contactId: string;
  totalScore: number;
  tier: 'hot' | 'warm' | 'cold';
  factors: Array<{
    factor: string;
    points: number;
    maxPoints: number;
    reason: string;
  }>;
  isRuleBased: true;
}

export interface DataQualityIssue {
  id: string;
  type: 'duplicate_contact' | 'missing_email_phone' | 'stagnant_deal' | 'overdue_without_task';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedRecords: GroundedEvidence[];
  suggestedAction: string;
}
