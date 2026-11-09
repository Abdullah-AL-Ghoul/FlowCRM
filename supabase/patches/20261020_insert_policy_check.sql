-- ==============================================================================
-- FLOWCRM — INSERT-POLICY CHECK & FIX (one paste, then press RUN with nothing selected)
-- 1) Shows the LIVE policies currently on public.workspaces (the truth sheet)
-- 2) Re-affirms the missing INSERT policy idempotently
-- 3) Shows the policies again for confirmation
-- ==============================================================================

-- STEP 1: what is currently live?
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'workspaces'
ORDER BY policyname;

-- STEP 2: re-affirm the INSERT policy (safe to re-run)
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

-- STEP 3: confirm the policy list now contains "Users can create workspaces"
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'workspaces'
ORDER BY policyname;
