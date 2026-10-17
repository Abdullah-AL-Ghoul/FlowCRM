import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, Workspace, WorkspaceRole } from '../types/crm.types';
import { initialDemoProfiles, initialDemoWorkspace, DEMO_USER_ID } from './demoData';
import { crmService } from './crmService';

export interface AuthSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  workspace: Workspace;
  role: WorkspaceRole;
  isDemo: boolean;
}

const DEMO_SESSION_KEY = 'flowcrm_demo_session';

class AuthService {
  async getInitialSession(): Promise<AuthSession | null> {
    // 1. If Supabase is configured, check for live session
    if (isSupabaseConfigured) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          return await this.fetchUserData(session.user.id, session.user.email || '');
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      }
    }

    // 2. Check for local demo session
    const storedDemo = localStorage.getItem(DEMO_SESSION_KEY);
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo) as AuthSession;
        crmService.setDemoMode(true);
        return parsed;
      } catch {
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
    }

    return null;
  }

  async signIn(email: string, password?: string): Promise<AuthSession> {
    if (isSupabaseConfigured && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from authentication');
      crmService.setDemoMode(false);
      return await this.fetchUserData(data.user.id, data.user.email || email);
    }

    // Offline / Demo Mode Sign In
    return this.enterDemoMode(email);
  }

  async signUp(email: string, password: string, fullName: string, workspaceName: string): Promise<AuthSession> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      // Create workspace for user
      const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
      const { data: wsData, error: wsError } = await (supabase
        .from('workspaces') as any)
        .insert({
          name: workspaceName,
          slug,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add user as owner
      const { error: memberError } = await (supabase
        .from('workspace_members') as any)
        .insert({
          workspace_id: wsData.id,
          user_id: data.user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      crmService.setDemoMode(false);
      return await this.fetchUserData(data.user.id, email);
    }

    // Demo Mode Sign Up
    return this.enterDemoMode(email, fullName, workspaceName);
  }

  async enterDemoMode(email?: string, fullName?: string, workspaceName?: string): Promise<AuthSession> {
    crmService.setDemoMode(true);
    const session: AuthSession = {
      user: {
        id: DEMO_USER_ID,
        email: email || initialDemoProfiles[0].email,
      },
      profile: {
        ...initialDemoProfiles[0],
        email: email || initialDemoProfiles[0].email,
        full_name: fullName || initialDemoProfiles[0].full_name,
      },
      workspace: {
        ...initialDemoWorkspace,
        name: workspaceName || initialDemoWorkspace.name,
      },
      role: 'owner',
      isDemo: true,
    };

    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async resetPassword(email: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return;
    }

    // In demo mode, simulate success
    await new Promise(r => setTimeout(r, 600));
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem(DEMO_SESSION_KEY);
    crmService.setDemoMode(true);
  }

  private async fetchUserData(userId: string, email: string): Promise<AuthSession> {
    // 1. Fetch Profile
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileErr) throw profileErr;

    // 2. Fetch Workspace Membership
    const { data: memberData, error: memberErr } = await supabase
      .from('workspace_members')
      .select('*, workspace:workspaces(*)')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memberErr) throw memberErr;

    return {
      user: { id: userId, email },
      profile: profileData,
      workspace: (memberData as any).workspace,
      role: (memberData as any).role as WorkspaceRole,
      isDemo: false,
    };
  }
}

export const authService = new AuthService();
