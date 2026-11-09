// ==============================================================================
// FlowAI Shared Rate Limiter — server-authoritative quota enforcement.
// Default limits mirror the documented deployment configuration. Values may be
// overridden via edge secrets (FLOWAI_HOURLY_REQUEST_LIMIT /
// FLOWAI_MONTHLY_TOKEN_LIMIT). The RPC layer (consume_flowai_quota /
// record_flowai_usage) is SECURITY DEFINER and only executable by the
// service role — clients cannot forge usage.
// ==============================================================================

export const DEFAULT_HOURLY_REQUEST_LIMIT = 60;
export const DEFAULT_MONTHLY_TOKEN_LIMIT = 200_000;
export const HOURLY_REQUEST_LIMIT_MIN = 10;
export const HOURLY_REQUEST_LIMIT_MAX = 5_000;
export const MONTHLY_TOKEN_LIMIT_MIN = 10_000;
export const MONTHLY_TOKEN_LIMIT_MAX = 50_000_000;

export interface QuotaCheckResult {
  allowed: boolean;
  requestsThisHour: number;
  tokensThisMonth: number;
  hourlyRequestLimit: number;
  monthlyTokenLimit: number;
}

/** Bounded integer parser for env overrides. */
function parseLimit(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function resolveQuotaLimits(env: { get(key: string): string | undefined }): {
  hourlyRequestLimit: number;
  monthlyTokenLimit: number;
} {
  return {
    hourlyRequestLimit: parseLimit(env.get('FLOWAI_HOURLY_REQUEST_LIMIT'), HOURLY_REQUEST_LIMIT_MIN, HOURLY_REQUEST_LIMIT_MAX, DEFAULT_HOURLY_REQUEST_LIMIT),
    monthlyTokenLimit: parseLimit(env.get('FLOWAI_MONTHLY_TOKEN_LIMIT'), MONTHLY_TOKEN_LIMIT_MIN, MONTHLY_TOKEN_LIMIT_MAX, DEFAULT_MONTHLY_TOKEN_LIMIT),
  };
}

/** Raises an exhaustive, user-safe message for a rejected quota check. */
export function quotaErrorMessage(ar: boolean, limit: QuotaCheckResult): string {
  const tokensRemaining = Math.max(0, limit.monthlyTokenLimit - limit.tokensThisMonth);
  if (tokensRemaining <= 0) {
    return ar
      ? 'تم استهلاك حصة التوكنات الشهرية لمساحة العمل. يُرجى إعادة المحاولة في الشهر القادم أو رفع الحد من إعدادات المنصة.'
      : 'This workspace has exhausted its monthly token quota. Retry next month or raise the limit in platform settings.';
  }
  return ar
    ? 'تم الوصول إلى الحد الأقصى من طلبات الذكاء الاصطناعي لهذا الوقت ({h}). يُرجى إعادة المحاولة لاحقًا.'
        .replace('{h}', String(limit.hourlyRequestLimit))
    : `Rate limit reached: maximum ${limit.hourlyRequestLimit} AI requests per hour for this workspace. Please try again shortly.`;
}

/** Cost estimation hook — intentionally conservative, provider-pricing based. */
export const APPROX_COST_PER_TOKEN_USD = 0.00000015; // ≈ $0.15 per 1M blended tokens

export function estimateCostUsd(tokens: number): number {
  return tokens * APPROX_COST_PER_TOKEN_USD;
}
