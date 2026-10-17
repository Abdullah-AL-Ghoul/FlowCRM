import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Contact,
  Deal,
  Task,
  Activity,
  Workspace,
  WorkspaceMember,
  DashboardMetrics,
  StageSummary,
  DealStage,
} from '../types/crm.types';
import {
  initialDemoWorkspace,
  initialDemoMembers,
  initialDemoContacts,
  initialDemoDeals,
  initialDemoTasks,
  initialDemoActivities,
  initialDemoProfiles,
  DEMO_USER_ID,
} from './demoData';
import { isTaskDueToday, isTaskOverdue } from '../lib/utils';

// Local storage key for persistent demo mutations (v2 with expanded dataset)
const DEMO_STORAGE_KEY = 'flowcrm_demo_data_v2';

interface DemoStorageState {
  workspace: Workspace;
  members: WorkspaceMember[];
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
}

function loadDemoState(): DemoStorageState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse local demo state, falling back to defaults', err);
  }

  const initial: DemoStorageState = {
    workspace: initialDemoWorkspace,
    members: initialDemoMembers,
    contacts: initialDemoContacts,
    deals: initialDemoDeals,
    tasks: initialDemoTasks,
    activities: initialDemoActivities,
  };
  saveDemoState(initial);
  return initial;
}

function saveDemoState(state: DemoStorageState): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to persist demo state', err);
  }
}

class CRMService {
  private isDemo: boolean;

  constructor() {
    this.isDemo = !isSupabaseConfigured;
  }

  setDemoMode(enabled: boolean) {
    this.isDemo = enabled;
  }

  getIsDemoMode(): boolean {
    return this.isDemo;
  }

