// ==============================================================================
// FlowAI Copilot Engine.
// 1. Tool selection: LLM-constrained (one registered tool + validated args)
//    with a deterministic keyword router as fallback (offline / provider fail).
// 2. Synthesis: provider-grounded answer when configured, deterministic
//    rule-based answer otherwise (engine:'rules' — honestly labeled).
// All steps are read-only and workspace-scoped through the CRMDataGateway.
// ==============================================================================

import {
  CopilotReplyData,
  ToolExecutionPayload,
  ToolName,
} from './types.ts';
import { ToolContext, executeSharedTool, isRegisteredTool, REGISTERED_TOOL_NAMES } from './crmTools.ts';
import {
  FLOWAI_SYSTEM_DIRECTIVE,
  buildSynthesisDirective,
  buildSynthesisUserMessage,
} from './prompts.ts';
import { ProviderRuntimeConfig, callProvider, callProviderJson, ProviderError } from './providerAdapter.ts';
import { validateToolArgs } from './validation.ts';

type FlowLocale = 'en' | 'ar';

// ------------------------------------------------------------------------------
// 1. DETERMINISTIC TOOL ROUTER (fallback; offline / provider outage)
// ------------------------------------------------------------------------------
export function deterministicRouter(message: string, locale: FlowLocale): { tool: ToolName; args: Record<string, unknown> } {
  const q = message.toLowerCase().trim();
  const ar = locale === 'ar' || /[\u0600-\u06FF]/.test(message);
  void ar;

  if (/(by assignee|by owner|لكل مسؤول|حسب المسؤول)/.test(q) && /(overdue|متأخر|متاخر|مهام|task)/.test(q)) {
    return { tool: 'get_overdue_tasks_by_assignee', args: {} };
  }
  if (/(overdue|متأخر|متاخر)/.test(q)) {
    return { tool: 'get_overdue_tasks', args: {} };
  }
  if (/(task|todo|priorit|مهام|مهمة|أولوي|اولوي)/.test(q)) {
    return { tool: 'get_open_tasks', args: {} };
  }
  if (/(attention|stalled|risk|need attention|تحتاج اهتمام|تحتاج متابعة|معلقة|متعثرة|خطر)/.test(q) && /(deal|pipeline|صفق|فرص)/.test(q)) {
    return { tool: 'get_deals_needing_attention', args: {} };
  }
  if (/(inactive|no.*interaction|no.*activity|without.*activity|بدون.*تفاعل|غير نشط|خامل|لم يتم التواصل)/.test(q)) {
    const daysMatch = q.match(/(\d+)\s*(day|days|يوم|أيام|ايام)/);
    const days = daysMatch ? Number(daysMatch[1]) : 30;
    return { tool: 'get_inactive_contacts', args: { days } };
  }
  if (/(won deal|صفقات رابحة|صفقات ناجحة)/.test(q)) {
    return { tool: 'get_won_deals_period', args: { period: 'this_month' } };
  }
  if (/(compare|مقارنة)/.test(q) && /(pipeline|period|فترة|شهر)/.test(q)) {
    return { tool: 'compare_pipeline_periods', args: { periodA: 'this_month', periodB: 'last_month' } };
  }
  if (/(source|acquisition|مصادر|مصدر)/.test(q)) {
    return { tool: 'get_contact_sources', args: {} };
  }
  if (/(pipeline|funnel|stage|مراحل|خط الأنابيب|خط انابيب|الصفقات)/.test(q)) {
    return { tool: 'get_pipeline_breakdown', args: {} };
  }
  if (/(win rate|metric|performance|kpi|أداء|اداء|مبيعات|نسبة الفوز)/.test(q)) {
    return { tool: 'get_sales_metrics', args: {} };
  }
  if (/(activity|timeline|نشاط|سجل)/.test(q)) {
    return { tool: 'get_activity_timeline', args: {} };
  }
  if (/(contact|client|customer|عميل|جهة اتصال|جهات الاتصال|زبون)/.test(q)) {
    const cleanTerm = message
      .replace(/(search|find|show|list|contacts|contact|client|customer|who is|ابحث|عن|اعرض|جهة اتصال|جهات الاتصال|عميل|زبون)/gi, '')
      .replace(/[?؟]/g, '')
      .trim();
    if (cleanTerm.length >= 2) {
      return { tool: 'search_contacts', args: { query: cleanTerm.slice(0, 120) } };
    }
    return { tool: 'get_sales_metrics', args: {} };
  }
  // Generic questions → trusted KPI overview.
  return { tool: 'get_sales_metrics', args: {} };
}

