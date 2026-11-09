// ==============================================================================
// FlowAI Shared CRM Tool Registry — server & demo-mode implementations of the
// registered read-only tools. Every tool executes against the CRMDataGateway
// (RLS-scoped). No tool ever writes. Payloads are deterministic, shaped data.
// ==============================================================================

import {
  AnalyticsPeriod,
  ContactSourcesResult,
  DealSummaryResult,
  ContactSummaryResult,
  GroundedEvidence,
  MetricsResult,
  OverdueByAssigneeResult,
  PeriodComparisonResult,
  PipelineRowResult,
  SharedTaskRow,
  TaskListResult,
  ToolExecutionPayload,
  ToolName,
  WonDealsPeriodResult,
} from './types.ts';
import { CRMDataGateway } from './gateway.ts';
import {
  OPEN_DEAL_STAGES,
  computeDashboardMetrics,
  computePipelineStageBreakdown,
  formatDateShared,
  formatMoneyShared as money,
  isTaskOverdueShared,
  isTimestampInWindow,
  resolvePeriodWindow,
  toNumber,
  ANALYTICS_PERIOD_LABELS_EN,
  ANALYTICS_PERIOD_LABELS_AR,
} from './metrics.ts';

const MAX_TOOL_LIMIT = 30;

export interface ToolContext {
  gateway: CRMDataGateway;
  workspaceId: string;
  locale: 'en' | 'ar';
  now: Date;
  tzOffsetMinutes: number;
}

function clampLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(MAX_TOOL_LIMIT, Math.floor(parsed));
}

function taskToListItem(t: SharedTaskRow, locale: 'en' | 'ar'): TaskListResult {
  return {
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    formattedDueDate: formatDateShared(t.due_date, locale),
    priority: t.priority || 'medium',
    contactName: t.contact?.full_name ?? null,
    dealTitle: t.deal?.title ?? null,
    assignee: t.assignee?.full_name ?? null,
  };
}

function taskEvidence(t: SharedTaskRow, locale: 'en' | 'ar', overdue: boolean): GroundedEvidence {
  return {
    id: t.id,
    type: 'task',
    title: t.title,
    subtitle: overdue
      ? `Overdue since ${formatDateShared(t.due_date, locale)}`
      : formatDateShared(t.due_date, locale),
    route: '/tasks',
    snippet: `Priority: ${t.priority || 'medium'}`,
  };
}

// ------------------------------------------------------------------------------
// TOOLS
// ------------------------------------------------------------------------------
export async function searchContactsTool(
  gateway: CRMDataGateway,
  args: { query?: unknown; limit?: unknown },
  _locale: 'en' | 'ar'
): Promise<ToolExecutionPayload> {
  const query = String(args.query ?? '').toLowerCase().trim();
  if (!query) return { toolName: 'search_contacts', data: [], evidence: [], explanation: 'Empty search term.' };

  const contacts = await gateway.contacts();
  const limit = clampLimit(args.limit, 5);

  const matches = contacts
    .filter(
      c =>
        c.full_name.toLowerCase().includes(query) ||
        (c.email ?? '').toLowerCase().includes(query) ||
        (c.company ?? '').toLowerCase().includes(query) ||
        (c.phone ?? '').toLowerCase().includes(query)
    )
    .slice(0, limit);

  const evidence: GroundedEvidence[] = matches.map(c => ({
    id: c.id,
    type: 'contact',
    title: c.full_name,
    subtitle: c.company || c.email || undefined,
    route: '/contacts',
    snippet: `${(c.status || 'lead').toUpperCase()} | Rep: ${c.assignee?.full_name ?? 'Unassigned'}`,
  }));

  return {
    toolName: 'search_contacts',
    data: matches.map(c => ({
      id: c.id,
      full_name: c.full_name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      company: c.company ?? null,
      job_title: c.job_title ?? null,
      status: c.status ?? 'lead',
      lead_source: c.lead_source ?? null,
      assignee: c.assignee?.full_name ?? null,
    })),
    evidence,
    explanation: matches.length > 0 ? `Found ${matches.length} matching contact(s).` : `No contacts found matching "${query}".`,
  };
}

