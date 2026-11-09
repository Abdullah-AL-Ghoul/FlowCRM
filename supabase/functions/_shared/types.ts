// ==============================================================================
// FlowAI Shared Types (cross-runtime: Vite client + Supabase Edge Function)
// Pure type/constant module — no runtime dependencies. Importable from both
// `src/` (client) and `supabase/functions/` (Deno edge).
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. EVIDENCE & CITATIONS
// ------------------------------------------------------------------------------
export type EvidenceType = 'contact' | 'deal' | 'task' | 'activity' | 'metric';

export interface GroundedEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  subtitle?: string;
  route: string;
  snippet?: string;
}

// ------------------------------------------------------------------------------
// 2. TOOLS (registered, validated, read-only)
// ------------------------------------------------------------------------------
export type ToolName =
  | 'search_contacts'
  | 'get_contact_summary'
  | 'get_deal_summary'
  | 'get_open_tasks'
  | 'get_overdue_tasks'
  | 'get_sales_metrics'
  | 'get_pipeline_breakdown'
  | 'get_activity_timeline'
  | 'get_won_deals_period'
  | 'get_overdue_tasks_by_assignee'
  | 'compare_pipeline_periods'
  | 'get_contact_sources'
  | 'get_inactive_contacts'
  | 'get_deals_needing_attention';

export interface ToolSchemaSpec {
  /** Human-readable description of when to use this tool (for the LLM registry prompt). */
  description: string;
  /** Optional argument specification used for LLM-driven tool selection. */
  args?: Array<{
    name: string;
    type: 'string' | 'number';
    required?: boolean;
    description: string;
  }>;
}

/**
 * The single authoritative registry of read-only tools, shared by the
 * deterministic router, the LLM tool-selection prompt and both runtimes.
 */
export const TOOL_REGISTRY: Record<ToolName, ToolSchemaSpec> = {
  search_contacts: {
    description:
      'Search authorized contacts by name, email or company keyword. Use for "find/show contact X" or contact summaries.',
    args: [{ name: 'query', type: 'string', required: true, description: 'Search term' }],
  },
  get_contact_summary: {
    description:
      'Complete summarized profile of ONE contact (deals, pending tasks, recent activity counts). Requires a contact id from a prior search_contacts result.',
    args: [{ name: 'contactId', type: 'string', required: true, description: 'Contact UUID' }],
  },
  get_deal_summary: {
    description:
      'Complete summarized view of ONE opportunity (value, stage, close date, contact, pending tasks). Requires a deal id.',
    args: [{ name: 'dealId', type: 'string', required: true, description: 'Deal UUID' }],
  },
  get_open_tasks: {
    description: 'Pending (not completed) tasks ordered by due date. Use for task prioritization questions.',
    args: [{ name: 'limit', type: 'number', required: false, description: 'Max tasks (default 10)' }],
  },
  get_overdue_tasks: {
    description: 'Overdue, unfinished tasks requiring immediate attention.',
    args: [{ name: 'limit', type: 'number', required: false, description: 'Max tasks (default 10)' }],
  },
  get_sales_metrics: {
    description:
      'Authoritative workspace KPIs: total contacts, active deals, open pipeline value, won count/value, win rate, tasks due today / overdue.',
  },
  get_pipeline_breakdown: {
    description: 'Deal counts and total value per pipeline stage. Use for pipeline explanation questions.',
  },
  get_activity_timeline: {
    description: 'Recent workspace activity events; optionally filtered to a contact or deal.',
    args: [
      { name: 'limit', type: 'number', required: false, description: 'Max events (default 10)' },
      { name: 'contactId', type: 'string', required: false, description: 'Filter by contact UUID' },
      { name: 'dealId', type: 'string', required: false, description: 'Filter by deal UUID' },
    ],
  },
  get_won_deals_period: {
    description:
      'Deals marked won within a date period (uses the deal last-update window). Use for "won deals this/last month".',
    args: [
      { name: 'period', type: 'string', required: false, description: 'this_month | last_month | this_quarter | all_time' },
    ],
  },
  get_overdue_tasks_by_assignee: {
    description: 'Overdue unfinished tasks grouped per assigned person. Use for "overdue by owner" questions.',
  },
  compare_pipeline_periods: {
    description:
      'Compares open pipeline (count + value, of deals created within each window) between two periods.',
    args: [
      { name: 'periodA', type: 'string', required: false, description: 'this_month | last_month | this_quarter | all_time' },
      { name: 'periodB', type: 'string', required: false, description: 'same enum as periodA' },
    ],
  },
  get_contact_sources: {
    description: 'Distribution of contacts by acquisition source. Use for lead-source questions.',
  },
  get_inactive_contacts: {
    description:
      'Finds contacts with no recorded interactions (calls, emails, meetings, notes) within a specified number of days (default 30). Use for "inactive contacts" or "contacts needing attention".',
    args: [
      { name: 'days', type: 'number', required: false, description: 'Inactivity threshold in days (default 30)' },
      { name: 'limit', type: 'number', required: false, description: 'Max contacts (default 10)' },
    ],
  },
  get_deals_needing_attention: {
    description:
      'Finds open deals that need urgent attention (past expected close date, stalled with no recent activities, or with overdue tasks).',
    args: [
      { name: 'limit', type: 'number', required: false, description: 'Max deals (default 10)' },
    ],
  },
};

