import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { DEMO_WORKSPACE_ID } from '../services/demoData';

describe('CRM Service Layer & Live Mock State', () => {
  beforeEach(() => {
    crmService.setDemoMode(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('loads the demo workspace with correct attributes', async () => {
    const ws = await crmService.getWorkspace(DEMO_WORKSPACE_ID);
    expect(ws).not.toBeNull();
    expect(ws?.name).toBe('Apex Global Ventures');
    expect(ws?.slug).toBe('apex-global');
  });

  it('returns all expanded contacts and supports client search filtering', async () => {
    const allContacts = await crmService.getContacts(DEMO_WORKSPACE_ID);
    expect(allContacts.length).toBeGreaterThanOrEqual(18);

    // Client-side search filtering by name
    const searchByName = allContacts.filter(c =>
      c.full_name.toLowerCase().includes('elena')
    );
    expect(searchByName.length).toBe(1);
    expect(searchByName[0].full_name).toBe('Elena Rostova');

    // Search by company
    const searchByCompany = allContacts.filter(c =>
      c.company?.toLowerCase().includes('fintech')
    );
    expect(searchByCompany.length).toBeGreaterThanOrEqual(1);
    expect(searchByCompany[0].company).toContain('Fintech');

    // Filter by customer status
    const customers = allContacts.filter(c => c.status === 'customer');
    expect(customers.length).toBeGreaterThan(0);
    customers.forEach(c => expect(c.status).toBe('customer'));
  });

  it('creates and deletes a new contact cleanly', async () => {
    const newContact = await crmService.createContact(DEMO_WORKSPACE_ID, {
      full_name: 'Test Executive User',
      email: 'test.exec@example.com',
      phone: '+1 555 019 2831',
      company: 'TestCorp Global',
      job_title: 'VP Operations',
      lead_source: 'website',
      status: 'lead',
      assigned_to: null,
      notes: 'Automated test record',
    });

    expect(newContact.id).toBeDefined();
    expect(newContact.full_name).toBe('Test Executive User');

    // Verify contact is in contacts list
    const allContacts = await crmService.getContacts(DEMO_WORKSPACE_ID);
    const found = allContacts.find(c => c.id === newContact.id);
    expect(found).toBeDefined();
    expect(found?.email).toBe('test.exec@example.com');

    // Delete contact
    await crmService.deleteContact(newContact.id);
    const afterDelete = await crmService.getContacts(DEMO_WORKSPACE_ID);
    expect(afterDelete.find(c => c.id === newContact.id)).toBeUndefined();
  });

  it('manages deals, moves deal stages, and updates pipeline state', async () => {
    const allDeals = await crmService.getDeals(DEMO_WORKSPACE_ID);
    expect(allDeals.length).toBeGreaterThanOrEqual(18);

    // Check all 6 stages exist in the dataset
    const stages = new Set(allDeals.map(d => d.stage));
    expect(stages.has('new')).toBe(true);
    expect(stages.has('qualified')).toBe(true);
    expect(stages.has('proposal')).toBe(true);
    expect(stages.has('negotiation')).toBe(true);
    expect(stages.has('won')).toBe(true);
    expect(stages.has('lost')).toBe(true);

    // Move first deal to a different stage
    const targetDeal = allDeals[0];
    const originalStage = targetDeal.stage;
    const nextStage = originalStage === 'won' ? 'negotiation' : 'won';

    const updated = await crmService.updateDealStage(targetDeal.id, nextStage);
    expect(updated.stage).toBe(nextStage);

    // Verify change is persisted in list
    const freshDeals = await crmService.getDeals(DEMO_WORKSPACE_ID);
    const reFetched = freshDeals.find(d => d.id === targetDeal.id);
    expect(reFetched?.stage).toBe(nextStage);
  });

  it('retrieves and filters tasks across statuses and updates completion', async () => {
    const allTasks = await crmService.getTasks(DEMO_WORKSPACE_ID);
    expect(allTasks.length).toBeGreaterThanOrEqual(14);

    // Filter by completed status
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    expect(completedTasks.length).toBeGreaterThan(0);
    completedTasks.forEach(t => expect(t.status).toBe('completed'));

    // Toggle a task status
    const pendingTask = allTasks.find(t => t.status === 'pending');
    expect(pendingTask).toBeDefined();
    if (pendingTask) {
      const updated = await crmService.toggleTaskStatus(pendingTask.id, pendingTask.status);
      expect(updated.status).toBe('completed');
    }
  });

  it('records activities and computes timeline records', async () => {
    const activities = await crmService.getActivities(DEMO_WORKSPACE_ID);
    expect(activities.length).toBeGreaterThanOrEqual(16);

    // Create a new activity
    const newAct = await crmService.createActivity(DEMO_WORKSPACE_ID, {
      type: 'call',
      description: 'Follow-up call with prospective client regarding Q4 roadmap.',
      contact_id: null,
      deal_id: null,
      user_id: null,
      occurred_at: new Date().toISOString(),
    });

    expect(newAct.id).toBeDefined();
    expect(newAct.type).toBe('call');

    const updatedActivities = await crmService.getActivities(DEMO_WORKSPACE_ID);
    expect(updatedActivities[0].id).toBe(newAct.id); // Latest activity is first
  });

  it('accurately computes dashboard metrics', async () => {
    const metrics = await crmService.getDashboardMetrics(DEMO_WORKSPACE_ID);

    expect(metrics.totalContacts).toBeGreaterThanOrEqual(18);
    expect(metrics.activeDealsCount).toBeGreaterThan(0);
    expect(metrics.openPipelineValue).toBeGreaterThan(0);
    expect(metrics.wonDealsCount).toBeGreaterThan(0);
    expect(metrics.wonDealsValue).toBeGreaterThan(0);
    expect(metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeLessThanOrEqual(100);
    expect(metrics.tasksDueToday).toBeGreaterThan(0);
    expect(metrics.tasksOverdue).toBeGreaterThan(0);
  });
});