export async function getContactSummaryTool(
  gateway: CRMDataGateway,
  args: { contactId?: unknown },
  locale: 'en' | 'ar'
): Promise<ToolExecutionPayload> {
  const contactId = String(args.contactId ?? '');
  if (!contactId) return { toolName: 'get_contact_summary', data: null, evidence: [], explanation: 'Missing contact id.' };

  const [contacts, deals, tasks, activities] = await Promise.all([
    gateway.contacts(),
    gateway.deals(),
    gateway.tasks(),
    gateway.activities(),
  ]);

  const contact = contacts.find(c => c.id === contactId);
  if (!contact) {
    return {
      toolName: 'get_contact_summary',
      data: null,
      evidence: [],
      explanation: `Contact with id "${contactId}" does not exist in this workspace (or is not accessible).`,
    };
  }

  const relatedDeals = deals.filter(d => d.contact_id === contact.id);
  const relatedTasks = tasks.filter(t => t.contact_id === contact.id);
  const relatedActivities = activities.filter(a => a.contact_id === contact.id);

  const data: ContactSummaryResult = {
    contact: {
      id: contact.id,
      full_name: contact.full_name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      company: contact.company ?? null,
      job_title: contact.job_title ?? null,
      status: contact.status ?? 'lead',
      lead_source: contact.lead_source ?? null,
      notes: contact.notes ?? null,
      assignee: contact.assignee?.full_name ?? null,
    },
    dealsCount: relatedDeals.length,
    deals: relatedDeals.slice(0, 10).map(d => ({
      id: d.id,
      title: d.title,
      value: money(toNumber(d.value), d.currency || 'USD', locale),
      stage: d.stage || 'new',
      expected_close_date: d.expected_close_date ?? null,
    })),
    tasksCount: relatedTasks.length,
    pendingTasks: relatedTasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        title: t.title,
        due_date: formatDateShared(t.due_date, locale),
        priority: t.priority || 'medium',
      })),
    recentActivitiesCount: relatedActivities.length,
  };

  const evidence: GroundedEvidence[] = [
    {
      id: contact.id,
      type: 'contact',
      title: contact.full_name,
      subtitle: contact.company ?? contact.email ?? undefined,
      route: '/contacts',
      snippet: `Status: ${(contact.status || 'lead').toUpperCase()}`,
    },
  ];

  return {
    toolName: 'get_contact_summary',
    data,
    evidence,
    explanation: `Retrieved complete summary for ${contact.full_name}.`,
  };
}

export async function getDealSummaryTool(
  gateway: CRMDataGateway,
  args: { dealId?: unknown },
  locale: 'en' | 'ar'
): Promise<ToolExecutionPayload> {
  const dealId = String(args.dealId ?? '');
  if (!dealId) return { toolName: 'get_deal_summary', data: null, evidence: [], explanation: 'Missing deal id.' };

  const [deals, tasks] = await Promise.all([gateway.deals(), gateway.tasks()]);
  const deal = deals.find(d => d.id === dealId);

  if (!deal) {
    return {
      toolName: 'get_deal_summary',
      data: null,
      evidence: [],
      explanation: `Opportunity with id "${dealId}" not found in this workspace (or is not accessible).`,
    };
  }

  const dealTasks = tasks.filter(t => t.deal_id === deal.id);

  const data: DealSummaryResult = {
    id: deal.id,
    title: deal.title,
    value: toNumber(deal.value),
    formattedValue: money(toNumber(deal.value), deal.currency || 'USD', locale),
    currency: deal.currency || 'USD',
    stage: deal.stage || 'new',
    expected_close_date: deal.expected_close_date ?? null,
    contact: deal.contact ? { id: deal.contact.id, name: deal.contact.full_name, company: deal.contact.company ?? null } : null,
    assignee: deal.assignee?.full_name ?? 'Unassigned',
    notes: deal.notes ?? null,
    pendingTasksCount: dealTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
  };

  return {
    toolName: 'get_deal_summary',
    data,
    evidence: [
      {
        id: deal.id,
        type: 'deal',
        title: deal.title,
        subtitle: data.formattedValue,
        route: '/deals',
        snippet: `Stage: ${(deal.stage || 'new').toUpperCase()}`,
      },
    ],
    explanation: `Retrieved opportunity details for ${deal.title}.`,
  };
}

