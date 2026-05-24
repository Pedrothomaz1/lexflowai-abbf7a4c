
-- Standardize plano default to 'free' for new orgs
ALTER TABLE public.organizations 
  ALTER COLUMN plano SET DEFAULT 'free',
  ALTER COLUMN max_usuarios SET DEFAULT 1;

-- Add trial / contact fields if missing
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plano_changed_at TIMESTAMPTZ DEFAULT now();

-- Function: derive max_usuarios from plano
CREATE OR REPLACE FUNCTION public.org_max_usuarios_for_plano(_plano TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _plano
    WHEN 'free' THEN 1
    WHEN 'pro' THEN 5
    WHEN 'business' THEN 30
    WHEN 'enterprise' THEN 9999
    ELSE 1
  END;
$$;

-- Trigger: keep max_usuarios in sync with plano
CREATE OR REPLACE FUNCTION public.sync_org_max_usuarios()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.plano IS DISTINCT FROM OLD.plano) THEN
    NEW.max_usuarios := public.org_max_usuarios_for_plano(NEW.plano);
    NEW.plano_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_max_usuarios ON public.organizations;
CREATE TRIGGER trg_sync_org_max_usuarios
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_max_usuarios();

-- Enterprise leads (Falar com vendas)
CREATE TABLE IF NOT EXISTS public.enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  empresa TEXT NOT NULL,
  telefone TEXT,
  cnpj TEXT,
  num_usuarios_estimado INTEGER,
  mensagem TEXT,
  source TEXT DEFAULT 'onboarding',
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID
);

ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can submit a lead via edge function (service role)
DROP POLICY IF EXISTS lead_insert_service_role ON public.enterprise_leads;
CREATE POLICY lead_insert_service_role ON public.enterprise_leads
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Authenticated users can submit a lead (during onboarding)
DROP POLICY IF EXISTS lead_insert_authenticated ON public.enterprise_leads;
CREATE POLICY lead_insert_authenticated ON public.enterprise_leads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Only service_role reads (super-admin panel will read via edge fn)
DROP POLICY IF EXISTS lead_select_service_role ON public.enterprise_leads;
CREATE POLICY lead_select_service_role ON public.enterprise_leads
  FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_created_at ON public.enterprise_leads(created_at DESC);
