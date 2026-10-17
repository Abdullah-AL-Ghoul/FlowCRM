import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { crmService } from '../services/crmService';
import {
  Contact,
  Deal,
  Task,
  Activity,
  WorkspaceMember,
  DashboardMetrics,
  DealStage,
  StageSummary,
} from '../types/crm.types';

interface CRMContextType {
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
  members: WorkspaceMember[];
  metrics: DashboardMetrics | null;
  stageBreakdown: StageSummary[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createContact: (data: Omit<Contact, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'assignee'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  createDeal: (data: Omit<Deal, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'assignee'>) => Promise<Deal>;
  updateDealStage: (id: string, stage: DealStage) => Promise<Deal>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<Deal>;
  deleteDeal: (id: string) => Promise<void>;
  createTask: (data: Omit<Task, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'deal' | 'assignee'>) => Promise<Task>;
  toggleTaskStatus: (id: string, currentStatus: string) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  createActivity: (data: Omit<Activity, 'id' | 'workspace_id' | 'created_at' | 'contact' | 'deal' | 'user'>) => Promise<Activity>;
  resetDemoData: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const workspaceId = session?.workspace?.id;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stageBreakdown, setStageBreakdown] = useState<StageSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [
        fetchedContacts,
        fetchedDeals,
        fetchedTasks,
        fetchedActivities,
        fetchedMembers,
        fetchedMetrics,
        fetchedBreakdown,
      ] = await Promise.all([
        crmService.getContacts(workspaceId),
        crmService.getDeals(workspaceId),
        crmService.getTasks(workspaceId),
        crmService.getActivities(workspaceId),
        crmService.getWorkspaceMembers(workspaceId),
        crmService.getDashboardMetrics(workspaceId),
        crmService.getPipelineStageBreakdown(workspaceId),
      ]);

      setContacts(fetchedContacts);
      setDeals(fetchedDeals);
      setTasks(fetchedTasks);
      setActivities(fetchedActivities);
      setMembers(fetchedMembers);
      setMetrics(fetchedMetrics);
      setStageBreakdown(fetchedBreakdown);
    } catch (err: any) {
      console.error('Failed to load CRM data:', err);
      setError(err?.message || 'Error fetching workspace records');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Contacts
  const createContact = async (data: Omit<Contact, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'assignee'>) => {
    if (!workspaceId) throw new Error('No active workspace');
    const newContact = await crmService.createContact(workspaceId, data);
    await refreshData();
    return newContact;
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const updated = await crmService.updateContact(id, updates);
    await refreshData();
    return updated;
  };

  const deleteContact = async (id: string) => {
    await crmService.deleteContact(id);
    await refreshData();
  };

  // Deals
  const createDeal = async (data: Omit<Deal, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'assignee'>) => {
    if (!workspaceId) throw new Error('No active workspace');
    const newDeal = await crmService.createDeal(workspaceId, data);
    await refreshData();
    return newDeal;
  };

  const updateDealStage = async (id: string, stage: DealStage) => {
    const updated = await crmService.updateDealStage(id, stage);
    await refreshData();
    return updated;
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const updated = await crmService.updateDeal(id, updates);
    await refreshData();
    return updated;
  };

  const deleteDeal = async (id: string) => {
    await crmService.deleteDeal(id);
    await refreshData();
  };

  // Tasks
  const createTask = async (data: Omit<Task, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'contact' | 'deal' | 'assignee'>) => {
    if (!workspaceId) throw new Error('No active workspace');
    const newTask = await crmService.createTask(workspaceId, data);
    await refreshData();
    return newTask;
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const updated = await crmService.toggleTaskStatus(id, currentStatus);
    await refreshData();
    return updated;
  };

  const deleteTask = async (id: string) => {
    await crmService.deleteTask(id);
    await refreshData();
  };

  // Activities
  const createActivity = async (data: Omit<Activity, 'id' | 'workspace_id' | 'created_at' | 'contact' | 'deal' | 'user'>) => {
    if (!workspaceId) throw new Error('No active workspace');
    const newAct = await crmService.createActivity(workspaceId, data);
    await refreshData();
    return newAct;
  };

  const resetDemoData = async () => {
    crmService.resetDemoData();
    await refreshData();
  };

  return (
    <CRMContext.Provider
      value={{
        contacts,
        deals,
        tasks,
        activities,
        members,
        metrics,
        stageBreakdown,
        loading,
        error,
        refreshData,
        createContact,
        updateContact,
        deleteContact,
        createDeal,
        updateDealStage,
        updateDeal,
        deleteDeal,
        createTask,
        toggleTaskStatus,
        deleteTask,
        createActivity,
        resetDemoData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = (): CRMContextType => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
