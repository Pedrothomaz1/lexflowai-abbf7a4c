
CREATE TABLE public.impersonation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_user_email TEXT NOT NULL,
  target_organization_id UUID,
  target_organization_nome TEXT,
  motivo TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_impersonation_logs_super_admin ON public.impersonation_logs(super_admin_id, started_at DESC);
CREATE INDEX idx_impersonation_logs_org ON public.impersonation_logs(target_organization_id, started_at DESC);

ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admins select impersonation_logs"
  ON public.impersonation_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "service role manages impersonation_logs"
  ON public.impersonation_logs FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
