// ==============================================================================
// FlowAI Natural-Language Analytics Engine.
// A constrained, typed reporting interface: the model may ONLY pick a
// registered analytics intent and parameters; all metric math lives in
// _shared/metrics.ts (the same authoritative formulas as the dashboard).
// No generated SQL ever reaches production.
// ==============================================================================

import {
  AnalyticsPeriod,
  NLAnalyticsResultCore,
  ToolName,
  ToolExecutionPayload,
} from './types.ts';
import {
  formatMoneyShared,
  ANALYTICS_PERIOD_LABELS_EN,
  ANALYTICS_PERIOD_LABELS_AR,
} from './metrics.ts';
import {
  ToolContext,
  executeSharedTool,
  REGISTERED_TOOL_NAMES,
} from './crmTools.ts';
import { ProviderRuntimeConfig, callProviderJson, ProviderError } from './providerAdapter.ts';
import { validateToolArgs } from './validation.ts';

type FlowLocale = 'en' | 'ar';

// ------------------------------------------------------------------------------
// 1. DETERMINISTIC ANALYTICS ROUTER (period parsing + intent)
// ------------------------------------------------------------------------------
export function parsePeriodFromText(text: string): AnalyticsPeriod | '' {
  const q = text.toLowerCase();
  if (/قارن|compare|between|فكرتين|فترتين|الشهر الماضي و|last month vs|month over month/.test(q)) {
    return ''; // explicit for comparisons — engine chooses the two windows
  }
  if (/الشهر الماضي|last month/.test(q)) return 'last_month';
  if (/الشهر الحالي|هذا الشهر|this month|current month/.test(q)) return 'this_month';
  if (/هذا الربع|الربع الحالي|this quarter/.test(q)) return 'this_quarter';
  if (/كل الفترات|all time|all-time|الكل/.test(q)) return 'all_time';
  return '';
}

export interface ParsedAnalyticsIntent {
  tool: ToolName;
  periodExplicit: boolean;
  args: Record<string, unknown>;
}

export function deterministicAnalyticsIntent(query: string, explicitPeriod: AnalyticsPeriod | '', _locale: FlowLocale): ParsedAnalyticsIntent {
  const q = query.toLowerCase();

  if (/قارن|compare|فترتين|month over month/.test(q) || /vs |versus/.test(q)) {
    return {
      tool: 'compare_pipeline_periods',
      periodExplicit: false,
      args: { periodA: 'this_month', periodB: 'last_month' },
    };
  }
  if (/مصادر|source|اكتساب|نسب الاكتساب|sources/.test(q)) {
    return { tool: 'get_contact_sources', args: {}, periodExplicit: false };
  }
  if (/المسؤول|حسب الموظف|by assignee|by owner|المتأخرة للموظف/.test(q)) {
    return { tool: 'get_overdue_tasks_by_assignee', args: {}, periodExplicit: false };
  }
  if (/(ربح|فوز|رابح|فزت|win|won)/.test(q) || /closed.won/.test(q)) {
    return { tool: 'get_won_deals_period', args: { period: explicitPeriod || 'all_time' }, periodExplicit: Boolean(explicitPeriod) };
  }
  if (/متأخر|overdue/.test(q)) {
    return { tool: 'get_overdue_tasks_by_assignee', args: {}, periodExplicit: false };
  }
  if (/مراحل|stage|pipeline|خط الأنابيب/.test(q)) {
    return { tool: 'get_pipeline_breakdown', args: {}, periodExplicit: false };
  }
  return { tool: 'get_sales_metrics', args: {}, periodExplicit: false };
}