export async function getOpenTasksTool(
  gateway: CRMDataGateway,
  args: { limit?: unknown },
  locale: 'en' | 'ar'
): Promise<ToolExecutionPayload> {
  const tasks = await gateway.tasks();
  const openTasks = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && !isTaskOverdueShared(t.due_date, t.status, new Date(), 0))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, clampLimit(args.limit, 10));

  return {
    toolName: 'get_open_tasks',
    data: openTasks.map(t => taskToListItem(t, locale)),
    evidence: openTasks.map(t => taskEvidence(t, locale, false)),
    explanation: `Found ${openTasks.length} pending task(s).`,
  };
}

export async function getAllOpenTasksForPrioritization(
  gateway: CRMDataGateway,
  now: Date,
  tzOffsetMinutes: number,
  limit = 10
): Promise<SharedTaskRow[]> {
  const tasks = await gateway.tasks();
  const open = tasks.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled'
  );
  const overdue = open.filter(t => isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes));
  const upcoming = open
    .filter(t => !isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  return [...overdue, ...upcoming].slice(0, limit);
}

export async function getOpenTasksUnified(
  gateway: CRMDataGateway,
  args: { limit?: unknown },
  locale: 'en' | 'ar',
  now: Date,
  tzOffsetMinutes: number
): Promise<ToolExecutionPayload> {
  const limit = clampLimit(args.limit, 10);
  const selected = await getAllOpenTasksForPrioritization(gateway, now, tzOffsetMinutes, limit);

  return {
    toolName: 'get_open_tasks',
    data: selected.map(t => taskToListItem(t, locale)),
    evidence: selected.map(t => taskEvidence(t, locale, isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes))),
    explanation: `Prioritized ${selected.length} open task(s): overdue first, then by due date.`,
  };
}

export async function getOverdueTasksTool(
  gateway: CRMDataGateway,
  args: { limit?: unknown },
  locale: 'en' | 'ar',
  now: Date,
  tzOffsetMinutes: number
): Promise<ToolExecutionPayload> {
  const tasks = await gateway.tasks();
  const overdueTasks = tasks
    .filter(t => isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, clampLimit(args.limit, 10));

  return {
    toolName: 'get_overdue_tasks',
    data: overdueTasks.map(t => taskToListItem(t, locale)),
    evidence: overdueTasks.map(t => taskEvidence(t, locale, true)),
    explanation: `Found ${overdueTasks.length} overdue task(s) requiring immediate attention.`,
  };
}

export async function getSalesMetricsTool(
  gateway: CRMDataGateway,
  locale: 'en' | 'ar',
  tzOffsetMinutes: number
): Promise<ToolExecutionPayload> {
  const [contacts, deals, tasks] = await Promise.all([gateway.contacts(), gateway.deals(), gateway.tasks()]);
  const metrics: MetricsResult = computeDashboardMetrics({
    contacts,
    deals,
    tasks,
    tzOffsetMinutes,
  });

  const data = {
    ...metrics,
    formattedOpenPipelineValue: money(metrics.openPipelineValue, 'USD', locale),
    formattedWonDealsValue: money(metrics.wonDealsValue, 'USD', locale),
  };

  return {
    toolName: 'get_sales_metrics',
    data,
    evidence: [
      {
        id: 'metric-winrate',
        type: 'metric',
        title: `Win Rate: ${metrics.winRate}%`,
        subtitle: `${metrics.wonDealsCount} won + ${metrics.totalContacts} contacts`,
        route: '/reports',
      },
      {
        id: 'metric-pipeline',
        type: 'metric',
        title: `Open Pipeline: ${data.formattedOpenPipelineValue}`,
        subtitle: `${metrics.activeDealsCount} active opportunities`,
        route: '/deals',
      },
    ],
    explanation: 'Retrieved authoritative sales metrics for workspace.',
  };
}

