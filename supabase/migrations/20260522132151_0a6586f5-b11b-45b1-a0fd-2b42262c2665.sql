CREATE TABLE IF NOT EXISTS public.security_regression_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  duration_ms integer NOT NULL,
  total integer NOT NULL,
  passed integer NOT NULL,
  failed integer NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_regression_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins read regression runs"
  ON public.security_regression_runs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "service_role insert regression runs"
  ON public.security_regression_runs FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_security_regression_runs_created_at
  ON public.security_regression_runs (created_at DESC);