// ------------------------------------------------------------------------------
// 2. LLM-CONSTRAINED ANALYTICS INTENT (validated against the registry)
// ------------------------------------------------------------------------------
export async function selectAnalyticsIntentWithLLM(
  query: string,
  provider: ProviderRuntimeConfig | null,
  locale: FlowLocale
): Promise<ParsedAnalyticsIntent> {
  if (!provider) {
    return deterministicAnalyticsIntent(query, parsePeriodFromText(query), locale);
  }

  try {
    const result = await callProviderJson<{ tool: string; args?: Record<string, unknown> }>(
      provider,
      {
        system:
          'You are the FlowAI analytics router. Choose ONE registered read-only analytics tool for the user question. Respond ONLY strict JSON {"tool":"<name>","args":{...}}.',
        user:
          `Question: ${query}\n` +
          `Allowed tools: ${Object.keys(REGISTERED_TOOL_NAMES).filter(t => ANALYTICS_TOOLS.has(t as ToolName)).join(', ')}\n` +
          `Period enum: this_month | last_month | this_quarter | all_time. If the question implies a period, set args.period.`,
        temperature: 0,
        maxOutputTokens: 200,
      },
      raw => {
        const parsed = JSON.parse(raw) as { tool?: unknown; args?: unknown };
        if (!parsed || typeof parsed.tool !== 'string' || !ANALYTICS_TOOLS.has(parsed.tool as ToolName)) {
          throw new Error(`Tool not in analytics registry: ${String(parsed?.tool)}`);
        }
        if (parsed.args !== undefined && (typeof parsed.args !== 'object' || Array.isArray(parsed.args))) {
          throw new Error('args must be an object');
        }
        return { tool: parsed.tool as ToolName, args: (parsed.args as Record<string, unknown>) ?? {} };
      },
      { timeoutMs: 12_000, jsonMode: true }
    );

    const validated = validateToolArgs(result.data.tool, result.data.args);
    if (!validated.ok) {
      return deterministicAnalyticsIntent(query, parsePeriodFromText(query), locale);
    }
    const periodArg = typeof validated.args.period === 'string' ? validated.args.period : '';
    return {
      tool: result.data.tool as ToolName,
      args: validated.args,
      periodExplicit: typeof periodArg === 'string' && periodArg.length > 0,
    };
  } catch (err) {
    if (err instanceof ProviderError && err.code === 'unauthorized') {
      throw err;
    }
    return deterministicAnalyticsIntent(query, parsePeriodFromText(query), locale);
  }
}

const ANALYTICS_TOOLS = new Set<ToolName>([
  'get_won_deals_period',
  'get_overdue_tasks_by_assignee',
  'compare_pipeline_periods',
  'get_contact_sources',
  'get_pipeline_breakdown',
  'get_sales_metrics',
]);

// ------------------------------------------------------------------------------
// 3. TOOL RESULT → NLAnalyticsResult (shared shaping)
// ------------------------------------------------------------------------------
export async function buildAnalyticsAnswer(params: {
  query: string;
  explicitPeriod: AnalyticsPeriod | '';
  locale: FlowLocale;
  ctx: ToolContext;
  provider: ProviderRuntimeConfig | null;
}): Promise<NLAnalyticsResultCore> {
  const selection = await selectAnalyticsIntentWithLLM(params.query, params.provider, params.locale);
  const result = await executeSharedTool(selection.tool, selection.args, params.ctx);

  return shapeAnalyticsResult({
    query: params.query,
    toolResult: result,
    locale: params.locale,
    explicitPeriod: params.explicitPeriod,
  });
}