export async function getPipelineBreakdownTool(gateway: CRMDataGateway, locale: 'en' | 'ar'): Promise<ToolExecutionPayload> {
  const deals = await gateway.deals();
  const breakdown: PipelineRowResult[] = computePipelineStageBreakdown(deals, 'USD', locale);

  const evidence: GroundedEvidence[] = [
    {
      id: 'pipeline-breakdown',
      type: 'metric',
      title: 'Pipeline Breakdown by Stage',
      route: '/deals',
    },
  ];

  return {
    toolName: 'get_pipeline_breakdown',
    data: breakdown.map(b => ({ ...b, formattedValue: money(b.totalValue, 'USD', locale) })),
    evidence,
    explanation: 'Retrieved distribution across all 6 pipeline stages.',
  };
}

export async function getActivityTimelineTool(
  gateway: CRMDataGateway,
  args: { limit?: unknown; contactId?: unknown; dealId?: unknown },
  locale: 'en' | 'ar'
): Promise<ToolExecutionPayload> {
  const activities = await gateway.activities();

  let filtered = activities;
  const contactId = typeof args.contactId === 'string' ? args.contactId : '';
  const dealId = typeof args.dealId === 'string' ? args.dealId : '';
  if (contactId) filtered = filtered.filter(a => a.contact_id === contactId);
  if (dealId) filtered = filtered.filter(a => a.deal_id === dealId);

  // occurred_at may be missing in demo fixtures — sort defensively.
  const sorted = [...filtered].sort((a, b) =>
    String(b.occurred_at ?? '').localeCompare(String(a.occurred_at ?? ''))
  );
  const limited = sorted.slice(0, clampLimit(args.limit, 10));

  const data = limited.map(a => ({
    id: a.id,
    type: a.type || 'note',
    description: a.description,
    occurred_at: a.occurred_at ?? '',
    formattedDate: formatDateShared(a.occurred_at, locale),
    userName: a.user?.full_name ?? 'System',
  }));

  const evidence: GroundedEvidence[] = limited.map(a => ({
    id: a.id,
    type: 'activity',
    title: a.description.slice(0, 80),
    subtitle: formatDateShared(a.occurred_at, locale),
    route: '/activities',
    snippet: (a.type || 'note').toUpperCase(),
  }));

  return {
    toolName: 'get_activity_timeline',
    data,
    evidence,
    explanation: `Retrieved ${limited.length} activity event(s).`,
  };
}

export async function getWonDealsPeriodTool(
  gateway: CRMDataGateway,
  period: AnalyticsPeriod,
  locale: 'en' | 'ar',
  now: Date = new Date()
): Promise<ToolExecutionPayload> {
  const deals = await gateway.deals();
  const window = resolvePeriodWindow(period, now);

  const wonInWindow = deals
    .filter(d => d.stage === 'won' && isTimestampInWindow(d.updated_at, window))
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));

  const totalValue = wonInWindow.reduce((sum, d) => sum + toNumber(d.value), 0);

  const metricDefinition =
    locale === 'ar'
      ? 'الصفقات الحالية بحالة فوز (won) وكان آخر تحديث لها خلال الفترة المختارة (تقريب زمني لوقت إغلاق الصفقة).'
      : 'Deals currently in stage won whose record was LAST UPDATED within the selected period (server-side approximation of the win date).';

  const data: WonDealsPeriodResult = {
    period,
    periodStart: window.start,
    periodEnd: window.end,
    metricDefinition,
    count: wonInWindow.length,
    totalValue,
    formattedTotalValue: money(totalValue, 'USD', locale),
    deals: wonInWindow.slice(0, 10).map(d => ({
      id: d.id,
      title: d.title,
      value: money(toNumber(d.value), d.currency || 'USD', locale),
      stage: d.stage || 'won',
      closedWindow: formatDateShared(d.updated_at, locale),
    })),
  };

  return {
    toolName: 'get_won_deals_period',
    data,
    evidence: wonInWindow.slice(0, 10).map(d => ({
      id: d.id,
      type: 'deal',
      title: d.title,
      subtitle: money(toNumber(d.value), d.currency || 'USD', locale),
      route: '/deals',
      snippet: `Won window: ${formatDateShared(d.updated_at, locale)}`,
    })),
    explanation: `Found ${wonInWindow.length} won deal(s) in ${window.label}.`,
  };
}

