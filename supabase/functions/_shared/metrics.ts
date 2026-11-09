// ==============================================================================
// FlowAI Shared Metrics — authoritative sales metric formulas.
// Imported by BOTH the Vite client (dashboard / reports / demo analytics) and
// the FlowAI edge function (tools / natural-language analytics) so the two can
// never silently contradict each other. Pure module, no runtime dependencies.
// ==============================================================================

import {
  SharedContactRow,
  SharedDealRow,
  SharedTaskRow,
  PipelineRowResult,
  MetricsResult,
} from './types.ts';

export const DEAL_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export type DealStageLiteral = (typeof DEAL_STAGES)[number];

export const OPEN_DEAL_STAGES: DealStageLiteral[] = ['new', 'qualified', 'proposal', 'negotiation'];
export const CLOSED_STAGES: DealStageLiteral[] = ['won', 'lost'];

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function isOpenDeal(deal: SharedDealRow): boolean {
  return deal.stage !== 'won' && deal.stage !== 'lost';
}

// ------------------------------------------------------------------------------
// LOCAL-DAY HELPERS (timezone-aware so client & server agree on "today")
// ------------------------------------------------------------------------------
/**
 * Shifts an instant so that UTC boundaries match the user's local calendar day.
 * `tzOffsetMinutes` is JS `Date#getTimezoneOffset()` semantics
 * (UTC+2 => -120).
 */
/**
 * Returns the START of the user's local calendar day as a real UTC instant.
 * Strategy: shift the instant into "fake local" coordinates, floor to the day
 * boundary, then shift back by the same offset.
 * `tzOffsetMinutes` is JS `Date#getTimezoneOffset()` semantics
 * (UTC+2 => -120).
 */
export function dayStartInUserTz(now: Date, tzOffsetMinutes: number = 0): Date {
  const shifted = now.getTime() - tzOffsetMinutes * 60_000;
  const floored =
    shifted - (((shifted % 86_400_000) + 86_400_000) % 86_400_000);
  return new Date(floored + tzOffsetMinutes * 60_000);
}

export function isTaskOverdueShared(dueDate: string | null | undefined, status: string | null | undefined, now: Date, tzOffsetMinutes = 0): boolean {
  if (!dueDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  // Day-granularity semantics: a task is overdue once its LOCAL due day has
  // fully passed. A task due later TODAY is not overdue (it is "due today").
  const dueDayStart = dayStartInUserTz(due, tzOffsetMinutes).getTime();
  const todayStart = dayStartInUserTz(now, tzOffsetMinutes).getTime();
  return dueDayStart < todayStart;
}

export function isTaskDueTodayShared(dueDate: string | null | undefined, status: string | null | undefined, now: Date, tzOffsetMinutes = 0): boolean {
  if (!dueDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const dueDayStart = dayStartInUserTz(due, tzOffsetMinutes).getTime();
  const todayStart = dayStartInUserTz(now, tzOffsetMinutes).getTime();
  return dueDayStart === todayStart;
}

// ------------------------------------------------------------------------------
// AUTHORITATIVE KPI CALCULATION
// ------------------------------------------------------------------------------
export interface DashboardMetricsInput {
  contacts: SharedContactRow[] | unknown[];
  deals: SharedDealRow[];
  tasks: SharedTaskRow[];
  now?: Date;
  tzOffsetMinutes?: number;
  currency?: string;
  locale?: 'en' | 'ar';
}

export function computeDashboardMetrics(input: DashboardMetricsInput): MetricsResult {
  const now = input.now ?? new Date();
  const tz = input.tzOffsetMinutes ?? 0;
  const deals = input.deals;
  const tasks = input.tasks as SharedTaskRow[];
  const currency = input.currency ?? 'USD';
  const locale = input.locale ?? 'en';

  const activeDeals = deals.filter(isOpenDeal);
  const wonDeals = deals.filter(d => d.stage === 'won');
  const lostDeals = deals.filter(d => d.stage === 'lost');

  const openPipelineValue = activeDeals.reduce((sum, d) => sum + toNumber(d.value), 0);
  const wonDealsValue = wonDeals.reduce((sum, d) => sum + toNumber(d.value), 0);

  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;

  const tasksDueToday = tasks.filter(t => isTaskDueTodayShared(t.due_date, t.status, now, tz)).length;
  const tasksOverdue = tasks.filter(t => isTaskOverdueShared(t.due_date, t.status, now, tz)).length;

  return {
    totalContacts: (input.contacts as unknown[]).length,
    activeDealsCount: activeDeals.length,
    openPipelineValue,
    wonDealsCount: wonDeals.length,
    wonDealsValue,
    winRate,
    tasksDueToday,
    tasksOverdue,
    formattedOpenPipelineValue: formatMoneyShared(openPipelineValue, currency, locale),
    formattedWonDealsValue: formatMoneyShared(wonDealsValue, currency, locale),
  };
}

export function computePipelineStageBreakdown(
  deals: SharedDealRow[],
  currency = 'USD',
  locale: 'en' | 'ar' = 'en'
): PipelineRowResult[] {
  return DEAL_STAGES.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage);
    const totalValue = stageDeals.reduce((sum, d) => sum + toNumber(d.value), 0);
    return {
      stage,
      count: stageDeals.length,
      totalValue,
      formattedValue: formatMoneyShared(totalValue, currency, locale),
    };
  });
}

