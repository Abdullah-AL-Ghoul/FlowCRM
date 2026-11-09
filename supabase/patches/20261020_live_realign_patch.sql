-- ==============================================================================
-- FlowCRM LIVE REALIGN PATCH - generated 2026-10-20
-- ONE paste into Supabase SQL Editor. Fixes both problems found by the
-- connected-mode QA probe:
--   PART 1: FlowAI security migration (flowai_usage + SECURITY DEFINER quota
--           RPCs; drops legacy user_ai_settings if ever created).
--   PART 2: idempotently realigns ALL canonical RLS policies for the 7 core
--           tables (live project lacks "Users can create workspaces").
--   Every CREATE POLICY is directly preceded by its own DROP ... IF EXISTS,
--   so the script is safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1 - FLOWAI SECURITY MIGRATION (verbatim from migrations file)
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- FlowCRM: FlowAI Server-Side Gateway Security Migration
-- Migration: 20261019000000_flowai_security.sql
--
-- SECURITY CONTEXT (aligned with the FlowCRM AI security mandate + OWASP LLM):
-- 1. The previous `user_ai_settings` table stored personal provider API keys
--    as PLAINTEXT database columns and the client browsed them by design.
--    Storing customer provider credentials in plaintext is prohibited.
--    This migration drops that table (secure erasure of the prohibited data).
--    All provider credentials are now server-side secrets supplied through
--    Supabase Edge Function environment (e.g. GEMINI_API_KEY / OPENAI_API_KEY).
-- 2. Adds `flowai_usage`: server-authoritative usage & quota accounting so
--    rate limiting and token quotas are enforced in the database rather than
--    in client-side localStorage (which is trivially bypassable).
-- ==============================================================================

-- ============================================================================
-- 1. DROP the plaintext-key table
-- ============================================================================
-- Justification: the table's sole purpose was storing provider keys in
-- plaintext (gemini_key / openai_key) for browser-side calls — explicitly
-- prohibited by the platform security mandate. Platform-managed server keys
-- replace this mechanism entirely. No other product data is stored here.
DROP TABLE IF EXISTS public.user_ai_settings CASCADE;