export async function getOverdueTasksByAssigneeTool(
  gateway: CRMDataGateway,
  locale: 'en' | 'ar',
  now: Date,
  tzOffsetMinutes: number
): Promise<ToolExecutionPayload> {
  const tasks = await gateway.tasks();
  const overdue = tasks.filter(t => isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes));

  const grouped = new Map<string, { count: number; titles: string[]; id: string | null }>();
  for (const t of overdue) {
    const name = t.assignee?.full_name ?? 'Unassigned';
    const entry = grouped.get(name) ?? { count: 0, titles: [], id: t.assignee?.id ?? null };
    entry.count += 1;
    if (entry.titles.length < 5) entry.titles.push(t.title);
    grouped.set(name, entry);
  }

  const data: OverdueByAssigneeResult = {
    rows: Array.from(grouped.entries())
      .map(([assignee, entry]) => ({ assignee, count: entry.count, taskTitles: entry.titles, profileId: entry.id }))
      .sort((a, b) => b.count - a.count),
    totalOverdue: overdue.length,
  };

  return {
    toolName: 'get_overdue_tasks_by_assignee',
    data,
    evidence: overdue.slice(0, 10).map(t => taskEvidence(t, locale, true)),
    explanation: `Grouped ${overdue.length} overdue task(s) by ${data.rows.length} owner(s).`,
  };
}

export async function comparePipelinePeriodsTool(
  gateway: CRMDataGateway,
  periodA: AnalyticsPeriod,
  periodB: AnalyticsPeriod,
  locale: 'en' | 'ar',
  now: Date = new Date()
): Promise<ToolExecutionPayload> {
  const deals = await gateway.deals();

  const labelAr = (period: string) => ANALYTICS_PERIOD_LABELS_AR[period] ?? period;
  const labelEn = (period: string) => ANALYTICS_PERIOD_LABELS_EN[period] ?? period;

  const summarize = (period: string) => {
    const window = resolvePeriodWindow(period, now);
    const matching = deals.filter(d => isOpenStage(d) && isTimestampInWindow(d.created_at, window));
    const value = matching.reduce((s, d) => s + toNumber(d.value), 0);
    return {
      label: locale === 'ar' ? labelAr(period) : labelEn(period),
      period,
      start: window.start,
      end: window.end,
      count: matching.length,
      value,
      formattedValue: money(value, 'USD', locale),
      deals: matching,
    };
  };

  const a = summarize(periodA);
  const b = summarize(periodB);

  const metricDefinition =
    locale === 'ar'
      ? 'المقارنة تعتمد تاريخ إنشاء الصفقة (created_at) وتشمل الصفقات المفتوحة فقط (غير won/lost).'
      : 'Comparison is based on deal CREATION date (created_at) and includes only currently-open (non-won/lost) deals.';

  const data: PeriodComparisonResult = {
    metricDefinition,
    periodA: { label: a.label, start: a.start, end: a.end, count: a.count, value: a.value, formattedValue: a.formattedValue },
    periodB: { label: b.label, start: b.start, end: b.end, count: b.count, value: b.value, formattedValue: b.formattedValue },
    deltaValue: a.value - b.value,
    deltaCount: a.count - b.count,
  };

  return {
    toolName: 'compare_pipeline_periods',
    data,
    evidence: [
      { id: `cmp-${periodA}`, type: 'metric', title: `${a.label}: ${a.formattedValue} (${a.count} deals)`, route: '/deals' },
      { id: `cmp-${periodB}`, type: 'metric', title: `${b.label}: ${b.formattedValue} (${b.count} deals)`, route: '/deals' },
    ],
    explanation: `Open pipeline created in ${a.label}: ${a.formattedValue} (${a.count} deals); in ${b.label}: ${b.formattedValue} (${b.count} deals).`,
  };
}

