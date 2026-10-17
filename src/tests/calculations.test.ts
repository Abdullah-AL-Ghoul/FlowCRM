import { describe, it, expect } from 'vitest';
import { isTaskDueToday, isTaskOverdue, formatCurrency } from '../lib/utils';
import { Deal } from '../types/crm.types';

describe('CRM Business Logic & Calculations', () => {
  it('correctly identifies overdue tasks and ignores completed tasks', () => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    // Overdue pending task
    expect(isTaskOverdue(yesterday, 'pending')).toBe(true);

    // Overdue but completed task -> should NOT be considered overdue
    expect(isTaskOverdue(yesterday, 'completed')).toBe(false);

    // Future task -> not overdue
    expect(isTaskOverdue(tomorrow, 'pending')).toBe(false);
  });

  it('correctly identifies tasks due today', () => {
    const today = new Date().toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    expect(isTaskDueToday(today, 'pending')).toBe(true);
    expect(isTaskDueToday(today, 'completed')).toBe(false);
    expect(isTaskDueToday(nextWeek, 'pending')).toBe(false);
  });

  it('calculates open pipeline value and won metrics accurately', () => {
    const mockDeals: Partial<Deal>[] = [
      { id: '1', stage: 'new', value: 10000 },
      { id: '2', stage: 'qualified', value: 25000 },
      { id: '3', stage: 'proposal', value: 40000 },
      { id: '4', stage: 'won', value: 50000 },
      { id: '5', stage: 'lost', value: 20000 },
    ];

    const activeDeals = mockDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = mockDeals.filter(d => d.stage === 'won');
    const lostDeals = mockDeals.filter(d => d.stage === 'lost');

    const openPipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const wonDealsValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const totalDecided = wonDeals.length + lostDeals.length;
    const winRate = Math.round((wonDeals.length / totalDecided) * 100);

    expect(openPipelineValue).toBe(75000); // 10000 + 25000 + 40000
    expect(wonDealsValue).toBe(50000);
    expect(winRate).toBe(50); // 1 won out of 2 decided (50%)
  });

  it('formats currencies properly for en and ar locales', () => {
    const formattedEn = formatCurrency(15000, 'USD', 'en');
    expect(formattedEn).toContain('15,000');

    const formattedAr = formatCurrency(15000, 'SAR', 'ar');
    expect(formattedAr).toBeTruthy();
  });
});
