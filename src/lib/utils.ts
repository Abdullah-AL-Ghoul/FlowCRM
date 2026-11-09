import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isTaskOverdueShared, isTaskDueTodayShared } from '../../supabase/functions/_shared/metrics';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function formatDate(dateString: string | null | undefined, locale: string = 'en'): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined, locale: string = 'en'): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

// Single source of truth: the shared cross-runtime metrics module (also used
// by the FlowAI edge function), evaluated in the browser's own timezone.
export function isTaskOverdue(dueDateString: string, status: string): boolean {
  const now = new Date();
  return isTaskOverdueShared(dueDateString, status, now, now.getTimezoneOffset());
}

export function isTaskDueToday(dueDateString: string, status: string): boolean {
  const now = new Date();
  return isTaskDueTodayShared(dueDateString, status, now, now.getTimezoneOffset());
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
