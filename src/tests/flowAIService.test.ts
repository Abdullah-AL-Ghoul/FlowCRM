import { describe, it, expect, beforeEach } from 'vitest';
import { flowAIService } from '../features/ai/services/flowAIService';
import { crmService } from '../services/crmService';
import { DEMO_WORKSPACE_ID } from '../services/demoData';

describe('FlowAIService Core Orchestrator', () => {
  const workspaceId = DEMO_WORKSPACE_ID;

  beforeEach(() => {
    crmService.setDemoMode(true);
    crmService.resetDemoData();
  });

  it('initializes with active provider information', () => {
    const providers = flowAIService.getAvailableProviders();
    expect(providers.length).toBeGreaterThanOrEqual(3);

    const active = flowAIService.getActiveAdapter();
    expect(active.id).toBeDefined();
  });

  it('answers copilot questions with grounded CRM evidence in English', async () => {
    const res = await flowAIService.askCopilot({
      message: 'Which follow-ups are overdue?',
      workspaceId,
      locale: 'en',
    });

    expect(res.reply).toBeDefined();
    expect(res.toolUsed).toBe('get_overdue_tasks');
    expect(Array.isArray(res.evidence)).toBe(true);
  });

  it('answers copilot questions in Arabic with appropriate Arabic terminology', async () => {
    const res = await flowAIService.askCopilot({
      message: 'ما هي مؤشرات أداء المبيعات الحالية؟',
      workspaceId,
      locale: 'ar',
    });

    expect(res.reply).toBeDefined();
    expect(res.reply).toMatch(/[\u0600-\u06FF]/); // Arabic unicode check
    expect(res.toolUsed).toBe('get_sales_metrics');
    expect(res.evidence.length).toBeGreaterThan(0);
  });

  it('generates a personalized sales draft with missing placeholder warnings', async () => {
    const contacts = await crmService.getContacts(workspaceId);
    const deals = await crmService.getDeals(workspaceId);

    const draft = await flowAIService.generateSalesDraft(
      {
        channel: 'email',
        goal: 'Follow-up regarding proposal',
        tone: 'professional',
        length: 'balanced',
        language: 'en',
        contact: contacts[0],
        deal: deals[0],
      },
      workspaceId
    );

    expect(draft.body).toBeDefined();
    expect(draft.body.length).toBeGreaterThan(20);
    expect(Array.isArray(draft.detectedMissingFields)).toBe(true);
    expect(draft.evidence.length).toBeGreaterThan(0);
  });

  it('analyzes contact details and highlights missing data', async () => {
    const contacts = await crmService.getContacts(workspaceId);
    const intel = await flowAIService.analyzeContact(contacts[0], workspaceId, 'en');

    expect(intel.summary).toBeDefined();
    expect(Array.isArray(intel.suggestedQuestions)).toBe(true);
    expect(Array.isArray(intel.recommendedNextSteps)).toBe(true);
    expect(intel.evidence[0].id).toBe(contacts[0].id);
  });

  it('analyzes deal and generates rule-based risk signals', async () => {
    const deals = await crmService.getDeals(workspaceId);
    const intel = await flowAIService.analyzeDeal(deals[0], workspaceId, 'en');

    expect(intel.dealSummary).toBeDefined();
    expect(Array.isArray(intel.riskSignals)).toBe(true);
    expect(intel.riskSignals.every(r => r.isRuleBased)).toBe(true);
    expect(intel.recommendedNextAction).toBeDefined();
  });

  it('analyzes meeting notes and extracts structured action items', async () => {
    const sampleNotes = `
Met with Sarah Jenkins from Acme. Discussed timeline and deliverables.
Agreed to send updated proposal by Tuesday.
Sarah to confirm budget allocation with finance.
Open question on SSO compliance.
    `.trim();

    const result = await flowAIService.analyzeMeetingNotes(sampleNotes, workspaceId, 'en');

    expect(result.executiveSummary).toBeDefined();
    expect(Array.isArray(result.proposedTasks)).toBe(true);
    expect(result.proposedTasks.length).toBeGreaterThan(0);
    expect(result.proposedTasks[0].title).toBeDefined();
  });

  it('executes natural-language analytics for pipeline won deals', async () => {
    const result = await flowAIService.queryAnalytics('Show won deals', workspaceId, 'en');

    expect(result.matchedType).toBe('won_deals_period');
    expect(result.kpiHighlight).toBeDefined();
    expect(result.appliedFilters).toContain('stage = won');
  });

  it('executes natural-language analytics for acquisition sources', async () => {
    const result = await flowAIService.queryAnalytics('Customer acquisition sources', workspaceId, 'en');

    expect(result.matchedType).toBe('contact_sources');
    expect(result.chartType).toBe('pie');
    expect(result.chartData?.length).toBeGreaterThan(0);
  });
});