function isOpenStage(deal: { stage?: string }): boolean {
  return OPEN_DEAL_STAGES.includes((deal.stage ?? 'new') as (typeof OPEN_DEAL_STAGES)[number]);
}

export async function getContactSourcesTool(gateway: CRMDataGateway, _locale: 'en' | 'ar'): Promise<ToolExecutionPayload> {
  const contacts = await gateway.contacts();

  const counts = new Map<string, number>();
  contacts.forEach(c => {
    const src = c.lead_source || 'unspecified';
    counts.set(src, (counts.get(src) || 0) + 1);
  });

  const data: ContactSourcesResult = {
    chartData: Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    totalContacts: contacts.length,
  };

  return {
    toolName: 'get_contact_sources',
    data,
    evidence: [],
    explanation: `Distribution of ${contacts.length} contact(s) across ${data.chartData.length} acquisition source(s).`,
  };
}

export async function getInactiveContactsTool(
  gateway: CRMDataGateway,
  args: { days?: unknown; limit?: unknown },
  locale: 'en' | 'ar',
  now: Date = new Date()
): Promise<ToolExecutionPayload> {
  const days = clampLimit(args.days, 30);
  const limit = clampLimit(args.limit, 10);

  const [contacts, activities] = await Promise.all([gateway.contacts(), gateway.activities()]);

  const latestActivityMap = new Map<string, { time: number; dateStr: string }>();
  for (const a of activities) {
    if (!a.contact_id) continue;
    const time = new Date(a.occurred_at || a.created_at || 0).getTime();
    const existing = latestActivityMap.get(a.contact_id);
    if (!existing || time > existing.time) {
      latestActivityMap.set(a.contact_id, {
        time,
        dateStr: a.occurred_at || a.created_at || '',
      });
    }
  }

  const inactiveList = contacts
    .map(c => {
      const latest = latestActivityMap.get(c.id);
      const daysSince = latest ? Math.floor((now.getTime() - latest.time) / 86_400_000) : null;
      return {
        id: c.id,
        full_name: c.full_name,
        company: c.company ?? null,
        email: c.email ?? null,
        status: c.status ?? 'lead',
        lastActivityDate: latest?.dateStr ?? null,
        daysSinceLastActivity: daysSince,
        neverContacted: !latest,
      };
    })
    .filter(c => c.neverContacted || (c.daysSinceLastActivity !== null && c.daysSinceLastActivity >= days))
    .sort((a, b) => (b.daysSinceLastActivity ?? 9999) - (a.daysSinceLastActivity ?? 9999));

  const paged = inactiveList.slice(0, limit);

  const evidence: GroundedEvidence[] = paged.map(c => ({
    id: c.id,
    type: 'contact',
    title: c.full_name,
    subtitle: c.neverContacted
      ? (locale === 'ar' ? 'لم يسجل له أي تفاعل' : 'Never contacted')
      : (locale === 'ar' ? `آخر تفاعل قبل ${c.daysSinceLastActivity} يوم` : `Last activity ${c.daysSinceLastActivity}d ago`),
    route: '/contacts',
    snippet: `Status: ${(c.status || 'lead').toUpperCase()}`,
  }));

  const explanation =
    locale === 'ar'
      ? `تم العثور على ${inactiveList.length} جهة اتصال بدون تفاعل مسجل خلال آخر ${days} يوم.`
      : `Found ${inactiveList.length} contact(s) with no recorded interactions during the past ${days} days.`;

  return {
    toolName: 'get_inactive_contacts',
    data: paged,
    evidence,
    explanation,
  };
}

