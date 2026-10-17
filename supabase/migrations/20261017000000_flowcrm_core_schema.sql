-- ==============================================================================
-- FlowCRM Core Database Schema & Row-Level Security (RLS) Policies
-- Migration: 20261017000000_flowcrm_core_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on profiles email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Automatic profile sync trigger from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth.user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 4. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'sales_rep')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- 6. SECURITY DEFINER HELPER FUNCTIONS FOR RLS (Prevents Recursive Policy Lookups)
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_ws_id UUID, target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = target_ws_id
          AND user_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_workspace_role(target_ws_id UUID, target_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    IF target_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT role INTO user_role
    FROM public.workspace_members
    WHERE workspace_id = target_ws_id
      AND user_id = target_user_id
    LIMIT 1;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    lead_source TEXT DEFAULT 'website',
    status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'churned', 'inactive')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_ws ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts(assigned_to);

CREATE TRIGGER set_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 8. DEALS TABLE
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (value >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    expected_close_date DATE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_ws ON public.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id);

CREATE TRIGGER set_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 9. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_ws ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON public.tasks(workspace_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 10. ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'stage_change')),
    description TEXT NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_ws ON public.activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_occurred ON public.activities(occurred_at DESC);

-- ==============================================================================
-- 11. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all 7 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Any authenticated user can view profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- B. WORKSPACES POLICIES
-- ------------------------------------------------------------------------------
-- Members can view workspaces they belong to
CREATE POLICY "Workspaces viewable by members"
ON public.workspaces FOR SELECT
TO authenticated
USING (public.is_workspace_member(id, auth.uid()));

-- Authenticated users can create new workspaces
CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only owners and admins can update workspace details
CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces FOR UPDATE
TO authenticated
USING (public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin'))
WITH CHECK (public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin'));

-- Only owners can delete workspaces
CREATE POLICY "Owners can delete workspaces"
ON public.workspaces FOR DELETE
TO authenticated
USING (public.get_workspace_role(id, auth.uid()) = 'owner');

-- ------------------------------------------------------------------------------
-- C. WORKSPACE_MEMBERS POLICIES
-- ------------------------------------------------------------------------------
-- Members can view team members in their workspace
CREATE POLICY "Workspace members viewable by fellow members"
ON public.workspace_members FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Only owners and admins can add new members
CREATE POLICY "Admins and owners can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    -- Or user adds themselves as owner on newly created workspace
    OR (
        user_id = auth.uid()
        AND role = 'owner'
        AND NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id)
    )
);

-- Only owners and admins can update member roles (owners cannot have their role demoted by admins)
CREATE POLICY "Admins and owners can update members"
ON public.workspace_members FOR UPDATE
TO authenticated
USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
)
WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- Only owners and admins can remove members
CREATE POLICY "Admins and owners can delete members"
ON public.workspace_members FOR DELETE
TO authenticated
USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND role <> 'owner') -- Members can leave (unless sole owner)
);

-- ------------------------------------------------------------------------------
-- D. CONTACTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Contacts viewable by workspace members"
ON public.contacts FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Contacts insertable by workspace members"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Contacts updatable by workspace members"
ON public.contacts FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Contacts deletable by managers, admins, and owners"
ON public.contacts FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- ------------------------------------------------------------------------------
-- E. DEALS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Deals viewable by workspace members"
ON public.deals FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Deals insertable by workspace members"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    -- Prevent cross-workspace contact referencing
    AND (
        contact_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM public.contacts c 
            WHERE c.id = deals.contact_id 
              AND c.workspace_id = deals.workspace_id
        )
    )
);

CREATE POLICY "Deals updatable by workspace members"
ON public.deals FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
        contact_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM public.contacts c 
            WHERE c.id = deals.contact_id 
              AND c.workspace_id = deals.workspace_id
        )
    )
);

CREATE POLICY "Deals deletable by managers, admins, and owners"
ON public.deals FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- ------------------------------------------------------------------------------
-- F. TASKS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Tasks viewable by workspace members"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Tasks insertable by workspace members"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Tasks updatable by workspace members"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Tasks deletable by workspace members"
ON public.tasks FOR DELETE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ------------------------------------------------------------------------------
-- G. ACTIVITIES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Activities viewable by workspace members"
ON public.activities FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Activities insertable by workspace members"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Activities deletable by admins and owners"
ON public.activities FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));
