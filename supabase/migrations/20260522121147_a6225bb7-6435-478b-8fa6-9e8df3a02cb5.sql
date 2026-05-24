-- Tabela de progresso do onboarding
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  step_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, step_key)
);

CREATE INDEX idx_onboarding_progress_user ON public.onboarding_progress(user_id, organization_id);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (user_id = auth.uid() AND organization_id = current_user_org());

CREATE POLICY "users insert own onboarding progress"
ON public.onboarding_progress FOR INSERT
WITH CHECK (user_id = auth.uid() AND organization_id = current_user_org());

CREATE POLICY "users delete own onboarding progress"
ON public.onboarding_progress FOR DELETE
USING (user_id = auth.uid() AND organization_id = current_user_org());

-- Colunas em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed BOOLEAN NOT NULL DEFAULT false;