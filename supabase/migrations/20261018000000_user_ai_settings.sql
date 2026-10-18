-- ==============================================================================
-- FlowCRM: User AI Settings & Personal API Keys
-- Migration: 20261018000000_user_ai_settings.sql
-- ==============================================================================

-- 1. CREATE USER_AI_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL DEFAULT 'gemini' CHECK (provider_id IN ('gemini', 'openai', 'offline_rule_based')),
    gemini_key TEXT,
    openai_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_workspace_ai_settings UNIQUE (user_id, workspace_id)
);

-- Index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user ON public.user_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_ws ON public.user_ai_settings(workspace_id);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS set_user_ai_settings_updated_at ON public.user_ai_settings;
CREATE TRIGGER set_user_ai_settings_updated_at
BEFORE UPDATE ON public.user_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- 3. STRICT PERSONAL PRIVACY POLICIES
-- Users can only read their OWN AI settings and API keys. No other workspace member or user has access.
CREATE POLICY "Users can view their own AI settings"
ON public.user_ai_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
ON public.user_ai_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
ON public.user_ai_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI settings"
ON public.user_ai_settings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
