// ==============================================================================
// FlowAI Client Service — thin transport + demo/offline engine.
//
// Connected mode  : every AI action is executed SERVER-SIDE by the
//                   `flowai-assistant` edge function (RLS-scoped tools, server
//                   provider secrets, server rate limits). The browser never
//                   holds provider credentials.
// Demo/offline    : identical shared engines run locally against crmService
//                   synthetic data with provider = null (rule-based, honest).
//
// Public API is component-shaped; result shapes come from the shared modules
// so both runtimes stay in lockstep.
// ==============================================================================

import { Contact, Deal } from '../../../types/crm.types';
import { crmService } from '../../../services/crmService';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { callFlowAIAction, callFlowAIStream, fetchGatewayUsage, fetchGatewayStatus } from '../../../services/edgeGateway';
import { GroundedEvidence, ToolName } from '../../../../supabase/functions/_shared/types';
import { deterministicRouter, buildDeterministicReply } from '../../../../supabase/functions/_shared/copilotEngine';
import { buildDealIntelligence, buildContactIntelligence } from '../../../../supabase/functions/_shared/intelligenceEngine';
import { runMeetingIntelligence } from '../../../../supabase/functions/_shared/meetingEngine';
import { runContractAnalysis } from '../../../../supabase/functions/_shared/contractEngine';
import { buildAnalyticsAnswer } from '../../../../supabase/functions/_shared/analyticsEngine';
import { buildRuleBasedDraft } from '../../../../supabase/functions/_shared/writerRules';
import { formatCurrency } from '../../../lib/utils';
import { createToolContext, buildLocalGateway } from './localGateway';
import { executeSharedTool } from '../../../../supabase/functions/_shared/crmTools';
import {
  AIWorkspaceUsage,
  ContactIntelligenceResult,
  DealIntelligenceResult,
  MeetingIntelligenceResult,
  ProposedTask,
  SalesWriterRequest,
  SalesWriterResponse,
  NLAnalyticsResult,
  ContractAnalysisResult,
} from '../types/ai.types';

type FlowLocale = 'en' | 'ar';

export interface FlowAIEngineInfo {
  engine: 'gemini' | 'openai' | 'anthropic' | 'rules';
  unconfigured?: boolean;
  tool?: ToolName;
}

/** True when the user session is backed by the real Supabase project. */
function isLiveSession(): boolean {
  return isSupabaseConfigured && !crmService.getIsDemoMode();
}