export async function getDealsNeedingAttentionTool(
  gateway: CRMDataGateway,
  args: { limit?: unknown },
  locale: 'en' | 'ar',
  now: Date = new Date(),
  tzOffsetMinutes: number = 0
): Promise<ToolExecutionPayload> {
  const limit = clampLimit(args.limit, 10);
  const [deals, tasks, activities] = await Promise.all([
    gateway.deals(),
    gateway.tasks(),
    gateway.activities(),
  ]);

  const openDeals = deals.filter(d => isOpenStage(d));

  const dealOverdueTasks = new Map<string, number>();
  for (const t of tasks) {
    if (!t.deal_id) continue;
    if (isTaskOverdueShared(t.due_date, t.status, now, tzOffsetMinutes)) {
      dealOverdueTasks.set(t.deal_id, (dealOverdueTasks.get(t.deal_id) || 0) + 1);
    }
  }

  const dealLatestActivity = new Map<string, number>();
  for (const a of activities) {
    if (!a.deal_id) continue;
    const time = new Date(a.occurred_at || a.created_at || 0).getTime();
    const curr = dealLatestActivity.get(a.deal_id) || 0;
    if (time > curr) dealLatestActivity.set(a.deal_id, time);
  }

  interface AttentionDeal {
    id: string;
    title: string;
    stage: string;
    value: number;
    formattedValue: string;
    expected_close_date: string | null;
    overdueTasksCount: number;
    daysSinceLastActivity: number | null;
    riskReasons: string[];
    riskScore: number;
  }

  const flagged: AttentionDeal[] = [];

  for (const d of openDeals) {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check 1: close date past
    if (d.expected_close_date) {
      const closeTime = new Date(d.expected_close_date).getTime();
      if (closeTime < now.getTime()) {
        const daysPast = Math.floor((now.getTime() - closeTime) / 86_400_000);
        reasons.push(
          locale === 'ar'
            ? `تاريخ الإغلاق المتوقع متأخر بـ ${daysPast} يوم`
            : `Expected close date passed by ${daysPast} day(s)`
        );
        riskScore += 30;
      }
    }

    // Check 2: overdue tasks
    const overdueCount = dealOverdueTasks.get(d.id) || 0;
    if (overdueCount > 0) {
      reasons.push(
        locale === 'ar'
          ? `توجد ${overdueCount} مهمة متأخرة مرتبطة بالصفقة`
          : `${overdueCount} overdue task(s) linked to deal`
      );
      riskScore += 25 * overdueCount;
    }

    // Check 3: stalled inactivity (> 14 days)
    const latestTime = dealLatestActivity.get(d.id);
    const dealCreatedTime = new Date(d.created_at || 0).getTime();
    const refTime = latestTime || dealCreatedTime;
    const daysSince = refTime ? Math.floor((now.getTime() - refTime) / 86_400_000) : null;
    if (daysSince !== null && daysSince >= 14) {
      reasons.push(
        locale === 'ar'
          ? `لا يوجد نشاط مسجل منذ ${daysSince} يوم`
          : `No recorded activity for ${daysSince} day(s)`
      );
      riskScore += 20;
    }

    if (reasons.length > 0) {
      flagged.push({
        id: d.id,
        title: d.title,
        stage: d.stage || 'new',
        value: toNumber(d.value),
        formattedValue: money(toNumber(d.value), d.currency || 'USD', locale),
        expected_close_date: d.expected_close_date ?? null,
        overdueTasksCount: overdueCount,
        daysSinceLastActivity: daysSince,
        riskReasons: reasons,
        riskScore,
      });
    }
  }

  flagged.sort((a, b) => b.riskScore - a.riskScore);
  const paged = flagged.slice(0, limit);

  const evidence: GroundedEvidence[] = paged.map(d => ({
    id: d.id,
    type: 'deal',
    title: d.title,
    subtitle: `${d.formattedValue} • ${d.riskReasons[0]}`,
    route: '/deals',
    snippet: `Stage: ${(d.stage || 'new').toUpperCase()}`,
  }));

  const explanation =
    locale === 'ar'
      ? `تم رصد ${flagged.length} صفقة مفتوحة تحتاج إلى تدخل ومتابعة فورية.`
      : `Identified ${flagged.length} open deal(s) requiring immediate attention or follow-up.`;

  return {
    toolName: 'get_deals_needing_attention',
    data: paged,
    evidence,
    explanation,
  };
}

