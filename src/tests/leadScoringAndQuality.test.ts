import { describe, it, expect } from 'vitest';
import { LeadScoringService } from '../features/ai/services/leadScoringService';
import { DataQualityService } from '../features/ai/services/dataQualityService';
import { Contact, Deal, Task, Activity } from '../types/crm.types';

describe('Lead Scoring & Data Quality Services', () => {
  const baseContact: Contact = {
    id: 'contact-test-1',
    workspace_id: 'ws-1',
    full_name: 'Test Prospect',
    email: 'prospect@test.com',
    phone: '+1 555-0100',
    company: 'Acme Corp',
    job_title: 'VP Engineering',
    status: 'lead',
    lead_source: 'website',
    assigned_to: null,
    notes: 'Inquired about enterprise plan.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('calculates hot score for complete profile with advanced deal and interactions', () => {
    const deals: Deal[] = [
      {
        id: 'deal-1',
        workspace_id: 'ws-1',
        title: 'Enterprise Contract',
        value: 50000,
        currency: 'USD',
        stage: 'proposal',
        expected_close_date: '2026-12-31',
        assigned_to: null,
        contact_id: baseContact.id,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const activities: Activity[] = [
      {
        id: 'act-1',
        workspace_id: 'ws-1',
        type: 'meeting',
        description: 'Discovery call completed',
        contact_id: baseContact.id,
        deal_id: 'deal-1',
        user_id: null,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'act-2',
        workspace_id: 'ws-1',
        type: 'email',
        description: 'Sent pricing proposal',
        contact_id: baseContact.id,
        deal_id: 'deal-1',
        user_id: null,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const tasks: Task[] = [];

    const score = LeadScoringService.calculateLeadScore(baseContact, deals, tasks, activities, 'en');

    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(score.tier).toBe('hot');
    expect(score.isRuleBased).toBe(true);
    expect(score.factors).toHaveLength(4);
  });

  it('calculates cold score for sparse contact with no deals or activities', () => {
    const sparseContact: Contact = {
      ...baseContact,
      email: null,
      phone: null,
      company: null,
      job_title: null,
    };

    const score = LeadScoringService.calculateLeadScore(sparseContact, [], [], [], 'en');

    expect(score.totalScore).toBeLessThan(40);
    expect(score.tier).toBe('cold');
  });

  it('detects duplicate contacts by identical email address', () => {
    const contacts: Contact[] = [
      baseContact,
      {
        ...baseContact,
        id: 'contact-test-2',
        full_name: 'Test Prospect Duplicate',
        email: 'prospect@test.com', // same email
      },
    ];

    const issues = DataQualityService.auditWorkspace(contacts, [], 'en');
    const duplicateIssue = issues.find(i => i.type === 'duplicate_contact');

    expect(duplicateIssue).toBeDefined();
    expect(duplicateIssue?.severity).toBe('high');
    expect(duplicateIssue?.affectedRecords).toHaveLength(2);
  });

  it('detects contacts missing both email and phone number', () => {
    const contacts: Contact[] = [
      {
        ...baseContact,
        id: 'contact-no-channel',
        email: null,
        phone: null,
      },
    ];

    const issues = DataQualityService.auditWorkspace(contacts, [], 'en');
    const missingChannel = issues.find(i => i.type === 'missing_email_phone');

    expect(missingChannel).toBeDefined();
    expect(missingChannel?.severity).toBe('medium');
  });

  it('detects stagnant deals lacking primary contact', () => {
    const deals: Deal[] = [
      {
        id: 'orphan-deal',
        workspace_id: 'ws-1',
        title: 'Unlinked Opportunity',
        value: 12000,
        currency: 'USD',
        stage: 'negotiation',
        expected_close_date: '2026-11-01',
        contact_id: null, // missing contact
        assigned_to: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const issues = DataQualityService.auditWorkspace([], deals, 'en');
    const stagnantIssue = issues.find(i => i.type === 'stagnant_deal');

    expect(stagnantIssue).toBeDefined();
    expect(stagnantIssue?.affectedRecords[0].title).toBe('Unlinked Opportunity');
  });
});
