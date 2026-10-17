import {
  WorkspaceRole,
  ContactStatus,
  DealStage,
  TaskPriority,
  TaskStatus,
  ActivityType,
  Database
} from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'] & {
  profile?: Profile;
};

export type Contact = Database['public']['Tables']['contacts']['Row'] & {
  assignee?: Profile | null;
};

export type Deal = Database['public']['Tables']['deals']['Row'] & {
  contact?: Contact | null;
  assignee?: Profile | null;
};

export type Task = Database['public']['Tables']['tasks']['Row'] & {
  contact?: Contact | null;
  deal?: Deal | null;
  assignee?: Profile | null;
};

export type Activity = Database['public']['Tables']['activities']['Row'] & {
  user?: Profile | null;
  contact?: Contact | null;
  deal?: Deal | null;
};

export interface DashboardMetrics {
  totalContacts: number;
  activeDealsCount: number;
  openPipelineValue: number;
  wonDealsCount: number;
  wonDealsValue: number;
  winRate: number; // percentage (0-100)
  tasksDueToday: number;
  tasksOverdue: number;
}

export interface StageSummary {
  stage: DealStage;
  count: number;
  totalValue: number;
}

export type {
  WorkspaceRole,
  ContactStatus,
  DealStage,
  TaskPriority,
  TaskStatus,
  ActivityType
};
