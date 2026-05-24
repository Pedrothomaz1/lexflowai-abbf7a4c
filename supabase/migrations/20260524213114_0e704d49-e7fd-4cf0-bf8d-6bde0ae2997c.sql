-- Harden RLS policies for security findings

-- 1) Workflow tables: restrict UPDATE/INSERT writes to admins (service_role bypasses RLS by default)
DROP POLICY IF EXISTS wf_defs_update ON public.workflow_definitions;
CREATE POLICY wf_defs_update ON public.workflow_definitions
  FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_stages_insert ON public.workflow_stages;
CREATE POLICY wf_stages_insert ON public.workflow_stages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_runs_update ON public.workflow_runs;
CREATE POLICY wf_runs_update ON public.workflow_runs
  FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_run_stages_insert ON public.workflow_run_stages;
CREATE POLICY wf_run_stages_insert ON public.workflow_run_stages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_run_stages_update ON public.workflow_run_stages;
CREATE POLICY wf_run_stages_update ON public.workflow_run_stages
  FOR UPDATE TO authenticated
  USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

-- 2) AI extractions / risk reviews / compliance status: restrict writes to legal/admin roles
DROP POLICY IF EXISTS ai_extr_insert ON public.ai_extractions;
CREATE POLICY ai_extr_insert ON public.ai_extractions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

DROP POLICY IF EXISTS ai_extr_update ON public.ai_extractions;
CREATE POLICY ai_extr_update ON public.ai_extractions
  FOR UPDATE TO authenticated
  USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  )
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

DROP POLICY IF EXISTS ai_risk_insert ON public.ai_risk_reviews;
CREATE POLICY ai_risk_insert ON public.ai_risk_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

DROP POLICY IF EXISTS ai_risk_update ON public.ai_risk_reviews;
CREATE POLICY ai_risk_update ON public.ai_risk_reviews
  FOR UPDATE TO authenticated
  USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  )
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

DROP POLICY IF EXISTS mt_ccs_ins ON public.contract_compliance_status;
CREATE POLICY mt_ccs_ins ON public.contract_compliance_status
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

DROP POLICY IF EXISTS mt_ccs_upd ON public.contract_compliance_status;
CREATE POLICY mt_ccs_upd ON public.contract_compliance_status
  FOR UPDATE TO authenticated
  USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  )
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[])
  );

-- 3) user_roles: add current_user_org() check to prevent cross-org role assignment
DROP POLICY IF EXISTS mt_user_roles_insert ON public.user_roles;
CREATE POLICY mt_user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = current_user_org()
    AND is_admin_of_org(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS mt_user_roles_update ON public.user_roles;
CREATE POLICY mt_user_roles_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    organization_id = current_user_org()
    AND is_admin_of_org(auth.uid(), organization_id)
  )
  WITH CHECK (
    organization_id = current_user_org()
    AND is_admin_of_org(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS mt_user_roles_delete ON public.user_roles;
CREATE POLICY mt_user_roles_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    organization_id = current_user_org()
    AND is_admin_of_org(auth.uid(), organization_id)
  );

-- 4) enterprise_leads: allow super admins to read via authenticated session
CREATE POLICY lead_select_super_admin ON public.enterprise_leads
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 5) Storage contratos-documentos: remove auth.uid() folder bypass; require org folder
DROP POLICY IF EXISTS storage_org_select ON storage.objects;
CREATE POLICY storage_org_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
  );

DROP POLICY IF EXISTS storage_org_insert ON storage.objects;
CREATE POLICY storage_org_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
  );

DROP POLICY IF EXISTS storage_org_update ON storage.objects;
CREATE POLICY storage_org_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
  );

DROP POLICY IF EXISTS storage_org_delete ON storage.objects;
CREATE POLICY storage_org_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
  );
