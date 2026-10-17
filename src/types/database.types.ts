export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'sales_rep';
export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned' | 'inactive';
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage_change';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          workspace_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          job_title: string | null;
          lead_source: string | null;
          status: ContactStatus;
          assigned_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          job_title?: string | null;
          lead_source?: string | null;
          status?: ContactStatus;
          assigned_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          job_title?: string | null;
          lead_source?: string | null;
          status?: ContactStatus;
          assigned_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          workspace_id: string;
          contact_id: string | null;
          title: string;
          value: number;
          currency: string;
          stage: DealStage;
          expected_close_date: string | null;
          assigned_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          contact_id?: string | null;
          title: string;
          value?: number;
          currency?: string;
          stage?: DealStage;
          expected_close_date?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          contact_id?: string | null;
          title?: string;
          value?: number;
          currency?: string;
          stage?: DealStage;
          expected_close_date?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          due_date: string;
          priority: TaskPriority;
          status: TaskStatus;
          assigned_to: string | null;
          contact_id: string | null;
          deal_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          due_date: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          assigned_to?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          assigned_to?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          workspace_id: string;
          type: ActivityType;
          description: string;
          contact_id: string | null;
          deal_id: string | null;
          user_id: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type: ActivityType;
          description: string;
          contact_id?: string | null;
          deal_id?: string | null;
          user_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          type?: ActivityType;
          description?: string;
          contact_id?: string | null;
          deal_id?: string | null;
          user_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
      };
    };
  };
}
