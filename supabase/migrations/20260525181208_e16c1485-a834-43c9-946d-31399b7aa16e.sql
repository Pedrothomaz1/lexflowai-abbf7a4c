-- Tighten workflow RLS: restrict run/definition creation to privileged roles

-- workflow_runs INSERT: require admin or consultoria juridica
DROP POLICY IF EXISTS wf_runs_insert ON public.workflow_runs;
CREATE POLICY wf_runs_insert
ON public.workflow_runs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = current_user_org()
  AND created_by = auth.uid()
  AND has_any_role(auth.uid(), ARRAY['administrador','consultoria_juridica']::app_role[])
);

-- workflow_definitions INSERT: require admin or consultoria juridica
DROP POLICY IF EXISTS wf_defs_insert ON public.workflow_definitions;
CREATE POLICY wf_defs_insert
ON public.workflow_definitions
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = current_user_org()
  AND created_by = auth.uid()
  AND has_any_role(auth.uid(), ARRAY['administrador','consultoria_juridica']::app_role[])
);

-- workflow_run_stages INSERT: require admin or consultoria juridica (parent run already org-scoped)
DROP POLICY IF EXISTS wf_run_stages_insert ON public.workflow_run_stages;
CREATE POLICY wf_run_stages_insert
ON public.workflow_run_stages
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = current_user_org()
  AND has_any_role(auth.uid(), ARRAY['administrador','consultoria_juridica']::app_role[])
);