// ------------------------------------------------------------------------------
// 2. LLM-CONSTRAINED TOOL SELECTION (single registered tool, validated)
// ------------------------------------------------------------------------------
const TOOL_SELECTION_TIMEOUT_MS = 12_000;

export async function selectToolWithLLM(
  message: string,
  locale: FlowLocale,
  provider: ProviderRuntimeConfig | null
): Promise<{ tool: ToolName; args: Record<string, unknown>; tokens: number; usedLLM: boolean }> {
  if (!provider) {
    return { ...deterministicRouter(message, locale), tokens: 0, usedLLM: false };
  }

  try {
    const result = await callProviderJson<{ tool: string; args?: Record<string, unknown> }>(
      provider,
      {
        system:
          FLOWAI_SYSTEM_DIRECTIVE.replace(/\s+/g, ' ') +
          ' CURRENT ROLE: TOOL ROUTER. Respond ONLY with strict JSON {"tool":"<registered_name>","args":{...}} choosing exactly one registered read-only tool.',
        user: `User question: ${message}\nRegistered tools: ${Object.keys(REGISTERED_TOOL_NAMES).join(', ')}\nAnswer language preference: ${locale}`,
        temperature: 0,
        maxOutputTokens: 256,
      },
      raw => {
        const parsed = JSON.parse(raw) as { tool?: unknown; args?: unknown };
        if (!parsed || !isRegisteredTool(parsed.tool)) {
          throw new Error(`Unregistered or missing tool name: ${String(parsed?.tool)}`);
        }
        if (parsed.args !== undefined && (typeof parsed.args !== 'object' || Array.isArray(parsed.args))) {
          throw new Error('args must be an object');
        }
        return { tool: parsed.tool as ToolName, args: (parsed.args as Record<string, unknown>) ?? {} };
      },
      { timeoutMs: TOOL_SELECTION_TIMEOUT_MS, jsonMode: true }
    );

    const validated = validateToolArgs(result.data.tool, result.data.args);
    if (!validated.ok) {
      return { ...deterministicRouter(message, locale), tokens: result.tokens, usedLLM: false };
    }
    return { tool: result.data.tool as ToolName, args: validated.args, tokens: result.tokens, usedLLM: true };
  } catch (err) {
    if (err instanceof ProviderError && err.code === 'unauthorized') {
      throw err;
    }
    return { ...deterministicRouter(message, locale), tokens: 0, usedLLM: false };
  }
}

