// ==============================================================================
// FlowAI Shared CRM Data Gateway.
//
// The gateway is the ONLY way AI actions may touch CRM rows. It is backed by a
// Supabase client holding the END USER's JWT (so RLS is enforced on every
// query) in the edge function, and by crmService/local data in demo mode.
// Per-request lazy caching keeps multi-table tools to one query per table.
// ==============================================================================

import {
  SharedActivityRow,
  SharedContactRow,
  SharedDealRow,
  SharedTaskRow,
  SharedWorkspaceMemberRow,
} from './types.ts';

export interface TableFetcher {
  /** Fetches rows of `table` restricted to the given workspace via RLS. */
  fetchWorkspaceRows<T = unknown>(table: string, select: string, workspaceId: string): Promise<T[]>;
}

export class GatewayError extends Error {
  constructor(message: string, readonly code: 'upstream_error' | 'unauthorized' = 'upstream_error') {
    super(message);
  }
}

const CONTACT_SELECT = '*,assignee:profiles!assigned_to(id,full_name)';
const DEAL_SELECT = '*,contact:contacts(id,full_name,company),assignee:profiles!assigned_to(id,full_name)';
const TASK_SELECT = '*,contact:contacts(id,full_name),deal:deals(id,title),assignee:profiles!assigned_to(id,full_name)';
const ACTIVITY_SELECT = '*,contact:contacts(id,full_name),deal:deals(id,title),user:profiles!user_id(id,full_name)';
const MEMBER_SELECT = '*';

export interface CRMDataGateway {
  workspaceId: string;
  contacts(): Promise<SharedContactRow[]>;
  deals(): Promise<SharedDealRow[]>;
  tasks(): Promise<SharedTaskRow[]>;
  activities(): Promise<SharedActivityRow[]>;
  members(): Promise<SharedWorkspaceMemberRow[]>;
}

/**
 * Creates a per-request gateway with lazy caching.
 * Invalid rows (missing id/full_name etc.) are filtered defensively so
 * malformed upstream data can never poison tool payloads.
 */
export function buildCrmDataGateway(fetcher: TableFetcher, workspaceId: string): CRMDataGateway {
  let contactsPromise: Promise<SharedContactRow[]> | null = null;
  let dealsPromise: Promise<SharedDealRow[]> | null = null;
  let tasksPromise: Promise<SharedTaskRow[]> | null = null;
  let activitiesPromise: Promise<SharedActivityRow[]> | null = null;
  let membersPromise: Promise<SharedWorkspaceMemberRow[]> | null = null;

  return {
    workspaceId,
    contacts() {
      contactsPromise ??= fetcher
        .fetchWorkspaceRows<SharedContactRow>('contacts', CONTACT_SELECT, workspaceId)
        .then(rows => rows.filter(r => r && typeof r.id === 'string' && typeof r.full_name === 'string'));
      return contactsPromise;
    },
    deals() {
      dealsPromise ??= fetcher
        .fetchWorkspaceRows<SharedDealRow>('deals', DEAL_SELECT, workspaceId)
        .then(rows => rows.filter(r => r && typeof r.id === 'string' && typeof r.title === 'string'));
      return dealsPromise;
    },
    tasks() {
      tasksPromise ??= fetcher
        .fetchWorkspaceRows<SharedTaskRow>('tasks', TASK_SELECT, workspaceId)
        .then(rows => rows.filter(r => r && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.due_date === 'string'));
      return tasksPromise;
    },
    activities() {
      activitiesPromise ??= fetcher
        .fetchWorkspaceRows<SharedActivityRow>('activities', ACTIVITY_SELECT, workspaceId)
        .then(rows => rows.filter(r => r && typeof r.id === 'string' && typeof r.description === 'string'));
      return activitiesPromise;
    },
    members() {
      membersPromise ??= fetcher.fetchWorkspaceRows<SharedWorkspaceMemberRow>('workspace_members', MEMBER_SELECT, workspaceId);
      return membersPromise;
    },
  };
}

/** Fetch and cache the acting membership row for a user within a workspace. */
export async function resolveWorkspaceMembership(
  fetcher: TableFetcher,
  workspaceId: string,
  userId: string
): Promise<{ ok: true; role: string } | { ok: false }> {
  const members = await fetcher.fetchWorkspaceRows<SharedWorkspaceMemberRow>('workspace_members', MEMBER_SELECT, workspaceId);
  const membership = members.find(m => m && m.user_id === userId);
  if (!membership) return { ok: false };
  return { ok: true, role: typeof membership.role === 'string' ? membership.role : 'sales_rep' };
}