-- ============================================================================
-- 2. FLOWAI_USAGE TABLE
-- ============================================================================
-- One row per (workspace, hour). Month totals are derived by summing the
-- current month's rows. Written exclusively through SECURITY DEFINER RPCs.
CREATE TABLE IF NOT EXISTS public.flowai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    hour_bucket TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
    month_bucket DATE NOT NULL DEFAULT date_trunc('month', now())::date,
    requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
    tokens INTEGER NOT NULL DEFAULT 0 CHECK (tokens >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT flowai_usage_ws_hour_unique UNIQUE (workspace_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_flowai_usage_ws_hour
    ON public.flowai_usage(workspace_id, hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_flowai_usage_ws_month
    ON public.flowai_usage(workspace_id, month_bucket);

DROP TRIGGER IF EXISTS set_flowai_usage_updated_at ON public.flowai_usage;
CREATE TRIGGER set_flowai_usage_updated_at
BEFORE UPDATE ON public.flowai_usage
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS: direct table access is locked down. Reads for usage dashboards go
-- through the member-scoped SELECT policy; all writes happen only inside
-- SECURITY DEFINER RPCs (there are deliberately NO INSERT/UPDATE/DELETE
-- policies, so regular clients — even authenticated members — cannot write).
ALTER TABLE public.flowai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FlowAI usage readable by workspace members" ON public.flowai_usage;

CREATE POLICY "FlowAI usage readable by workspace members"
ON public.flowai_usage  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ============================================================================
-- 3. SECURITY DEFINER RPCs (server-side accounting)
-- ============================================================================
-- consume_flowai_quota: atomically checks hourly request + monthly token
-- quotas and pre-consumes ONE request slot. Returns the updated counters.
-- Called only by the flowai-assistant Edge Function (service role); execute
-- is revoked from anon/authenticated to prevent client-side forgery.
CREATE OR REPLACE FUNCTION public.consume_flowai_quota(
    p_workspace_id UUID,
    p_hourly_request_limit INTEGER,
    p_monthly_token_limit INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    requests_this_hour INTEGER,
    tokens_this_month INTEGER,
    hourly_request_limit INTEGER,
    monthly_token_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hour_bucket TIMESTAMPTZ := date_trunc('hour', now());
    v_month_bucket DATE := date_trunc('month', now())::date;
    v_requests INTEGER := 0;
    v_tokens_month INTEGER := 0;
    v_allowed BOOLEAN := FALSE;
BEGIN
    -- Ensure the current-hour row exists and lock it to serialize writes.
    INSERT INTO public.flowai_usage (workspace_id, hour_bucket, month_bucket)
    VALUES (p_workspace_id, v_hour_bucket, v_month_bucket)
    ON CONFLICT (workspace_id, hour_bucket) DO NOTHING;

    SELECT fu.requests INTO v_requests
    FROM public.flowai_usage fu
    WHERE fu.workspace_id = p_workspace_id
      AND fu.hour_bucket = v_hour_bucket
    FOR UPDATE;

    SELECT COALESCE(SUM(fu.tokens), 0) INTO v_tokens_month
    FROM public.flowai_usage fu
    WHERE fu.workspace_id = p_workspace_id
      AND fu.month_bucket = v_month_bucket;

    v_allowed := v_requests < p_hourly_request_limit
             AND v_tokens_month < p_monthly_token_limit;

    IF v_allowed THEN
        UPDATE public.flowai_usage
        SET requests = requests + 1,
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id
          AND hour_bucket = v_hour_bucket;
    END IF;

    RETURN QUERY SELECT
        v_allowed,
        v_requests + CASE WHEN v_allowed THEN 1 ELSE 0 END,
        v_tokens_month,
        p_hourly_request_limit,
        p_monthly_token_limit;
END;
$$;

-- record_flowai_usage: adds the actual token consumption for a completed
-- provider call (bounded by the function to sane magnitudes).
CREATE OR REPLACE FUNCTION public.record_flowai_usage(
    p_workspace_id UUID,
    p_tokens INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hour_bucket TIMESTAMPTZ := date_trunc('hour', now());
    v_month_bucket DATE := date_trunc('month', now())::date;
    v_bounded_tokens INTEGER := GREATEST(0, LEAST(COALESCE(p_tokens, 0), 1000000));
BEGIN
    INSERT INTO public.flowai_usage (workspace_id, hour_bucket, month_bucket, requests, tokens)
    VALUES (p_workspace_id, v_hour_bucket, v_month_bucket, 0, v_bounded_tokens)
    ON CONFLICT (workspace_id, hour_bucket)
    DO UPDATE SET tokens = flowai_usage.tokens + EXCLUDED.tokens,
                  updated_at = NOW();
END;
$$;

-- get_flowai_usage: member-scoped read for usage dashboards.
-- Limits are passed in by the caller (the client uses the same documented
-- defaults as the Edge Function) and returned for display purposes.
CREATE OR REPLACE FUNCTION public.get_flowai_usage(
    p_workspace_id UUID,
    p_hourly_request_limit INTEGER DEFAULT 60,
    p_monthly_token_limit INTEGER DEFAULT 200000
)
RETURNS TABLE (
    requests_this_hour INTEGER,
    tokens_this_month INTEGER,
    hourly_request_limit INTEGER,
    monthly_token_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hour_bucket TIMESTAMPTZ := date_trunc('hour', now());
    v_month_bucket DATE := date_trunc('month', now())::date;
    v_requests INTEGER := 0;
    v_tokens_month INTEGER := 0;
BEGIN
    IF NOT public.is_workspace_member(p_workspace_id, auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: not a member of this workspace';
    END IF;

    SELECT COALESCE(fu.requests, 0) INTO v_requests
    FROM public.flowai_usage fu
    WHERE fu.workspace_id = p_workspace_id
      AND fu.hour_bucket = v_hour_bucket;

    SELECT COALESCE(SUM(fu.tokens), 0) INTO v_tokens_month
    FROM public.flowai_usage fu
    WHERE fu.workspace_id = p_workspace_id
      AND fu.month_bucket = v_month_bucket;

    RETURN QUERY SELECT v_requests, v_tokens_month, p_hourly_request_limit, p_monthly_token_limit;
END;
$$;

-- Least privilege on the RPCs:
-- consume/record are for the Edge Function service role ONLY.
-- get is for authenticated members (workspace check is inside the function).
REVOKE ALL ON FUNCTION public.consume_flowai_quota(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_flowai_usage(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_flowai_quota(UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_flowai_usage(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_flowai_usage(UUID, INTEGER, INTEGER) TO authenticated;

-- ------------------------------------------------------------------------------
-- PART 2 - CANONICAL CORE POLICIES (idempotent re-alignment)
-- ------------------------------------------------------------------------------
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
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles  FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles  FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- B. WORKSPACES POLICIES
-- ------------------------------------------------------------------------------
-- Members can view workspaces they belong to
DROP POLICY IF EXISTS "Workspaces viewable by members" ON public.workspaces;

CREATE POLICY "Workspaces viewable by members"
ON public.workspaces  FOR SELECT
TO authenticated
USING (public.is_workspace_member(id, auth.uid()));

-- Authenticated users can create new workspaces
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

CREATE POLICY "Users can create workspaces"
ON public.workspaces  FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only owners and admins can update workspace details
DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;

CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces  FOR UPDATE
TO authenticated
USING (public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin'))
WITH CHECK (public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin'));

-- Only owners can delete workspaces
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;

CREATE POLICY "Owners can delete workspaces"
ON public.workspaces  FOR DELETE
TO authenticated
USING (public.get_workspace_role(id, auth.uid()) = 'owner');

-- ------------------------------------------------------------------------------
-- C. WORKSPACE_MEMBERS POLICIES
-- ------------------------------------------------------------------------------
-- Members can view team members in their workspace
DROP POLICY IF EXISTS "Workspace members viewable by fellow members" ON public.workspace_members;

CREATE POLICY "Workspace members viewable by fellow members"
ON public.workspace_members  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Only owners and admins can add new members
DROP POLICY IF EXISTS "Admins and owners can add members" ON public.workspace_members;

CREATE POLICY "Admins and owners can add members"
ON public.workspace_members  FOR INSERT
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
DROP POLICY IF EXISTS "Admins and owners can update members" ON public.workspace_members;

CREATE POLICY "Admins and owners can update members"
ON public.workspace_members  FOR UPDATE
TO authenticated
USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
)
WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
);

-- Only owners and admins can remove members
DROP POLICY IF EXISTS "Admins and owners can delete members" ON public.workspace_members;

CREATE POLICY "Admins and owners can delete members"
ON public.workspace_members  FOR DELETE
TO authenticated
USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND role <> 'owner') -- Members can leave (unless sole owner)
);

-- ------------------------------------------------------------------------------
-- D. CONTACTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Contacts viewable by workspace members" ON public.contacts;

CREATE POLICY "Contacts viewable by workspace members"
ON public.contacts  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Contacts insertable by workspace members" ON public.contacts;

CREATE POLICY "Contacts insertable by workspace members"
ON public.contacts  FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Contacts updatable by workspace members" ON public.contacts;

CREATE POLICY "Contacts updatable by workspace members"
ON public.contacts  FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Contacts deletable by managers, admins, and owners" ON public.contacts;

CREATE POLICY "Contacts deletable by managers, admins, and owners"
ON public.contacts  FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- ------------------------------------------------------------------------------
-- E. DEALS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Deals viewable by workspace members" ON public.deals;

CREATE POLICY "Deals viewable by workspace members"
ON public.deals  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Deals insertable by workspace members" ON public.deals;

CREATE POLICY "Deals insertable by workspace members"
ON public.deals  FOR INSERT
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

DROP POLICY IF EXISTS "Deals updatable by workspace members" ON public.deals;

CREATE POLICY "Deals updatable by workspace members"
ON public.deals  FOR UPDATE
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

DROP POLICY IF EXISTS "Deals deletable by managers, admins, and owners" ON public.deals;

CREATE POLICY "Deals deletable by managers, admins, and owners"
ON public.deals  FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

-- ------------------------------------------------------------------------------
-- F. TASKS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tasks viewable by workspace members" ON public.tasks;

CREATE POLICY "Tasks viewable by workspace members"
ON public.tasks  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Tasks insertable by workspace members" ON public.tasks;

CREATE POLICY "Tasks insertable by workspace members"
ON public.tasks  FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Tasks updatable by workspace members" ON public.tasks;

CREATE POLICY "Tasks updatable by workspace members"
ON public.tasks  FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Tasks deletable by workspace members" ON public.tasks;

CREATE POLICY "Tasks deletable by workspace members"
ON public.tasks  FOR DELETE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ------------------------------------------------------------------------------
-- G. ACTIVITIES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Activities viewable by workspace members" ON public.activities;

CREATE POLICY "Activities viewable by workspace members"
ON public.activities  FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Activities insertable by workspace members" ON public.activities;

CREATE POLICY "Activities insertable by workspace members"
ON public.activities  FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Activities deletable by admins and owners" ON public.activities;

CREATE POLICY "Activities deletable by admins and owners"
ON public.activities  FOR DELETE
TO authenticated
USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));