// ------------------------------------------------------------------------------
// 3. SYNTHESIS (LLM grounded, or deterministic rule reply)
// ------------------------------------------------------------------------------
export async function synthesizeAnswer(
  question: string,
  toolResult: ToolExecutionPayload,
  locale: FlowLocale,
  provider: ProviderRuntimeConfig | null
): Promise<{ reply: string; tokens: number; engine: 'llm' | 'rules' }> {
  if (!provider) {
    return { reply: buildDeterministicReply(question, toolResult, locale), tokens: 0, engine: 'rules' };
  }

  try {
    const response = await callProvider(
      provider,
      {
        system: FLOWAI_SYSTEM_DIRECTIVE + '\n\n' + buildSynthesisDirective(locale),
        user: buildSynthesisUserMessage(question, JSON.stringify(toolResult.data, null, 1)),
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
      { timeoutMs: 30_000 }
    );

    const text = response.text.trim();
    if (!text) {
      return { reply: buildDeterministicReply(question, toolResult, locale), tokens: response.promptTokens, engine: 'rules' };
    }
    return { reply: text, tokens: response.promptTokens + response.completionTokens, engine: 'llm' };
  } catch (err) {
    if (err instanceof ProviderError && err.code === 'unauthorized') {
      throw err;
    }
    return { reply: buildDeterministicReply(question, toolResult, locale), tokens: 0, engine: 'rules' };
  }
}

// ------------------------------------------------------------------------------
// 4. DETERMINISTIC RULE-BASED REPLY (grounded in the tool payload only)
// ------------------------------------------------------------------------------
interface ListViewItem {
  [key: string]: unknown;
}

function summarizeListData(result: ToolExecutionPayload, _locale: FlowLocale): string {
  const data = result.data;
  if (!Array.isArray(data) || data.length === 0) return result.explanation;

  const bullets = (data as ListViewItem[]).map(item => {
    switch (result.toolName) {
      case 'get_overdue_tasks':
      case 'get_open_tasks': {
        const title = typeof item.title === 'string' ? item.title : '';
        const due = typeof item.formattedDueDate === 'string' ? item.formattedDueDate : '';
        const priority = typeof item.priority === 'string' ? item.priority.toUpperCase() : '';
        return `• [${priority}] ${title} (${due})`;
      }
      case 'get_pipeline_breakdown': {
        const stage = typeof item.stage === 'string' ? item.stage.toUpperCase() : '?';
        const count = typeof item.count === 'number' ? item.count : 0;
        const value = typeof item.formattedValue === 'string' ? item.formattedValue : '';
        return `• ${stage}: ${count} (${value})`;
      }
      case 'search_contacts': {
        const name = typeof item.full_name === 'string' ? item.full_name : '';
        const company = typeof item.company === 'string' && item.company ? item.company : 'N/A';
        const status = typeof item.status === 'string' ? item.status.toUpperCase() : '?';
        const id = typeof item.id === 'string' ? item.id : '';
        return `• ${name} (${company}) — ${status} [contact:${id}]`;
      }
      case 'get_activity_timeline': {
        const desc = typeof item.description === 'string' ? item.description : '';
        const time = typeof item.formattedDate === 'string' ? item.formattedDate : '';
        return `• ${desc} — ${time}`;
      }
      case 'get_inactive_contacts': {
        const name = typeof item.full_name === 'string' ? item.full_name : '';
        const company = typeof item.company === 'string' && item.company ? item.company : 'N/A';
        const days = typeof item.daysSinceLastActivity === 'number' ? `${item.daysSinceLastActivity}d inactive` : 'Never contacted';
        const id = typeof item.id === 'string' ? item.id : '';
        return `• ${name} (${company}) — [${days}] [contact:${id}]`;
      }
      case 'get_deals_needing_attention': {
        const title = typeof item.title === 'string' ? item.title : '';
        const stage = typeof item.stage === 'string' ? item.stage.toUpperCase() : '';
        const value = typeof item.formattedValue === 'string' ? item.formattedValue : '';
        const reasons = Array.isArray(item.riskReasons) ? item.riskReasons.join('; ') : '';
        const id = typeof item.id === 'string' ? item.id : '';
        return `• [${stage}] ${title} (${value}) — Attention: ${reasons} [deal:${id}]`;
      }
      default:
        return `• ${truncate(String(item.title ?? safeJson(item)), 140)}`;
    }
  });

  return result.explanation + '\n' + bullets.join('\n');
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 120);
  } catch {
    return '';
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function buildDeterministicReply(question: string, toolResult: ToolExecutionPayload, locale: FlowLocale): string {
  void question;
  const ar = locale === 'ar';
  const data = toolResult.data as unknown;

  if (data === null || data === undefined) {
    return ar
      ? `لم أجد بيانات كافية للإجابة في مساحة العمل الخاصة بك. ${explanationLine(toolResult)}`
      : `There is not enough data in your workspace to answer that. ${explanationLine(toolResult)}`;
  }

  if (Array.isArray(data) && data.length === 0) {
    return ar
      ? `لا توجد سجلات مطابقة لسؤالك حاليًا. ${explanationLine(toolResult)}\n\nالإجراء الموصى به: إضافة السجلات ذات الصلة أو تسجيل أنشطة جديدة، ثم إعادة المحاولة.`
      : `No matching records exist right now. ${explanationLine(toolResult)}\n\nRecommended action: add the relevant records or log recent activities, then ask again.`;
  }

  if (toolResult.toolName === 'get_sales_metrics') {
    const m = data as {
      totalContacts: number;
      activeDealsCount: number;
      formattedOpenPipelineValue: string;
      wonDealsCount: number;
      formattedWonDealsValue: string;
      winRate: number;
      tasksOverdue: number;
      tasksDueToday: number;
    };
    return ar
      ? `ملخص أداء المبيعات الحالي:\n• إجمالي العملاء: ${m.totalContacts}\n• الصفقات النشطة: ${m.activeDealsCount} بقيمة ${m.formattedOpenPipelineValue}\n• الصفقات الرابحة: ${m.wonDealsCount} (${m.formattedWonDealsValue})\n• نسبة الفوز: ${m.winRate}%\n• مهام مستحقة اليوم: ${m.tasksDueToday} | متأخرة: ${m.tasksOverdue}\n\nالإجراء الموصى به: ${m.tasksOverdue > 0 ? 'معالجة المهام المتأخرة اليوم' : 'متابعة الصفقات النشطة لخطوتها التالية'}.`
      : `Current sales performance:\n• Total contacts: ${m.totalContacts}\n• Active pipeline: ${m.activeDealsCount} deals worth ${m.formattedOpenPipelineValue}\n• Closed won: ${m.wonDealsCount} deals worth ${m.formattedWonDealsValue}\n• Win rate: ${m.winRate}%\n• Tasks due today: ${m.tasksDueToday} | Overdue: ${m.tasksOverdue}\n\nRecommended action: ${m.tasksOverdue > 0 ? 'clear the overdue tasks today' : 'advance the top active deals to their next step'}.`;
  }

  if (toolResult.toolName === 'get_overdue_tasks_by_assignee') {
    const d = data as { rows: Array<{ assignee: string; count: number }>; totalOverdue: number };
    const lines = d.rows.map(r => `• ${r.assignee}: ${r.count}`).join('\n');
    return ar
      ? `إجمالي المهام المتأخرة: ${d.totalOverdue}، موزعة على المسؤولين:\n${lines}\n\nالإجراء الموصى به: مراجعة القائمة كاملة من صفحة المهام وتحديد أولوية التواصل.`
      : `Total overdue tasks: ${d.totalOverdue}, grouped by owner:\n${lines}\n\nRecommended action: review the list on the Tasks page and prioritize outreach.`;
  }

  return `${explanationLine(toolResult)}\n\n${summarizeListData(toolResult, locale)}`.trim();
}

function explanationLine(toolResult: ToolExecutionPayload): string {
  if (toolResult.evidence.length === 0) return toolResult.explanation;
  return `${toolResult.explanation} (${toolResult.evidence[0].route})`;
}

// ------------------------------------------------------------------------------
// 5. FULL COPILOT PIPELINE
// ------------------------------------------------------------------------------
export async function runCopilot(params: {
  message: string;
  locale: FlowLocale;
  ctx: ToolContext;
  provider: ProviderRuntimeConfig | null;
  onTokens?: (tokens: number) => void;
}): Promise<CopilotReplyData & { engineUsed: 'llm' | 'rules' }> {
  // Step 1: constrained tool selection.
  const selection = await selectToolWithLLM(params.message, params.locale, params.provider);
  params.onTokens?.(selection.tokens);

  // Step 2: execute the authorized, validated tool.
  const toolResult = await executeSharedTool(selection.tool, selection.args, params.ctx);

  // Step 3: grounded synthesis (LLM when provider responds; deterministic otherwise).
  const synthesis = await synthesizeAnswer(params.message, toolResult, params.locale, params.provider);
  params.onTokens?.(synthesis.tokens);

  return {
    reply: synthesis.reply,
    evidence: toolResult.evidence,
    toolUsed: toolResult.toolName,
    engineUsed: synthesis.engine,
  };
}
