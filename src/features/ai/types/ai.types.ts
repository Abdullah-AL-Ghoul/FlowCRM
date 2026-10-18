import { z } from 'zod';
import { Contact, Deal } from '../../../types/crm.types';

// ==============================================================================
// 1. AI PROVIDER & CONFIGURATION TYPES
// ==============================================================================
export type AIProviderId = 'gemini' | 'openai' | 'offline_rule_based';

export interface AIProviderConfig {
  providerId: AIProviderId;
  model: string;
  apiKey?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  isAvailable: boolean;
  statusMessage?: string;
}

export interface AIWorkspaceUsage {
  workspaceId: string;
  tokensUsedThisMonth: number;
  maxMonthlyTokens: number;
  requestsThisHour: number;
  maxHourlyRequests: number;
  lastRequestTimestamp: number;
  estimatedCostUsd: number;
}

// ==============================================================================
// 2. EVIDENCE & CITATIONS
// ==============================================================================
export type EvidenceType = 'contact' | 'deal' | 'task' | 'activity' | 'metric';

export interface GroundedEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  subtitle?: string;
  route: string;
  snippet?: string;
}

// ==============================================================================
// 3. FLOWAI COPILOT CHAT TYPES
// ==============================================================================
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  evidence?: GroundedEvidence[];
  isAiGenerated?: boolean;
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

// ==============================================================================
// 4. AUTHENTICATED READ-ONLY CRM TOOLS DEFINITION
// ==============================================================================
export type ToolName =
  | 'search_contacts'
  | 'get_contact_summary'
  | 'get_deal_summary'
  | 'get_open_tasks'
  | 'get_overdue_tasks'
  | 'get_sales_metrics'
  | 'get_pipeline_breakdown'
  | 'get_activity_timeline';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: z.ZodObject<any>;
}

// Zod Schemas for Tool Arguments
export const SearchContactsSchema = z.object({
  query: z.string().describe('Search term for contact name, email, or company'),
  limit: z.number().optional().default(5),
});

export const GetContactSummarySchema = z.object({
  contactId: z.string().describe('UUID or ID of the contact to summarize'),
});

export const GetDealSummarySchema = z.object({
  dealId: z.string().describe('UUID or ID of the deal to inspect'),
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

// ==============================================================================
// 5. SALES WRITER TYPES
// ==============================================================================
export type WriterChannel = 'email' | 'whatsapp' | 'meeting_followup' | 'intro' | 'proposal_cover' | 'renewal';
export type WriterTone = 'professional' | 'consultative' | 'urgent' | 'friendly' | 'executive';
export type WriterLength = 'concise' | 'balanced' | 'detailed';
export type WriterLanguage = 'en' | 'ar';

export interface SalesWriterRequest {
  channel: WriterChannel;
  goal: string;
  tone: WriterTone;
  length: WriterLength;
  language: WriterLanguage;
  contact?: Contact | null;
  deal?: Deal | null;
  userContext?: string;
}

export interface SalesWriterResponse {
  subject?: string;
  body: string;
  detectedMissingFields: string[];
  suggestedNextStep?: string;
  evidence: GroundedEvidence[];
}

// ==============================================================================
// 6. MEETING INTELLIGENCE TYPES
// ==============================================================================
export interface ProposedTask {
  id: string;
  title: string;
  description?: string;
  suggestedDueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAssigneeId?: string;
  suggestedAssigneeName?: string;
  selected: boolean;
}

export interface MeetingIntelligenceResult {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  explicitDecisions: string[];
  openQuestions: string[];
  potentialRisks: string[];
  proposedTasks: ProposedTask[];
  unsupportedClaims: string[];
}

// ==============================================================================
// 7. DEAL & CONTACT INTELLIGENCE TYPES
// ==============================================================================
export type RiskLevel = 'low' | 'medium' | 'high';

export interface DealRiskSignal {
  level: RiskLevel;
  signal: string;
  explanation: string;
  isRuleBased: true;
}

export interface DealIntelligenceResult {
  dealSummary: string;
  riskSignals: DealRiskSignal[];
  missingInformation: string[];
  recommendedNextAction: string;
  coachingQuestions: string[];
  suggestedDraftPrompt?: string;
  evidence: GroundedEvidence[];
}

export interface ContactIntelligenceResult {
  summary: string;
  communicationPattern: string;
  missingInformation: string[];
  suggestedQuestions: string[];
  recommendedNextSteps: string[];
  evidence: GroundedEvidence[];
}

// ==============================================================================
// 8. NATURAL-LANGUAGE ANALYTICS TYPES
// ==============================================================================
export type AnalyticsQueryType =
  | 'won_deals_period'
  | 'pipeline_stage_counts'
  | 'overdue_tasks_summary'
  | 'contact_sources'
  | 'win_rate_summary'
  | 'general_kpi';

export interface NLAnalyticsResult {
  query: string;
  matchedType: AnalyticsQueryType;
  answerExplanation: string;
  kpiHighlight?: {
    label: string;
    value: string | number;
    subtext?: string;
  };
  chartData?: Array<{ name: string; value: number; [key: string]: any }>;
  chartType?: 'bar' | 'pie' | 'metric';
  periodDescription: string;
  appliedFilters: string[];
  recordLinks: GroundedEvidence[];
}

// ==============================================================================
// 9. LEAD SCORING & DATA QUALITY TYPES
// ==============================================================================
export interface LeadScoreBreakdown {
  contactId: string;
  totalScore: number; // 0 - 100
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