// ------------------------------------------------------------------------------
// UNIFIED EXECUTOR
// ------------------------------------------------------------------------------
export type ToolArgs = Record<string, unknown>;

export async function executeSharedTool(
  toolName: ToolName,
  args: ToolArgs,
  ctx: ToolContext
): Promise<ToolExecutionPayload> {
  switch (toolName) {
    case 'search_contacts':
      return searchContactsTool(ctx.gateway, args, ctx.locale);
    case 'get_contact_summary':
      return getContactSummaryTool(ctx.gateway, args, ctx.locale);
    case 'get_deal_summary':
      return getDealSummaryTool(ctx.gateway, args, ctx.locale);
    case 'get_open_tasks':
      return getOpenTasksUnified(ctx.gateway, args, ctx.locale, ctx.now, ctx.tzOffsetMinutes);
    case 'get_overdue_tasks':
      return getOverdueTasksTool(ctx.gateway, args, ctx.locale, ctx.now, ctx.tzOffsetMinutes);
    case 'get_sales_metrics':
      return getSalesMetricsTool(ctx.gateway, ctx.locale, ctx.tzOffsetMinutes);
    case 'get_pipeline_breakdown':
      return getPipelineBreakdownTool(ctx.gateway, ctx.locale);
    case 'get_activity_timeline':
      return getActivityTimelineTool(ctx.gateway, args, ctx.locale);
    case 'get_won_deals_period':
      return getWonDealsPeriodTool(ctx.gateway, (String(args.period || 'this_month') as AnalyticsPeriod), ctx.locale, ctx.now);
    case 'get_overdue_tasks_by_assignee':
      return getOverdueTasksByAssigneeTool(ctx.gateway, ctx.locale, ctx.now, ctx.tzOffsetMinutes);
    case 'compare_pipeline_periods':
      return comparePipelinePeriodsTool(
        ctx.gateway,
        String(args.periodA || 'this_month') as AnalyticsPeriod,
        String(args.periodB || 'last_month') as AnalyticsPeriod,
        ctx.locale,
        ctx.now
      );
    case 'get_contact_sources':
      return getContactSourcesTool(ctx.gateway, ctx.locale);
    case 'get_inactive_contacts':
      return getInactiveContactsTool(ctx.gateway, args, ctx.locale, ctx.now);
    case 'get_deals_needing_attention':
      return getDealsNeedingAttentionTool(ctx.gateway, args, ctx.locale, ctx.now, ctx.tzOffsetMinutes);
    default: {
      const exhaustive: never = toolName;
      throw new Error(`Unsupported tool: ${exhaustive}`);
    }
  }
}

/** Sanity guard used by client + tests: only registered tools pass. */
export function isRegisteredTool(name: unknown): name is ToolName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(REGISTERED_TOOL_NAMES, name);
}

export const REGISTERED_TOOL_NAMES: Record<ToolName, true> = {
  search_contacts: true,
  get_contact_summary: true,
  get_deal_summary: true,
  get_open_tasks: true,
  get_overdue_tasks: true,
  get_sales_metrics: true,
  get_pipeline_breakdown: true,
  get_activity_timeline: true,
  get_won_deals_period: true,
  get_overdue_tasks_by_assignee: true,
  compare_pipeline_periods: true,
  get_contact_sources: true,
  get_inactive_contacts: true,
  get_deals_needing_attention: true,
};

