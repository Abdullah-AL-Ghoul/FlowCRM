import { describe, it, expect, beforeEach } from 'vitest';
import { CRMToolRegistry } from '../features/ai/services/toolRegistry';
import { crmService } from '../services/crmService';
import { DEMO_WORKSPACE_ID } from '../services/demoData';

describe('FlowAI Tool Registry (CRMToolRegistry)', () => {
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

    expect(result.toolName).toBe('search_contacts');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].full_name).toContain('Elena');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].type).toBe('contact');
    expect(result.evidence[0].route).toContain('/contacts?id=');
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

    expect(result.data).toBeDefined();
    expect(result.data.contact.id).toBe(target.id);
    expect(result.data.contact.full_name).toBe(target.full_name);
    expect(Array.isArray(result.data.deals)).toBe(true);
    expect(Array.isArray(result.data.pendingTasks)).toBe(true);
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

    expect(result.data.id).toBe(targetDeal.id);
    expect(result.data.title).toBe(targetDeal.title);
    expect(result.evidence[0].type).toBe('deal');
  });

  it('retrieves overdue and open tasks accurately', async () => {
    const openTasksResult = await CRMToolRegistry.executeTool(
      'get_open_tasks',
      { limit: 10 },
      workspaceId,
      'en'
    );
    expect(Array.isArray(openTasksResult.data)).toBe(true);

    const overdueResult = await CRMToolRegistry.executeTool(
      'get_overdue_tasks',
      { limit: 10 },
      workspaceId,
      'en'
    );
    expect(Array.isArray(overdueResult.data)).toBe(true);
  });

  it('retrieves authoritative workspace sales metrics', async () => {
    const metricsResult = await CRMToolRegistry.executeTool(
      'get_sales_metrics',
      {},
      workspaceId,
      'en'
    );

    expect(metricsResult.data.totalContacts).toBeGreaterThan(0);
    expect(typeof metricsResult.data.openPipelineValue).toBe('number');
    expect(typeof metricsResult.data.winRate).toBe('number');
    expect(metricsResult.evidence.length).toBeGreaterThan(0);
  });

  it('retrieves pipeline breakdown by stage', async () => {
    const breakdown = await CRMToolRegistry.executeTool(
      'get_pipeline_breakdown',
      {},
      workspaceId,
      'en'
    );

    expect(breakdown.data.length).toBe(6); // all 6 stages
    const stages = breakdown.data.map((d: any) => d.stage);
    expect(stages).toContain('new');
    expect(stages).toContain('won');
    expect(stages).toContain('lost');
  });
});
