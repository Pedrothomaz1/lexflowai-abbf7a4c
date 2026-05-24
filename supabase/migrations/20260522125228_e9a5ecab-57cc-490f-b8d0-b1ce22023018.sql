
-- (4) Remover política duplicada em uso_sistema
DROP POLICY IF EXISTS "service_role_insert_usage" ON public.uso_sistema;

-- (3) Bloquear INSERT direto de anon em sales_leads (força uso da edge com rate limit)
DROP POLICY IF EXISTS "Public can insert leads" ON public.sales_leads;

-- (2) Restringir UPDATE de templates/forms a admin
DROP POLICY IF EXISTS doc_templates_update ON public.document_templates;
CREATE POLICY doc_templates_update ON public.document_templates
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS template_versions_update ON public.template_versions;
CREATE POLICY template_versions_update ON public.template_versions
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS request_forms_update ON public.request_forms;
CREATE POLICY request_forms_update ON public.request_forms
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS request_form_versions_update ON public.request_form_versions;
CREATE POLICY request_form_versions_update ON public.request_form_versions
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

-- workflow_stages: configuração estrutural → só admin
DROP POLICY IF EXISTS wf_stages_update ON public.workflow_stages;
CREATE POLICY wf_stages_update ON public.workflow_stages
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin())
  WITH CHECK (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_stages_delete ON public.workflow_stages;
CREATE POLICY wf_stages_delete ON public.workflow_stages
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());
