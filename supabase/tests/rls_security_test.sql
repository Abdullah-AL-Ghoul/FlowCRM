-- ==============================================================================
-- FlowCRM — PostgreSQL Row-Level Security (RLS) Verification Test Suite
-- Target: pgTAP / Supabase SQL Test Runner
-- ==============================================================================

BEGIN;

SELECT plan(16);

-- 1. Verify all 7 core tables exist
SELECT has_table('public', 'profiles', 'Table profiles exists');
SELECT has_table('public', 'workspaces', 'Table workspaces exists');
SELECT has_table('public', 'workspace_members', 'Table workspace_members exists');
SELECT has_table('public', 'contacts', 'Table contacts exists');
SELECT has_table('public', 'deals', 'Table deals exists');
SELECT has_table('public', 'tasks', 'Table tasks exists');
SELECT has_table('public', 'activities', 'Table activities exists');

-- 2. Verify RLS is enabled on all tables
SELECT row_level_security_active('public.profiles', 'RLS is active on profiles');
SELECT row_level_security_active('public.workspaces', 'RLS is active on workspaces');
SELECT row_level_security_active('public.workspace_members', 'RLS is active on workspace_members');
SELECT row_level_security_active('public.contacts', 'RLS is active on contacts');
SELECT row_level_security_active('public.deals', 'RLS is active on deals');
SELECT row_level_security_active('public.tasks', 'RLS is active on tasks');
SELECT row_level_security_active('public.activities', 'RLS is active on activities');

-- 3. Verify security functions exist
SELECT has_function('public', 'is_workspace_member', ARRAY['uuid', 'uuid'], 'is_workspace_member exists');
SELECT has_function('public', 'get_workspace_role', ARRAY['uuid', 'uuid'], 'get_workspace_role exists');

-- 4. Set up mock test fixtures for multi-tenant isolation testing
DO $$
DECLARE
    u_alice UUID := '11111111-1111-1111-1111-111111111111';
    u_bob UUID := '22222222-2222-2222-2222-222222222222';
    ws_acme UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    ws_beta UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
    -- Create test workspaces
    INSERT INTO public.workspaces (id, name, slug)
    VALUES 
        (ws_acme, 'Acme Corp', 'acme-corp'),
        (ws_beta, 'Beta Labs', 'beta-labs')
    ON CONFLICT (id) DO NOTHING;

    -- Create test profiles
    INSERT INTO public.profiles (id, email, full_name)
    VALUES 
        (u_alice, 'alice@acme.com', 'Alice Smith'),
        (u_bob, 'bob@beta.com', 'Bob Jones')
    ON CONFLICT (id) DO NOTHING;

    -- Add Alice to Acme (Owner) and Bob to Beta (Sales Rep)
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES 
        (ws_acme, u_alice, 'owner'),
        (ws_beta, u_bob, 'sales_rep')
    ON CONFLICT DO NOTHING;

    -- Add a contact to Acme
    INSERT INTO public.contacts (id, workspace_id, full_name, email, company, status)
    VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', ws_acme, 'Acme Customer', 'cust@acme.com', 'Acme', 'customer')
    ON CONFLICT DO NOTHING;
END $$;

-- 5. Test Membership helper functions directly
SELECT is(public.is_workspace_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'), true, 'Alice is member of Acme');
SELECT is(public.is_workspace_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'), false, 'Bob is NOT member of Acme');

ROLLBACK;
