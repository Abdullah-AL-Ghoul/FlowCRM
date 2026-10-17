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

export interface SignUpResult {
  session: AuthSession | null;
  needsEmailConfirmation: boolean;
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

  async signUp(
    email: string,
    password: string,
    fullName: string,
    workspaceName: string
  ): Promise<SignUpResult> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            workspace_name: workspaceName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      // If Supabase returned an active session (email confirmation disabled or auto-confirmed)
      if (data.session) {
        const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
        const { data: wsData, error: wsError } = await (supabase
          .from('workspaces') as any)
          .insert({
            name: workspaceName,
            slug,
          })
          .select()
          .single();

        if (!wsError && wsData) {
          await (supabase
            .from('workspace_members') as any)
            .insert({
              workspace_id: wsData.id,
              user_id: data.user.id,
              role: 'owner',
            });
        }

        crmService.setDemoMode(false);
        const session = await this.fetchUserData(data.user.id, email);
        return { session, needsEmailConfirmation: false };
      }

      // Email confirmation is required by Supabase Auth policy
      return { session: null, needsEmailConfirmation: true };
    }

    // Demo Mode Sign Up
    const demoSession = await this.enterDemoMode(email, fullName, workspaceName);
    return { session: demoSession, needsEmailConfirmation: false };
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

  async updatePassword(newPassword: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return;
    }
    await new Promise(r => setTimeout(r, 500));
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
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const resolvedProfile: Profile = profileData || {
      id: userId,
      email,
      full_name: email.split('@')[0],
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Fetch Workspace Membership
    let { data: memberData } = await supabase
      .from('workspace_members')
      .select('*, workspace:workspaces(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    // If user has no workspace yet (e.g. first login after email confirmation)
    if (!memberData) {
      const wsName = resolvedProfile.full_name ? `${resolvedProfile.full_name}'s Workspace` : 'My Sales Workspace';
      const slug = 'ws-' + userId.slice(0, 8) + '-' + Math.floor(Math.random() * 1000);

      const { data: newWs, error: wsError } = await (supabase
        .from('workspaces') as any)
        .insert({
          name: wsName,
          slug,
        })
        .select()
        .single();

      if (!wsError && newWs) {
        await (supabase
          .from('workspace_members') as any)
          .insert({
            workspace_id: newWs.id,
            user_id: userId,
            role: 'owner',
          });

        memberData = {
          id: `member-${userId}`,
          workspace_id: newWs.id,
          user_id: userId,
          role: 'owner',
          created_at: new Date().toISOString(),
          workspace: newWs,
        } as any;
      } else {
        // Fallback to demo workspace to prevent locking out user
        return {
          user: { id: userId, email },
          profile: resolvedProfile,
          workspace: initialDemoWorkspace,
          role: 'owner',
          isDemo: false,
        };
      }
    }

    return {
      user: { id: userId, email },
      profile: resolvedProfile,
      workspace: (memberData as any).workspace || initialDemoWorkspace,
      role: ((memberData as any).role as WorkspaceRole) || 'owner',
      isDemo: false,
    };
  }
}

export const authService = new AuthService();
