
CREATE TABLE public.pre_launch_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT current_user_org(),
  test_id TEXT NOT NULL,
  frente TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','skipped')),
  evidence_url TEXT,
  notes TEXT,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, test_id)
);

CREATE INDEX idx_pltr_org_test ON public.pre_launch_test_runs(organization_id, test_id);

ALTER TABLE public.pre_launch_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read pre_launch_test_runs"
ON public.pre_launch_test_runs FOR SELECT
TO authenticated
USING (organization_id = current_user_org() AND is_admin());

CREATE POLICY "Admins can insert pre_launch_test_runs"
ON public.pre_launch_test_runs FOR INSERT
TO authenticated
WITH CHECK (organization_id = current_user_org() AND is_admin() AND executed_by = auth.uid());

CREATE POLICY "Admins can update pre_launch_test_runs"
ON public.pre_launch_test_runs FOR UPDATE
TO authenticated
USING (organization_id = current_user_org() AND is_admin())
WITH CHECK (organization_id = current_user_org() AND is_admin());

CREATE POLICY "Admins can delete pre_launch_test_runs"
ON public.pre_launch_test_runs FOR DELETE
TO authenticated
USING (organization_id = current_user_org() AND is_admin());

CREATE TRIGGER trg_pltr_updated_at
BEFORE UPDATE ON public.pre_launch_test_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