  // ----------------------------------------------------------------------------
  // WORKSPACE & TEAM
  // ----------------------------------------------------------------------------
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.workspace;
    }

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.members;
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select('*, profile:profiles(*)')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return (data || []) as unknown as WorkspaceMember[];
  }

  // ----------------------------------------------------------------------------
  // CONTACTS
  // ----------------------------------------------------------------------------
  async getContacts(workspaceId: string): Promise<Contact[]> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.contacts;
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*, assignee:profiles!assigned_to(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Contact[];
  }

  async createContact(
    workspaceId: string,
    contactData: Omit<Contact, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'assignee'>
  ): Promise<Contact> {
    if (this.isDemo) {
      const state = loadDemoState();
      const newContact: Contact = {
        id: `contact-${Date.now()}`,
        workspace_id: workspaceId,
        ...contactData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignee: initialDemoProfiles.find(p => p.id === contactData.assigned_to) || null,
      };
      state.contacts = [newContact, ...state.contacts];
      saveDemoState(state);
      return newContact;
    }

    const { data, error } = await (supabase
      .from('contacts') as any)
      .insert({
        workspace_id: workspaceId,
        ...contactData,
      })
      .select('*, assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Contact;
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    if (this.isDemo) {
      const state = loadDemoState();
      const idx = state.contacts.findIndex(c => c.id === contactId);
      if (idx === -1) throw new Error('Contact not found in demo dataset');
      const updated: Contact = {
        ...state.contacts[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.assigned_to) {
        updated.assignee = initialDemoProfiles.find(p => p.id === updates.assigned_to) || null;
      }
      state.contacts[idx] = updated;
      saveDemoState(state);
      return updated;
    }

    const { data, error } = await (supabase
      .from('contacts') as any)
      .update(updates)
      .eq('id', contactId)
      .select('*, assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Contact;
  }

  async deleteContact(contactId: string): Promise<void> {
    if (this.isDemo) {
      const state = loadDemoState();
      state.contacts = state.contacts.filter(c => c.id !== contactId);
      saveDemoState(state);
      return;
    }

    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // DEALS
  // ----------------------------------------------------------------------------
  async getDeals(workspaceId: string): Promise<Deal[]> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.deals;
    }

    const { data, error } = await supabase
      .from('deals')
      .select('*, contact:contacts(*), assignee:profiles!assigned_to(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Deal[];
  }

  async createDeal(
    workspaceId: string,
    dealData: Omit<Deal, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'assignee'>
  ): Promise<Deal> {
    if (this.isDemo) {
      const state = loadDemoState();
      const contact = state.contacts.find(c => c.id === dealData.contact_id) || null;
      const assignee = initialDemoProfiles.find(p => p.id === dealData.assigned_to) || null;

      const newDeal: Deal = {
        id: `deal-${Date.now()}`,
        workspace_id: workspaceId,
        ...dealData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact,
        assignee,
      };
      state.deals = [newDeal, ...state.deals];

      // Automatically log activity for deal creation
      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        workspace_id: workspaceId,
        type: 'stage_change',
        description: `New opportunity "${newDeal.title}" created in stage ${newDeal.stage.toUpperCase()}`,
        deal_id: newDeal.id,
        contact_id: newDeal.contact_id,
        user_id: dealData.assigned_to || DEMO_USER_ID,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user: assignee,
        contact,
        deal: newDeal,
      };
      state.activities = [newActivity, ...state.activities];

      saveDemoState(state);
      return newDeal;
    }

    const { data, error } = await (supabase
      .from('deals') as any)
      .insert({
        workspace_id: workspaceId,
        ...dealData,
      })
      .select('*, contact:contacts(*), assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Deal;
  }

  async updateDealStage(dealId: string, newStage: DealStage): Promise<Deal> {
    if (this.isDemo) {
      const state = loadDemoState();
      const idx = state.deals.findIndex(d => d.id === dealId);
      if (idx === -1) throw new Error('Deal not found in demo');
      const oldStage = state.deals[idx].stage;
      const updated: Deal = {
        ...state.deals[idx],
        stage: newStage,
        updated_at: new Date().toISOString(),
      };
      state.deals[idx] = updated;

      // Log stage transition activity
      const activity: Activity = {
        id: `act-${Date.now()}`,
        workspace_id: updated.workspace_id,
        type: 'stage_change',
        description: `Opportunity "${updated.title}" stage changed from ${oldStage.toUpperCase()} to ${newStage.toUpperCase()}`,
        deal_id: updated.id,
        contact_id: updated.contact_id,
        user_id: DEMO_USER_ID,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user: initialDemoProfiles[0],
        contact: updated.contact,
        deal: updated,
      };
      state.activities = [activity, ...state.activities];

      saveDemoState(state);
      return updated;
    }

    const { data, error } = await (supabase
      .from('deals') as any)
      .update({ stage: newStage })
      .eq('id', dealId)
      .select('*, contact:contacts(*), assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Deal;
  }

  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal> {
    if (this.isDemo) {
      const state = loadDemoState();
      const idx = state.deals.findIndex(d => d.id === dealId);
      if (idx === -1) throw new Error('Deal not found in demo');
      const contact = updates.contact_id
        ? state.contacts.find(c => c.id === updates.contact_id) || null
        : state.deals[idx].contact;
      const assignee = updates.assigned_to
        ? initialDemoProfiles.find(p => p.id === updates.assigned_to) || null
        : state.deals[idx].assignee;

      const updated: Deal = {
        ...state.deals[idx],
        ...updates,
        contact,
        assignee,
        updated_at: new Date().toISOString(),
      };
      state.deals[idx] = updated;
      saveDemoState(state);
      return updated;
    }

    const { data, error } = await (supabase
      .from('deals') as any)
      .update(updates)
      .eq('id', dealId)
      .select('*, contact:contacts(*), assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Deal;
  }

  async deleteDeal(dealId: string): Promise<void> {
    if (this.isDemo) {
      const state = loadDemoState();
      state.deals = state.deals.filter(d => d.id !== dealId);
      saveDemoState(state);
      return;
    }

    const { error } = await supabase.from('deals').delete().eq('id', dealId);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // TASKS
  // ----------------------------------------------------------------------------
  async getTasks(workspaceId: string): Promise<Task[]> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.tasks;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*, contact:contacts(*), deal:deals(*), assignee:profiles!assigned_to(*)')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as Task[];
  }

  async createTask(
    workspaceId: string,
    taskData: Omit<Task, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'deal' | 'assignee'>
  ): Promise<Task> {
    if (this.isDemo) {
      const state = loadDemoState();
      const contact = state.contacts.find(c => c.id === taskData.contact_id) || null;
      const deal = state.deals.find(d => d.id === taskData.deal_id) || null;
      const assignee = initialDemoProfiles.find(p => p.id === taskData.assigned_to) || null;

      const newTask: Task = {
        id: `task-${Date.now()}`,
        workspace_id: workspaceId,
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact,
        deal,
        assignee,
      };
      state.tasks = [newTask, ...state.tasks];
      saveDemoState(state);
      return newTask;
    }

    const { data, error } = await (supabase
      .from('tasks') as any)
      .insert({
        workspace_id: workspaceId,
        ...taskData,
      })
      .select('*, contact:contacts(*), deal:deals(*), assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Task;
  }

  async toggleTaskStatus(taskId: string, currentStatus: string): Promise<Task> {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    if (this.isDemo) {
      const state = loadDemoState();
      const idx = state.tasks.findIndex(t => t.id === taskId);
      if (idx === -1) throw new Error('Task not found in demo');
      const updated: Task = {
        ...state.tasks[idx],
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };
      state.tasks[idx] = updated;
      saveDemoState(state);
      return updated;
    }

    const { data, error } = await (supabase
      .from('tasks') as any)
      .update({ status: nextStatus })
      .eq('id', taskId)
      .select('*, contact:contacts(*), deal:deals(*), assignee:profiles!assigned_to(*)')
      .single();

    if (error) throw error;
    return data as unknown as Task;
  }

  async deleteTask(taskId: string): Promise<void> {
    if (this.isDemo) {
      const state = loadDemoState();
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      saveDemoState(state);
      return;
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  }

  // ----------------------------------------------------------------------------
  // ACTIVITIES
  // ----------------------------------------------------------------------------
  async getActivities(workspaceId: string): Promise<Activity[]> {
    if (this.isDemo) {
      const state = loadDemoState();
      return state.activities;
    }

    const { data, error } = await supabase
      .from('activities')
      .select('*, contact:contacts(*), deal:deals(*), user:profiles!user_id(*)')
      .eq('workspace_id', workspaceId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Activity[];
  }

  async createActivity(
    workspaceId: string,
    activityData: Omit<Activity, 'id' | 'workspace_id' | 'created_at' | 'contact' | 'deal' | 'user'>
  ): Promise<Activity> {
    if (this.isDemo) {
      const state = loadDemoState();
      const contact = state.contacts.find(c => c.id === activityData.contact_id) || null;
      const deal = state.deals.find(d => d.id === activityData.deal_id) || null;
      const user = initialDemoProfiles.find(p => p.id === activityData.user_id) || initialDemoProfiles[0];

      const newAct: Activity = {
        id: `act-${Date.now()}`,
        workspace_id: workspaceId,
        ...activityData,
        created_at: new Date().toISOString(),
        contact,
        deal,
        user,
      };
      state.activities = [newAct, ...state.activities];
      saveDemoState(state);
      return newAct;
    }

    const { data, error } = await (supabase
      .from('activities') as any)
      .insert({
        workspace_id: workspaceId,
        ...activityData,
      })
      .select('*, contact:contacts(*), deal:deals(*), user:profiles!user_id(*)')
      .single();

    if (error) throw error;
    return data as unknown as Activity;
  }

  // ----------------------------------------------------------------------------
  // CALCULATED METRICS & REPORTING
  // ----------------------------------------------------------------------------
  async getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
    const [contacts, deals, tasks] = await Promise.all([
      this.getContacts(workspaceId),
      this.getDeals(workspaceId),
      this.getTasks(workspaceId),
    ]);

    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');

    const openPipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const wonDealsValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;

    const tasksDueToday = tasks.filter(t => isTaskDueToday(t.due_date, t.status)).length;
    const tasksOverdue = tasks.filter(t => isTaskOverdue(t.due_date, t.status)).length;

    return {
      totalContacts: contacts.length,
      activeDealsCount: activeDeals.length,
      openPipelineValue,
      wonDealsCount: wonDeals.length,
      wonDealsValue,
      winRate,
      tasksDueToday,
      tasksOverdue,
    };
  }

  async getPipelineStageBreakdown(workspaceId: string): Promise<StageSummary[]> {
    const deals = await this.getDeals(workspaceId);
    const stages: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        totalValue: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
      };
    });
  }

  resetDemoData(): void {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    loadDemoState();
  }
}

export const crmService = new CRMService();