// ------------------------------------------------------------------------------
// PERIOD WINDOWS (for analytics tools)
// ------------------------------------------------------------------------------
export interface PeriodWindow {
  /** Inclusive ISO timestamp or null for "all time". */
  start: string | null;
  /** Inclusive upper bound (nullable). */
  end: string | null;
  label: string;
}

export const ANALYTICS_PERIOD_LABELS_EN: Record<string, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  this_quarter: 'This quarter',
  all_time: 'All time',
};

export const ANALYTICS_PERIOD_LABELS_AR: Record<string, string> = {
  this_month: 'هذا الشهر',
  last_month: 'الشهر الماضي',
  this_quarter: 'هذا الربع',
  all_time: 'كل الفترات',
};

export function resolvePeriodWindow(period: string, now: Date = new Date()): PeriodWindow {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based

  switch (period) {
    case 'this_month': {
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 1));
      return { start: start.toISOString(), end: end.toISOString(), label: ANALYTICS_PERIOD_LABELS_EN[period] };
    }
    case 'last_month': {
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 1));
      return { start: start.toISOString(), end: end.toISOString(), label: ANALYTICS_PERIOD_LABELS_EN[period] };
    }
    case 'this_quarter': {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(Date.UTC(y, qStartMonth, 1));
      const end = new Date(Date.UTC(y, qStartMonth + 3, 1));
      return { start: start.toISOString(), end: end.toISOString(), label: ANALYTICS_PERIOD_LABELS_EN[period] };
    }
    case 'all_time':
    default:
      return { start: null, end: null, label: ANALYTICS_PERIOD_LABELS_EN.all_time };
  }
}

export function isTimestampInWindow(timestamp: string | null | undefined, window: PeriodWindow): boolean {
  if (!timestamp) return window.start === null;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (window.start && t < new Date(window.start).getTime()) return false;
  if (window.end && t >= new Date(window.end).getTime()) return false;
  return true;
}

// ------------------------------------------------------------------------------
// LIGHTWEIGHT MONEY/DATE FORMATTERS (shared runtimes; no Intl dependency)
// ------------------------------------------------------------------------------
export function formatMoneyShared(amount: number, currency = 'USD', locale: 'en' | 'ar' = 'en'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'SAR' ? 'SAR ' : currency === 'AED' ? 'AED ' : `${currency} `;
  const abs = Math.abs(amount);
  const rounded = abs >= 1000 ? Math.round(amount).toLocaleString('en-US') : amount.toFixed(2).replace(/\.00$/, '');
  if (locale === 'ar') {
    return `${symbol}${rounded}`;
  }
  return `${symbol}${rounded}`;
}

export function formatDateShared(iso: string | null | undefined, locale: 'en' | 'ar' = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  if (locale === 'ar') {
    return `${dd}/${mm}/${yyyy}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}