// ------------------------------------------------------------------------------
// 3. SHARED ROW SHAPES (structural superset of client & PostgREST rows)
// ------------------------------------------------------------------------------
export interface MinimalProfileRef {
  id?: string;
  full_name?: string | null;
}

export interface SharedContactRow {
  id: string;
  workspace_id?: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  status?: string;
  lead_source?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  assignee?: MinimalProfileRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface SharedDealRow {
  id: string;
  workspace_id?: string;
  contact_id?: string | null;
  title: string;
  /** PostgREST returns NUMERIC as string; the client domain model keeps number|string. */
  value: number | string;
  currency?: string;
  stage?: string;
  expected_close_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  assignee?: MinimalProfileRef | null;
  contact?: { id: string; full_name: string; company?: string | null } | null;
  created_at?: string;
  updated_at?: string;
}

export interface SharedTaskRow {
  id: string;
  workspace_id?: string;
  title: string;
  description?: string | null;
  due_date: string;
  priority?: string;
  status?: string;
  assigned_to?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  contact?: { id: string; full_name: string } | null;
  deal?: { id: string; title: string } | null;
  assignee?: MinimalProfileRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface SharedActivityRow {
  id: string;
  workspace_id?: string;
  type?: string;
  description: string;
  contact_id?: string | null;
  deal_id?: string | null;
  user_id?: string | null;
  occurred_at?: string;
  created_at?: string;
  user?: MinimalProfileRef | null;
  contact?: { id: string; full_name: string } | null;
  deal?: { id: string; title: string } | null;
}

export interface SharedWorkspaceMemberRow {
  workspace_id?: string;
  user_id: string;
  role?: string;
}

// ------------------------------------------------------------------------------
// 4. RESULT PAYLOADS RETURNED TO THE CLIENT
// (Shapes are consumed by the React feature components — keep stable.)
// ------------------------------------------------------------------------------
export interface TaskListResult {
  id: string;
  title: string;
  due_date: string;
  formattedDueDate: string;
  priority: string;
  contactName?: string | null;
  dealTitle?: string | null;
  assignee?: string | null;
}

export interface MetricsResult {
  totalContacts: number;
  activeDealsCount: number;
  openPipelineValue: number;
  formattedOpenPipelineValue: string;
  wonDealsCount: number;
  wonDealsValue: number;
  formattedWonDealsValue: string;
  winRate: number;
  tasksDueToday: number;
  tasksOverdue: number;
}

export interface PipelineRowResult {
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  count: number;
  totalValue: number;
  formattedValue: string;
}

export interface ActivityRowResult {
  id: string;
  type: string;
  description: string;
  occurred_at: string;
  formattedDate: string;
  userName: string;
}

export interface ContactSummaryResult {
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    job_title: string | null;
    status: string;
    lead_source: string | null;
    notes: string | null;
    assignee: string | null;
  };
  dealsCount: number;
  deals: Array<{
    id: string;
    title: string;
    value: string;
    stage: string;
    expected_close_date: string | null;
  }>;
  tasksCount: number;
  pendingTasks: Array<{ id: string; title: string; due_date: string; priority: string }>;
  recentActivitiesCount: number;
}

export interface DealSummaryResult {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  currency: string;
  stage: string;
  expected_close_date: string | null;
  contact: { id: string; name: string; company: string | null } | null;
  assignee: string;
  notes: string | null;
  pendingTasksCount: number;
}

export interface WonDealsPeriodResult {
  /** Resolved period key (mirrors AnalyticsPeriod). */
  period: AnalyticsPeriod;
  periodStart: string | null;
  periodEnd: string | null;
  metricDefinition: string;
  count: number;
  totalValue: number;
  formattedTotalValue: string;
  deals: Array<{ id: string; title: string; value: string; stage: string; closedWindow: string }>;
}

export interface OverdueByAssigneeResult {
  rows: Array<{ assignee: string; count: number; taskTitles: string[] }>;
  totalOverdue: number;
}

export interface PeriodComparisonResult {
  metricDefinition: string;
  periodA: { label: string; start: string | null; end: string | null; count: number; value: number; formattedValue: string };
  periodB: { label: string; start: string | null; end: string | null; count: number; value: number; formattedValue: string };
  deltaValue: number;
  deltaCount: number;
}

export interface ContactSourcesResult {
  chartData: Array<{ name: string; value: number }>;
  totalContacts: number;
}

export interface ToolExecutionPayload {
  toolName: ToolName;
  /** Tool-specific shaped result (see interfaces above). */
  data: unknown;
  evidence: GroundedEvidence[];
  explanation: string;
}

// ------------------------------------------------------------------------------
// 5. SALES WRITER
// ------------------------------------------------------------------------------
export type WriterChannel =
  | 'email'
  | 'whatsapp'
  | 'meeting_followup'
  | 'intro'
  | 'proposal_cover'
  | 'renewal';
export type WriterTone = 'professional' | 'consultative' | 'urgent' | 'friendly' | 'executive';
export type WriterLength = 'concise' | 'balanced' | 'detailed';
export type WriterLanguage = 'en' | 'ar';

export interface SharedWriterContactRef {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  company?: string | null;
  job_title?: string | null;
  notes?: string | null;
}

export interface SharedWriterDealRef {
  id?: string;
  title?: string | null;
  value?: number | string | null;
  currency?: string | null;
  stage?: string | null;
}

export interface SalesWriterRequestCore {
  channel: WriterChannel;
  goal: string;
  tone: WriterTone;
  length: WriterLength;
  language: WriterLanguage;
  contact?: SharedWriterContactRef | null;
  deal?: SharedWriterDealRef | null;
  userContext?: string;
}

export interface SalesWriterResponseCore {
  subject?: string;
  body: string;
  detectedMissingFields: string[];
  suggestedNextStep?: string;
  evidence: GroundedEvidence[];
  /** 'llm' when drafted by the provider, 'rules' for the offline template fallback. */
  engineUsed?: 'llm' | 'rules';
  /** Set when the response was produced without the provider (unconfigured or upstream failure). */
  unavailableReason?: string;
}

// ------------------------------------------------------------------------------
// 6. MEETING INTELLIGENCE
// ------------------------------------------------------------------------------
export interface ProposedTaskCore {
  title: string;
  description?: string;
  /** ISO date (YYYY-MM-DD) — only when explicit in the source notes or confirmed by the user. */
  suggestedDueDate?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAssigneeId?: string | null;
  suggestedAssigneeName?: string | null;
}

export interface MeetingIntelligenceResultCore {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  explicitDecisions: string[];
  openQuestions: string[];
  potentialRisks: string[];
  proposedTasks: ProposedTaskCore[];
  unsupportedClaims: string[];
  /** Set when extraction is impossible without a configured provider (honest refusal). */
  unavailableReason?: string;
}

// ------------------------------------------------------------------------------
// 7. DEAL & CONTACT INTELLIGENCE
// ------------------------------------------------------------------------------
export type RiskLevel = 'low' | 'medium' | 'high';

export interface DealRiskSignal {
  level: RiskLevel;
  signal: string;
  explanation: string;
  isRuleBased: true;
}

export interface DealIntelligenceResultCore {
  dealSummary: string;
  riskSignals: DealRiskSignal[];
  missingInformation: string[];
  recommendedNextAction: string;
  coachingQuestions: string[];
  suggestedDraftPrompt?: string;
  evidence: GroundedEvidence[];
}

export interface ContactIntelligenceResultCore {
  summary: string;
  communicationPattern: string;
  missingInformation: string[];
  suggestedQuestions: string[];
  recommendedNextSteps: string[];
  evidence: GroundedEvidence[];
}

// ------------------------------------------------------------------------------
// 8. NATURAL-LANGUAGE ANALYTICS
// ------------------------------------------------------------------------------
export type AnalyticsQueryType =
  | 'won_deals_period'
  | 'pipeline_stage_counts'
  | 'overdue_tasks_summary'
  | 'contact_sources'
  | 'win_rate_summary'
  | 'general_kpi'
  | 'pipeline_period_comparison'
  | 'overdue_by_assignee';

export type AnalyticsPeriod = 'this_month' | 'last_month' | 'this_quarter' | 'all_time';

export const ANALYTICS_PERIODS: AnalyticsPeriod[] = [
  'this_month',
  'last_month',
  'this_quarter',
  'all_time',
];

export interface NLAnalyticsResultCore {
  query: string;
  matchedType: AnalyticsQueryType;
  answerExplanation: string;
  kpiHighlight?: {
    label: string;
    value: string | number;
    subtext?: string;
  };
  chartData?: Array<{ name: string; value: number; amount?: number }>;
  chartType?: 'bar' | 'pie' | 'metric';
  periodDescription: string;
  appliedFilters: string[];
  metricDefinition?: string;
  recordLinks: GroundedEvidence[];
}

// ------------------------------------------------------------------------------
// 9. EDGE PROTOCOL (request/response envelope)
// ------------------------------------------------------------------------------
export type FlowAILocale = 'en' | 'ar';
export type FlowAIEngine = 'gemini' | 'openai' | 'anthropic' | 'rules';

export interface FlowAIResponseMeta {
  engine: FlowAIEngine;
  /** Version identifier of the shared prompt templates used to produce the answer. */
  promptVersion: string;
  tool?: ToolName;
  /** True when the provider credentials are missing on the server. */
  unconfigured?: boolean;
}

export interface FlowAIRateLimitInfo {
  requestsThisHour: number;
  tokensThisMonth: number;
  hourlyRequestLimit: number;
  monthlyTokenLimit: number;
}

export type FlowAIEnvelope<T> =
  | { ok: true; data: T; meta: FlowAIResponseMeta }
  | {
      ok: false;
      error: {
        code:
          | 'unauthorized'
          | 'forbidden'
          | 'bad_request'
          | 'rate_limited'
          | 'payload_too_large'
          | 'not_configured'
          | 'upstream_error'
          | 'internal';
        message: string;
      };
      meta?: Partial<FlowAIResponseMeta>;
    };

export interface CopilotReplyData {
  reply: string;
  evidence: GroundedEvidence[];
  toolUsed?: ToolName;
  /** Honest engine disclosure for labeling in the UI. */
  rateLimit?: FlowAIRateLimitInfo;
}

export interface GatewayStatusData {
  provider?: 'gemini' | 'openai' | 'anthropic';
  model?: string;
  configured: boolean;
  engine: FlowAIEngine;
}

// ------------------------------------------------------------------------------
// 10. CONTRACT & DOCUMENT INTELLIGENCE
// ------------------------------------------------------------------------------
export interface ContractRiskClause {
  category: 'liability' | 'termination' | 'indemnity' | 'confidentiality' | 'auto_renewal' | 'payment' | 'other';
  clauseSnippet: string;
  riskLevel: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface ContractAnalysisResult {
  title: string;
  contractType: string;
  parties: { partyA: string; partyB: string };
  effectiveDate: string | null;
  expirationDate: string | null;
  financialTerms: {
    totalValue: number | null;
    currency: string;
    formattedValue?: string;
    paymentSchedule: string;
  };
  keyObligations: string[];
  riskClauses: ContractRiskClause[];
  executiveSummary: string;
  recommendedActions: string[];
  isAiGenerated: boolean;
  untrustedBoundaryEnforced: boolean;
  unavailableReason?: string;
}