function hasUuidShape(value: string | undefined | null): boolean {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function localContext(workspaceId: string, locale: FlowLocale, createdDate: Date = new Date()) {
  return createToolContext(workspaceId, locale, createdDate);
}

// ------------------------------------------------------------------------------
// COPILOT
// ------------------------------------------------------------------------------
export interface CopilotAnswer {
  reply: string;
  evidence: GroundedEvidence[];
  toolUsed?: ToolName;
  engine: 'gemini' | 'openai' | 'anthropic' | 'rules';
  demoOffline?: boolean;
}

export interface CopilotStreamCallbacks {
  onChunk: (text: string) => void;
  onInit?: (init: { toolUsed?: ToolName; evidence: GroundedEvidence[]; engine: string }) => void;
}

export async function askCopilotStream(
  params: {
    message: string;
    workspaceId: string;
    locale: FlowLocale;
    signal?: AbortSignal;
  },
  callbacks: CopilotStreamCallbacks
): Promise<CopilotAnswer> {
  if (isLiveSession() && hasUuidShape(params.workspaceId)) {
    const result = await callFlowAIStream(
      'copilot-stream',
      {
        message: params.message,
        workspaceId: params.workspaceId,
        locale: params.locale,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      },
      callbacks.onChunk,
      init => {
        callbacks.onInit?.({
          toolUsed: init.toolUsed as ToolName,
          evidence: init.evidence || [],
          engine: init.engine || 'rules',
        });
      },
      { signal: params.signal }
    );

    return {
      reply: result.fullText,
      evidence: result.evidence,
      toolUsed: result.toolUsed as ToolName,
      engine: (result.engine as 'gemini' | 'openai' | 'anthropic' | 'rules') || 'rules',
    };
  }

  // Demo / offline mode: run deterministic engine, send onInit, and stream word-by-word
  const ctx = localContext(params.workspaceId, params.locale);
  const routed = deterministicRouter(params.message, params.locale);
  const toolResult = await executeSharedTool(routed.tool, routed.args, ctx);
  const fullReply = buildDeterministicReply(params.message, toolResult, params.locale);
  recordLocalDemoUsage(params.workspaceId);

  callbacks.onInit?.({
    toolUsed: toolResult.toolName,
    evidence: toolResult.evidence,
    engine: 'rules',
  });

  // Smooth progressive word streaming for offline/demo UX
  const words = fullReply.split(/(\s+)/);
  for (const word of words) {
    if (params.signal?.aborted) break;
    callbacks.onChunk(word);
    await new Promise(r => setTimeout(r, 12));
  }

  return {
    reply: fullReply,
    evidence: toolResult.evidence,
    toolUsed: toolResult.toolName,
    engine: 'rules',
    demoOffline: true,
  };
}

export async function askCopilot(params: {
  message: string;
  workspaceId: string;
  locale: FlowLocale;
  signal?: AbortSignal;
}): Promise<CopilotAnswer> {
  if (isLiveSession() && hasUuidShape(params.workspaceId)) {
    const result = await callFlowAIAction<{
      reply: string;
      evidence: GroundedEvidence[];
      toolUsed?: ToolName;
      engineUsed: 'llm' | 'rules';
    }>('copilot', {
      message: params.message,
      workspaceId: params.workspaceId,
      locale: params.locale,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    }, { signal: params.signal });

    return {
      reply: result.data.reply,
      evidence: result.data.evidence ?? [],
      toolUsed: result.data.toolUsed,
      engine: result.meta.unconfigured ? 'rules' : result.meta.engine,
    };
  }

  // Demo/offline: deterministic grounded engine on local data.
  const ctx = localContext(params.workspaceId, params.locale);
  const routed = deterministicRouter(params.message, params.locale);
  const toolResult = await executeSharedTool(routed.tool, routed.args, ctx);
  const reply = buildDeterministicReply(params.message, toolResult, params.locale);
  recordLocalDemoUsage(params.workspaceId);

  return {
    reply,
    evidence: toolResult.evidence,
    toolUsed: toolResult.toolName,
    engine: 'rules',
    demoOffline: true,
  };
}

// ------------------------------------------------------------------------------
// SALES WRITER
// ------------------------------------------------------------------------------
export async function generateSalesDraft(
  request: SalesWriterRequest,
  workspaceId: string
): Promise<SalesWriterResponse> {
  const locale = request.language;
  const evidence: GroundedEvidence[] = [];
  if (request.contact) {
    evidence.push({
      id: request.contact.id,
      type: 'contact',
      title: request.contact.full_name,
      subtitle: request.contact.company || undefined,
      route: '/contacts',
    });
  }
  if (request.deal) {
    evidence.push({
      id: request.deal.id,
      type: 'deal',
      title: request.deal.title,
      subtitle: formatCurrency(request.deal.value, request.deal.currency, locale),
      route: '/deals',
    });
  }

  if (isLiveSession() && hasUuidShape(workspaceId)) {
    const result = await callFlowAIAction<SalesWriterResponse & { engineUsed: 'llm' | 'rules' }>('sales-draft', {
      workspaceId,
      channel: request.channel,
      goal: request.goal,
      tone: request.tone,
      length: request.length,
      language: request.language,
      contactId: request.contact?.id || '',
      dealId: request.deal?.id || '',
      userContext: request.userContext || '',
    });
    return result.data;
  }

  // Demo/offline: transparent template draft from verified fields only.
  recordLocalDemoUsage(workspaceId);
  return buildRuleBasedDraft(request, evidence);
}

// ------------------------------------------------------------------------------
// CONTACT INTELLIGENCE
// ------------------------------------------------------------------------------
export async function analyzeContact(
  contact: Contact,
  _workspaceId: string,
  locale: FlowLocale = 'en'
): Promise<ContactIntelligenceResult & { engineUsed?: 'llm' | 'rules' }> {
  const now = new Date();

  if (isLiveSession() && hasUuidShape(contact.id)) {
    const result = await callFlowAIAction<ContactIntelligenceResult & { engineUsed: 'llm' | 'rules' }>(
      'contact-insight',
      { workspaceId: contact.workspace_id, recordId: contact.id, locale }
    );
    return result.data;
  }

  // Local rule-based intelligence (framework-labeled UI).
  const gateway = buildLocalGateway();
  const [dealsAll, tasksAll, activitiesAll] = await Promise.all([gateway.deals(), gateway.tasks(), gateway.activities()]);
  const relatedDeals = dealsAll.filter(d => d.contact_id === contact.id);
  const relatedActivities = activitiesAll.filter(a => a.contact_id === contact.id);
  const relatedTasks = tasksAll.filter(t => t.contact_id === contact.id);

  const result = await buildContactIntelligence({
    contact: contact as never,
    relatedDeals,
    relatedActivities,
    relatedTasks,
    locale,
    now,
    provider: null,
  });
  recordLocalDemoUsage(contact.workspace_id);
  return result;
}

// ------------------------------------------------------------------------------
// DEAL INTELLIGENCE
// ------------------------------------------------------------------------------
export async function analyzeDeal(
  deal: Deal,
  _workspaceId: string,
  locale: FlowLocale = 'en'
): Promise<DealIntelligenceResult & { engineUsed?: 'llm' | 'rules' }> {
  const now = new Date();

  if (isLiveSession() && hasUuidShape(deal.id)) {
    const result = await callFlowAIAction<DealIntelligenceResult & { engineUsed: 'llm' | 'rules' }>(
      'deal-insight',
      { workspaceId: deal.workspace_id, recordId: deal.id, locale, tzOffsetMinutes: new Date().getTimezoneOffset() }
    );
    return result.data;
  }

  const gateway = buildLocalGateway();
  const [tasksAll, activitiesAll] = await Promise.all([gateway.tasks(), gateway.activities()]);
  const relatedTasks = tasksAll.filter(t => t.deal_id === deal.id);
  const relatedActivities = activitiesAll.filter(a => a.deal_id === deal.id);
  const contact = deal.contact ?? null;

  const result = await buildDealIntelligence({
    deal: deal as never,
    relatedTasks,
    relatedActivities,
    contact: (contact as never) ?? null,
    locale,
    now,
    tzOffsetMinutes: new Date().getTimezoneOffset(),
    provider: null,
  });
  recordLocalDemoUsage(deal.workspace_id);
  return result;
}

// ------------------------------------------------------------------------------
// MEETING INTELLIGENCE
// ------------------------------------------------------------------------------
export async function analyzeMeetingNotes(
  notes: string,
  workspaceId: string,
  locale: FlowLocale = 'en',
  refs?: { contactId?: string | null; dealId?: string | null }
): Promise<MeetingIntelligenceResult & { proposedTasks: ProposedTask[] }> {
  const withTaskIds = (
    result: MeetingIntelligenceResult
  ): MeetingIntelligenceResult & { proposedTasks: ProposedTask[] } => ({
    ...result,
    proposedTasks: result.proposedTasks.map((t, i) => ({
      ...t,
      id: `task-${Date.now()}-${i}`,
      selected: true,
    })),
  });

  if (isLiveSession() && hasUuidShape(workspaceId)) {
    const result = await callFlowAIAction<MeetingIntelligenceResult>('meeting-notes', {
      workspaceId,
      notes,
      contactId: refs?.contactId || '',
      dealId: refs?.dealId || '',
      locale,
    });
    return withTaskIds(result.data);
  }

  const result = await runMeetingIntelligence({ notes, locale, provider: null });
  recordLocalDemoUsage(workspaceId);
  return withTaskIds(result);
}

// ------------------------------------------------------------------------------
// NATURAL-LANGUAGE ANALYTICS
// ------------------------------------------------------------------------------
export async function queryAnalytics(
  queryText: string,
  workspaceId: string,
  locale: FlowLocale = 'en',
  explicitPeriod: 'this_month' | 'last_month' | 'this_quarter' | 'all_time' | '' = ''
): Promise<NLAnalyticsResult> {
  if (isLiveSession() && hasUuidShape(workspaceId)) {
    const result = await callFlowAIAction<NLAnalyticsResult>('analytics', {
      workspaceId,
      query: queryText,
      period: explicitPeriod,
      locale,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });
    return result.data;
  }

  const result = await buildAnalyticsAnswer({
    query: queryText,
    explicitPeriod,
    locale,
    ctx: localContext(workspaceId, locale),
    provider: null,
  });
  recordLocalDemoUsage(workspaceId);
  return result;
}

// ------------------------------------------------------------------------------
// USAGE / QUOTA (server-authoritative in connected mode)
// ------------------------------------------------------------------------------
export async function getUsage(workspaceId: string): Promise<AIWorkspaceUsage> {
  const nowRow = {
    workspaceId,
    tokensUsedThisMonth: 0,
    maxMonthlyTokens: 200000,
    requestsThisHour: 0,
    maxHourlyRequests: 60,
    lastRequestTimestamp: Date.now(),
    estimatedCostUsd: 0,
  };

  if (isLiveSession() && hasUuidShape(workspaceId)) {
    try {
      const usage = await fetchGatewayUsage(workspaceId);
      return {
        ...nowRow,
        requestsThisHour: usage.requestsThisHour,
        tokensUsedThisMonth: usage.tokensThisMonth,
        maxMonthlyTokens: usage.monthlyTokenLimit,
        maxHourlyRequests: usage.hourlyRequestLimit,
      };
    } catch {
      return nowRow;
    }
  }

  // Demo mode: local localStorage counters (informational only).
  try {
    const raw = localStorage.getItem(`flowcrm_ai_usage_v1_${workspaceId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AIWorkspaceUsage;
      if (Date.now() - parsed.lastRequestTimestamp > 3_600_000) parsed.requestsThisHour = 0;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return nowRow;
}

export function recordLocalDemoUsage(workspaceId: string, tokens: number = 0): void {
  if (isLiveSession()) return;
  try {
    const current = JSON.parse(localStorage.getItem(`flowcrm_ai_usage_v1_${workspaceId}`) ?? 'null') as
      | (AIWorkspaceUsage & { monthlyStamp?: string })
      | null;
    const month = new Date().toISOString().slice(0, 7);
    const base = current ?? ({
      workspaceId,
      tokensUsedThisMonth: 0,
      maxMonthlyTokens: 200000,
      requestsThisHour: 0,
      maxHourlyRequests: 60,
      lastRequestTimestamp: Date.now(),
      estimatedCostUsd: 0,
    } as AIWorkspaceUsage);
    if (Date.now() - base.lastRequestTimestamp > 3_600_000) base.requestsThisHour = 0;
    const tokensThisMonth = current?.monthlyStamp === month ? current.tokensUsedThisMonth + tokens : tokens;
    const next: AIWorkspaceUsage & { monthlyStamp?: string } = {
      ...base,
      requestsThisHour: base.requestsThisHour + 1,
      tokensUsedThisMonth: tokensThisMonth,
      lastRequestTimestamp: Date.now(),
      monthlyStamp: month,
    };
    localStorage.setItem(`flowcrm_ai_usage_v1_${workspaceId}`, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function analyzeContract(
  documentText: string,
  workspaceId: string,
  locale: FlowLocale = 'en',
  refs?: { contactId?: string | null; dealId?: string | null }
): Promise<ContractAnalysisResult> {
  if (isLiveSession() && hasUuidShape(workspaceId)) {
    const result = await callFlowAIAction<ContractAnalysisResult>('contract-analysis', {
      workspaceId,
      documentText,
      locale,
      contactId: refs?.contactId || '',
      dealId: refs?.dealId || '',
    });
    return result.data;
  }

  // Local demo/offline analysis
  const gateway = buildLocalGateway();
  const [contacts, deals] = await Promise.all([gateway.contacts(), gateway.deals()]);
  const contact = refs?.contactId ? contacts.find(c => c.id === refs.contactId) : null;
  const deal = refs?.dealId ? deals.find(d => d.id === refs.dealId) : null;

  const result = await runContractAnalysis({
    documentText,
    locale,
    provider: null,
    refs: {
      contactName: contact?.full_name ?? null,
      dealTitle: deal?.title ?? null,
    },
  });
  recordLocalDemoUsage(workspaceId);
  return result;
}

export async function getGatewayStatus(workspaceId: string) {
  return fetchGatewayStatus(workspaceId);
}

export const flowAIService = {
  askCopilot,
  askCopilotStream,
  generateSalesDraft,
  analyzeContact,
  analyzeDeal,
  analyzeMeetingNotes,
  analyzeContract,
  queryAnalytics,
  getUsage,
  getGatewayStatus,
  recordLocalDemoUsage,
};
