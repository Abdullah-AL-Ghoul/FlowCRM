import { describe, it, expect, beforeEach } from 'vitest';
import { CRMToolRegistry } from '../features/ai/services/toolRegistry';
import { crmService } from '../services/crmService';
import { DEMO_WORKSPACE_ID } from '../services/demoData';

const dataOf = <T,>(r: { data: unknown }): T => r.data as T;

describe('FlowAI Tool Registry (CRMToolRegistry over shared tools)', () => {
  const workspaceId = DEMO_WORKSPACE_ID;

  beforeEach(() => {
    crmService.setDemoMode(true);
    crmService.resetDemoData();
  });

  it('rejects tool execution when workspaceId is missing', async () => {
    await expect(
      CRMToolRegistry.executeTool('get_sales_metrics', {}, '')
    ).rejects.toThrow(/Workspace ID is required/i);
  });

  it('searches authorized contacts and returns evidence', async () => {
    const result = await CRMToolRegistry.executeTool(
      'search_contacts',
      { query: 'Elena', limit: 5 },
      workspaceId,
      'en'
    );

    const data = dataOf<Array<{ full_name: string }>>(result);
    expect(result.toolName).toBe('search_contacts');
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].full_name).toContain('Elena');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].type).toBe('contact');
    expect(result.evidence[0].route.startsWith('/contacts')).toBe(true);
  });

  it('retrieves authorized contact summary with linked deals and tasks', async () => {
    const contacts = await crmService.getContacts(workspaceId);
    const target = contacts[0];

    const result = await CRMToolRegistry.executeTool(
      'get_contact_summary',
      { contactId: target.id },
      workspaceId,
      'en'
    );

    const data = dataOf<{
      contact: { id: string; full_name: string };
      deals: unknown[];
      pendingTasks: unknown[];
    }>(result);

    expect(data).not.toBeNull();
    expect(data.contact.id).toBe(target.id);
    expect(data.contact.full_name).toBe(target.full_name);
    expect(Array.isArray(data.deals)).toBe(true);
    expect(Array.isArray(data.pendingTasks)).toBe(true);
  });

  it('reports missing data when contact does not exist', async () => {
    const result = await CRMToolRegistry.executeTool(
      'get_contact_summary',
      { contactId: 'non-existent-contact-id' },
      workspaceId,
      'en'
    );

    expect(result.data).toBeNull();
    expect(result.explanation).toContain('does not exist');
    expect(result.evidence).toHaveLength(0);
  });

  it('retrieves authorized deal summary with evidence', async () => {
    const deals = await crmService.getDeals(workspaceId);
    const targetDeal = deals[0];

    const result = await CRMToolRegistry.executeTool(
      'get_deal_summary',
      { dealId: targetDeal.id },
      workspaceId,
      'en'
    );

    const data = dataOf<{ id: string; title: string }>(result);
    expect(data.id).toBe(targetDeal.id);
    expect(data.title).toBe(targetDeal.title);
    expect(result.evidence[0].type).toBe('deal');
  });

  it('retrieves overdue and open tasks accurately', async () => {
    const openTasksResult = await CRMToolRegistry.executeTool(
      'get_open_tasks',
      { limit: 10 },
      workspaceId,
      'en'
    );
    expect(Array.isArray(dataOf<unknown[]>(openTasksResult))).toBe(true);

    const overdueResult = await CRMToolRegistry.executeTool(
      'get_overdue_tasks',
      { limit: 10 },
      workspaceId,
      'en'
    );
    expect(Array.isArray(dataOf<unknown[]>(overdueResult))).toBe(true);
  });

  it('retrieves authoritative workspace sales metrics', async () => {
    const metricsResult = await CRMToolRegistry.executeTool(
      'get_sales_metrics',
      {},
      workspaceId,
      'en'
    );

    const data = dataOf<{
      totalContacts: number;
      openPipelineValue: number;
      winRate: number;
    }>(metricsResult);

    expect(data.totalContacts).toBeGreaterThan(0);
    expect(typeof data.openPipelineValue).toBe('number');
    expect(typeof data.winRate).toBe('number');
    expect(metricsResult.evidence.length).toBeGreaterThan(0);
  });

  it('retrieves pipeline breakdown by stage', async () => {
    const breakdown = await CRMToolRegistry.executeTool(
      'get_pipeline_breakdown',
      {},
      workspaceId,
      'en'
    );

    const data = dataOf<Array<{ stage: string; count: number; totalValue: number }>>(breakdown);
    expect(data.length).toBe(6); // all 6 stages
    const stages = data.map(d => d.stage);
    expect(stages).toContain('new');
    expect(stages).toContain('won');
    expect(stages).toContain('lost');
  });

  it('retrieves inactive contacts with no recent interactions', async () => {
    const res = await CRMToolRegistry.executeTool(
      'get_inactive_contacts',
      { days: 1 },
      workspaceId,
      'en'
    );

    const data = dataOf<Array<{ id: string; full_name: string; daysSinceLastActivity: number | null }>>(res);
    expect(res.toolName).toBe('get_inactive_contacts');
    expect(Array.isArray(data)).toBe(true);
    expect(res.evidence.length).toBeGreaterThan(0);
    expect(res.evidence[0].route).toBe('/contacts');
  });

  it('retrieves open deals needing attention due to close date or inactivity', async () => {
    const res = await CRMToolRegistry.executeTool(
      'get_deals_needing_attention',
      { limit: 5 },
      workspaceId,
      'en'
    );

    const data = dataOf<Array<{ id: string; title: string; riskReasons: string[] }>>(res);
    expect(res.toolName).toBe('get_deals_needing_attention');
    expect(Array.isArray(data)).toBe(true);
    expect(res.explanation).toBeDefined();
  });
});
