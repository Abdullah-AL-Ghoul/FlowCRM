-- ==============================================================================
-- FLOWCRM — WORKSPACE SELF-BOOTSTRAP POLICY FIX (one paste, then RUN)
--
-- ROOT CAUSE FOUND BY LIVE QA:
--   The old INSERT policy used a correlated subquery:
--     NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_members.workspace_id)
--   Inside the subquery, `workspace_members.workspace_id` re-binds to the
--   SUBQUERY'S OWN table, so the condition becomes a self-comparison and the
--   clause fails whenever the querying user can see ANY member row (their own
--   previous membership). First workspace ever worked; every later signup 403'd.
--
-- FIX:
--   1) adds SECURITY DEFINER is_empty_workspace(ws) (bypasses member-RLS and
--      examines the REAL emptiness of the target workspace; DEFINER is the
--      table owner which bypasses RLS without FORCE).
--   2) rebuilds the INSERT policy to call it.
--   SAFE to re-run (CREATE OR REPLACE + DROP/CREATE policy).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_empty_workspace(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
    SELECT NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Admins and owners can add members" ON public.workspace_members;

CREATE POLICY "Admins and owners can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (
        user_id = auth.uid()
        AND role = 'owner'
        AND public.is_empty_workspace(workspace_id)
    )
);

-- CONFIRM: policy now references the function
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'workspace_members'
ORDER BY policyname;
