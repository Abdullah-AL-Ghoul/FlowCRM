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

  it('answers copilot questions with grounded CRM evidence in English', async () => {
    const res = await flowAIService.askCopilot({
      message: 'Which follow-ups are overdue?',
      workspaceId,
      locale: 'en',
    });

    expect(res.reply).toBeDefined();
    expect(res.toolUsed).toBe('get_overdue_tasks');
    expect(Array.isArray(res.evidence)).toBe(true);
    expect(res.engine).toBe('rules');
    expect(res.demoOffline).toBe(true);
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

  it('honestly refuses meeting extraction without a server provider instead of fabricating', async () => {
    const sampleNotes = `
Met with Sarah Jenkins from Acme. Discussed timeline and deliverables.
Agreed to send updated proposal by Tuesday.
Sarah to confirm budget allocation with finance.
Open question on SSO compliance.
    `.trim();

    const result = await flowAIService.analyzeMeetingNotes(sampleNotes, workspaceId, 'en');

    expect(result.executiveSummary).toBeDefined();
    expect(result.unavailableReason).toBeDefined();
    expect(result.proposedTasks).toHaveLength(0);
  });

  it('executes natural-language analytics for pipeline won deals', async () => {
    const result = await flowAIService.queryAnalytics('Show won deals', workspaceId, 'en', 'all_time');

    expect(result.matchedType).toBe('won_deals_period');
    expect(result.appliedFilters).toContain('stage = won');
    expect(result.periodDescription).toBeDefined();
  });

  it('executes natural-language analytics for acquisition sources', async () => {
    const result = await flowAIService.queryAnalytics('Customer acquisition sources', workspaceId, 'en');

    expect(result.matchedType).toBe('contact_sources');
    expect(result.chartType).toBe('pie');
    expect(result.chartData?.length ?? 0).toBeGreaterThan(0);
  });

  it('tracks demo usage locally without server quotas', async () => {
    const wsId = `ws-test-${Date.now()}`;
    const before = await flowAIService.getUsage(wsId);
    expect(before.requestsThisHour).toBe(0);
    expect(before.maxHourlyRequests).toBe(60);

    flowAIService.recordLocalDemoUsage(wsId);
    flowAIService.recordLocalDemoUsage(wsId, 120);

    const after = await flowAIService.getUsage(wsId);
    expect(after.requestsThisHour).toBe(2);
    expect(after.tokensUsedThisMonth).toBe(120);
  });

  it('streams copilot responses progressively with onInit and onChunk callbacks', async () => {
    let receivedInit: any = null;
    const chunks: string[] = [];

    const answer = await flowAIService.askCopilotStream(
      {
        message: 'Which follow-ups are overdue?',
        workspaceId,
        locale: 'en',
      },
      {
        onInit: init => {
          receivedInit = init;
        },
        onChunk: chunk => {
          chunks.push(chunk);
        },
      }
    );

    expect(receivedInit).not.toBeNull();
    expect(receivedInit.toolUsed).toBe('get_overdue_tasks');
    expect(chunks.length).toBeGreaterThan(0);
    expect(answer.reply).toBe(chunks.join(''));
    expect(answer.evidence.length).toBeGreaterThan(0);
  });

  it('analyzes contract text with safe boundary enforcement and risk clause flags', async () => {
    const agreement = `
      COMMERCIAL AGREEMENT
      Fee: $50,000 USD payable quarterly.
      Effective Date: 2026-04-01
      Expiration Date: 2027-03-31
      Client shall defend and indemnify FlowCRM against claims.
      Contract terminates for convenience upon 30 days notice.
    `;

    const result = await flowAIService.analyzeContract(agreement, workspaceId, 'en');

    expect(result.financialTerms.totalValue).toBe(50000);
    expect(result.financialTerms.currency).toBe('USD');
    expect(result.untrustedBoundaryEnforced).toBe(true);
    expect(result.riskClauses.length).toBeGreaterThanOrEqual(2);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });
});