export function shapeAnalyticsResult(input: {
  query: string;
  toolResult: ToolExecutionPayload;
  locale: FlowLocale;
  explicitPeriod: AnalyticsPeriod | '';
}): NLAnalyticsResultCore {
  const ar = input.locale === 'ar';
  const d = input.toolResult.data as Record<string, unknown>;
  const t = input.toolResult.toolName;

  if (t === 'get_won_deals_period') {
    const data = d as unknown as import('./types.ts').WonDealsPeriodResult;
    return {
      query: input.query,
      matchedType: 'won_deals_period',
      answerExplanation: ar
        ? `تم إحراز ${data.count} صفقة رابحة بقيمة إجمالية ${data.formattedTotalValue} خلال الفترة: ${periodLabelAr(data.period)}.`
        : `Closed won ${data.count} deal(s) totaling ${data.formattedTotalValue} within period: ${data.period}.`,
      kpiHighlight: {
        label: ar ? 'قيمة الصفقات الرابحة' : 'Won deals value',
        value: data.formattedTotalValue,
        subtext: ar ? `${data.count} صفقة` : `${data.count} deals`,
      },
      chartType: 'metric',
      periodDescription: ar ? periodLabelAr(data.period) : describePeriodEn(data.period),
      appliedFilters: [`stage = won`, `period = ${data.period}`],
      metricDefinition: data.metricDefinition,
      recordLinks: data.deals.map(deal => ({
        id: deal.id,
        type: 'deal',
        title: deal.title,
        subtitle: deal.value,
        route: '/deals',
      })),
    };
  }

  if (t === 'get_contact_sources') {
    const data = d as unknown as import('./types.ts').ContactSourcesResult;
    return {
      query: input.query,
      matchedType: 'contact_sources',
      answerExplanation: ar
        ? `توزيع مصادر اكتساب العملاء عبر ${data.totalContacts} جهة اتصال في ${data.chartData.length} قناة.`
        : `Acquisition-source distribution across ${data.totalContacts} contacts in ${data.chartData.length} channel(s).`,
      chartData: data.chartData,
      chartType: 'pie',
      periodDescription: ar ? 'تراكمي (كل الفترات)' : 'Cumulative (all time)',
      appliedFilters: ['group_by = lead_source'],
      recordLinks: [],
    };
  }

  if (t === 'get_overdue_tasks_by_assignee') {
    const data = d as unknown as import('./types.ts').OverdueByAssigneeResult;
    return {
      query: input.query,
      matchedType: 'overdue_by_assignee',
      answerExplanation: ar
        ? `${data.totalOverdue} مهمة متأخرة موزعة على ${data.rows.length} مسؤول.`
        : `${data.totalOverdue} overdue task(s) grouped across ${data.rows.length} owner(s).`,
      chartData: data.rows.map(r => ({ name: r.assignee, value: r.count })),
      chartType: 'bar',
      periodDescription: ar ? 'الحالة الحالية' : 'Current state',
      appliedFilters: ['status != completed AND cancelled', 'due_date < now'],
      recordLinks: [],
    };
  }

  if (t === 'compare_pipeline_periods') {
    const data = d as unknown as import('./types.ts').PeriodComparisonResult;
    return {
      query: input.query,
      matchedType: 'pipeline_period_comparison',
      answerExplanation: ar
        ? `خط الأنابيب المفتوح: ${data.periodA.label} ${data.periodA.formattedValue} (${data.periodA.count}) مقابل ${data.periodB.label} ${data.periodB.formattedValue} (${data.periodB.count}). الفرق: ${formatMoneyShared(data.deltaValue, 'USD', input.locale)} و ${data.deltaCount} صفقة.`
        : `Open pipeline: ${data.periodA.label} ${data.periodA.formattedValue} (${data.periodA.count}) vs ${data.periodB.label} ${data.periodB.formattedValue} (${data.periodB.count}). Delta: ${formatMoneyShared(data.deltaValue, 'USD', input.locale)} and ${data.deltaCount} deal(s).`,
      chartData: [
        { name: data.periodA.label, value: data.periodA.count, amount: data.periodA.value },
        { name: data.periodB.label, value: data.periodB.count, amount: data.periodB.value },
      ],
      chartType: 'bar',
      periodDescription: `${data.periodA.label} · ${data.periodB.label}`,
      appliedFilters: ['stage IN (new, qualified, proposal, negotiation)', 'created_at window'],
      metricDefinition: data.metricDefinition,
      recordLinks: [],
    };
  }

  if (t === 'get_pipeline_breakdown') {
    const rows = d as unknown as import('./types.ts').PipelineRowResult[];
    return {
      query: input.query,
      matchedType: 'pipeline_stage_counts',
      answerExplanation: ar
        ? `حالة خط الأنابيب: ${rows.length} مرحلة. الربح = أعلى عدد في مرحلة الانتشار.`
        : `Pipeline distribution across ${rows.length} stages.`,
      chartData: rows.map(r => ({ name: r.stage, value: r.count, amount: r.totalValue })),
      chartType: 'bar',
      periodDescription: ar ? 'الوقت الفعلي' : 'Real time',
      appliedFilters: ['group_by = stage'],
      recordLinks: [],
    };
  }

  // get_sales_metrics fallback
  const metrics = d as unknown as import('./types.ts').MetricsResult;
  return {
    query: input.query,
    matchedType: 'general_kpi',
    answerExplanation: ar
      ? `أداء عام: ${metrics.totalContacts} عميل، ${metrics.activeDealsCount} صفقة نشطة بقيمة ${formatMoneyShared(metrics.openPipelineValue, 'USD', input.locale)}، نسبة فوز ${metrics.winRate}%.`
      : `General performance: ${metrics.totalContacts} contacts, ${metrics.activeDealsCount} active deals worth ${formatMoneyShared(metrics.openPipelineValue, 'USD', input.locale)}, win rate ${metrics.winRate}%.`,
    kpiHighlight: {
      label: ar ? 'قيمة خط الأنابيب المفتوح' : 'Open pipeline value',
      value: formatMoneyShared(metrics.openPipelineValue, 'USD', input.locale),
      subtext: ar ? `${metrics.activeDealsCount} صفقة نشطة` : `${metrics.activeDealsCount} active deals`,
    },
    chartType: 'metric',
    periodDescription: ar ? 'الوقت الفعلي' : 'Real time',
    appliedFilters: [],
    recordLinks: [],
  };
}

function periodLabelAr(period: AnalyticsPeriod): string {
  return ANALYTICS_PERIOD_LABELS_AR[period] ?? period;
}
function describePeriodEn(period: AnalyticsPeriod): string {
  return ANALYTICS_PERIOD_LABELS_EN[period] ?? period;
}
