-- =====================================================
-- PHASE 2: RLS POLICY OVERHAUL FOR MULTI-TENANCY
-- FIX: Handle existing data by creating default org first
-- =====================================================

-- STEP 0: Create a default organization for existing data
INSERT INTO organizations (id, nome, slug, plano, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Organização Padrão',
  'default',
  'basico',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Update existing data to use default organization
UPDATE especificacoes_servico SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE go_nogo_checklist SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE user_roles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE data_retention_policies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contratos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE fornecedores SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_alerts SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_obligations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_approvals SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_signatures SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_analysis SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_attachments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_comments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_history SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_versions SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_templates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contract_redlines SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE unidades SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE franquias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE fornecedor_anexos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE fornecedor_categorias_servico SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE notification_preferences SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE audit_logs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE compliance_logs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE security_metrics SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE report_configurations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE negotiation_metrics SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE approval_workflows SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE integracao_config SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE sod_approvals SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE solicitacoes_compras SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- =====================================================
-- STEP 1: DROP EXISTING RLS POLICIES ON TENANT-SCOPED TABLES
-- =====================================================

-- contratos
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON contratos;
DROP POLICY IF EXISTS "Analistas e consultores podem criar contratos" ON contratos;
DROP POLICY IF EXISTS "Controle de atualização de contratos" ON contratos;

-- fornecedores
DROP POLICY IF EXISTS "Authenticated users can view fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Authorized users can create fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Authorized users can update fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Admins can delete fornecedores" ON fornecedores;

-- contract_alerts
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON contract_alerts;
DROP POLICY IF EXISTS "Admins and consultores can manage alerts" ON contract_alerts;

-- contract_obligations
DROP POLICY IF EXISTS "Authenticated users can view obligations" ON contract_obligations;
DROP POLICY IF EXISTS "Users can manage obligations" ON contract_obligations;

-- contract_approvals
DROP POLICY IF EXISTS "Authenticated users can view approvals" ON contract_approvals;
DROP POLICY IF EXISTS "Authorized users can manage approvals" ON contract_approvals;
DROP POLICY IF EXISTS "Users can view their approvals" ON contract_approvals;
DROP POLICY IF EXISTS "Approvers can update approvals" ON contract_approvals;

-- contract_signatures
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON contract_signatures;
DROP POLICY IF EXISTS "Usuários autenticados podem criar assinaturas" ON contract_signatures;
DROP POLICY IF EXISTS "Admins e consultores podem atualizar assinaturas" ON contract_signatures;
DROP POLICY IF EXISTS "Admins podem deletar assinaturas" ON contract_signatures;

-- contract_analysis
DROP POLICY IF EXISTS "Authenticated users can view analysis" ON contract_analysis;
DROP POLICY IF EXISTS "Authorized users can manage analysis" ON contract_analysis;
DROP POLICY IF EXISTS "Users can view contract analysis" ON contract_analysis;
DROP POLICY IF EXISTS "Authorized users can insert analysis" ON contract_analysis;

-- contract_attachments
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON contract_attachments;
DROP POLICY IF EXISTS "Users can upload attachments" ON contract_attachments;
DROP POLICY IF EXISTS "Admins can manage attachments" ON contract_attachments;

-- contract_comments
DROP POLICY IF EXISTS "Users can view comments on contracts they have access to" ON contract_comments;
DROP POLICY IF EXISTS "Usuários autenticados podem criar comentários" ON contract_comments;
DROP POLICY IF EXISTS "Usuários podem editar seus próprios comentários" ON contract_comments;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios comentários" ON contract_comments;

-- contract_history
DROP POLICY IF EXISTS "Authenticated users can view contract history" ON contract_history;
DROP POLICY IF EXISTS "Authorized users can insert contract history" ON contract_history;

-- contract_versions
DROP POLICY IF EXISTS "Authenticated users can view contract versions" ON contract_versions;
DROP POLICY IF EXISTS "Authorized users can insert versions" ON contract_versions;

-- contract_requests
DROP POLICY IF EXISTS "Authenticated users can view requests" ON contract_requests;
DROP POLICY IF EXISTS "Public can create requests" ON contract_requests;
DROP POLICY IF EXISTS "Authorized users can update requests" ON contract_requests;
DROP POLICY IF EXISTS "Anyone can create contract requests" ON contract_requests;
DROP POLICY IF EXISTS "Authorized users can manage requests" ON contract_requests;

-- contract_templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON contract_templates;
DROP POLICY IF EXISTS "Admins and consultores can manage templates" ON contract_templates;

-- contract_redlines
DROP POLICY IF EXISTS "Users can view redlines on accessible contracts" ON contract_redlines;
DROP POLICY IF EXISTS "Authorized users can create redlines" ON contract_redlines;
DROP POLICY IF EXISTS "Authors can update their own draft redlines" ON contract_redlines;
DROP POLICY IF EXISTS "Admins can delete redlines" ON contract_redlines;

-- unidades
DROP POLICY IF EXISTS "Authenticated users can view unidades" ON unidades;
DROP POLICY IF EXISTS "Authorized users can insert unidades" ON unidades;
DROP POLICY IF EXISTS "Authorized users can update unidades" ON unidades;
DROP POLICY IF EXISTS "Admins can delete unidades" ON unidades;

-- franquias
DROP POLICY IF EXISTS "Authenticated users can view franquias" ON franquias;
DROP POLICY IF EXISTS "Authorized users can insert franquias" ON franquias;
DROP POLICY IF EXISTS "Authorized users can update franquias" ON franquias;
DROP POLICY IF EXISTS "Admins can delete franquias" ON franquias;

-- especificacoes_servico
DROP POLICY IF EXISTS "Authenticated users can view especificacoes" ON especificacoes_servico;
DROP POLICY IF EXISTS "Authorized users can manage especificacoes" ON especificacoes_servico;

-- fornecedor_anexos
DROP POLICY IF EXISTS "Authenticated users can view fornecedor attachments" ON fornecedor_anexos;
DROP POLICY IF EXISTS "Manage fornecedor attachments" ON fornecedor_anexos;
DROP POLICY IF EXISTS "Update fornecedor attachments" ON fornecedor_anexos;
DROP POLICY IF EXISTS "Delete fornecedor attachments" ON fornecedor_anexos;

-- fornecedor_categorias_servico
DROP POLICY IF EXISTS "Authenticated users can view categorias" ON fornecedor_categorias_servico;
DROP POLICY IF EXISTS "Authorized users can manage categorias" ON fornecedor_categorias_servico;

-- user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- notification_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can view all preferences" ON notification_preferences;

-- audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users and triggers can insert audit logs" ON audit_logs;

-- compliance_logs
DROP POLICY IF EXISTS "Admins can view compliance logs" ON compliance_logs;
DROP POLICY IF EXISTS "System can insert compliance logs" ON compliance_logs;

-- security_metrics
DROP POLICY IF EXISTS "admins_manage_metrics" ON security_metrics;

-- report_configurations
DROP POLICY IF EXISTS "Users can view public reports or own reports" ON report_configurations;
DROP POLICY IF EXISTS "Users can create their own reports" ON report_configurations;
DROP POLICY IF EXISTS "Users can update their own reports or admins" ON report_configurations;
DROP POLICY IF EXISTS "Users can delete their own reports or admins" ON report_configurations;

-- negotiation_metrics
DROP POLICY IF EXISTS "Authenticated users can view negotiation metrics" ON negotiation_metrics;
DROP POLICY IF EXISTS "Authorized users can manage negotiation metrics" ON negotiation_metrics;

-- approval_workflows
DROP POLICY IF EXISTS "Authenticated users can view workflows" ON approval_workflows;
DROP POLICY IF EXISTS "Admins can manage workflows" ON approval_workflows;

-- integracao_config
DROP POLICY IF EXISTS "Authenticated users can view integrations" ON integracao_config;
DROP POLICY IF EXISTS "Admins can manage integrations" ON integracao_config;

-- data_retention_policies
DROP POLICY IF EXISTS "Authenticated users can view retention policies" ON data_retention_policies;
DROP POLICY IF EXISTS "Admins can manage retention policies" ON data_retention_policies;

-- sod_approvals
DROP POLICY IF EXISTS "sod_view_own_or_approver" ON sod_approvals;
DROP POLICY IF EXISTS "sod_insert_authenticated" ON sod_approvals;
DROP POLICY IF EXISTS "sod_update_approver_only" ON sod_approvals;

-- solicitacoes_compras
DROP POLICY IF EXISTS "Authenticated users can view solicitacoes" ON solicitacoes_compras;
DROP POLICY IF EXISTS "System can insert solicitacoes" ON solicitacoes_compras;
DROP POLICY IF EXISTS "System can update solicitacoes" ON solicitacoes_compras;

-- go_nogo_checklist
DROP POLICY IF EXISTS "Authenticated users can view checklist" ON go_nogo_checklist;
DROP POLICY IF EXISTS "Admins can manage checklist" ON go_nogo_checklist;

-- =====================================================
-- STEP 2: CREATE NEW MULTI-TENANT RLS POLICIES
-- =====================================================

-- organizations
CREATE POLICY "Users can view own organization"
ON organizations FOR SELECT
USING (id = current_user_org());

CREATE POLICY "Org owners can update organization"
ON organizations FOR UPDATE
USING (is_org_owner(auth.uid(), id));

-- organization_members
CREATE POLICY "Users can view org members"
ON organization_members FOR SELECT
USING (organization_id = current_user_org());

CREATE POLICY "Org admins can insert members"
ON organization_members FOR INSERT
WITH CHECK (organization_id = current_user_org() AND is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update members"
ON organization_members FOR UPDATE
USING (organization_id = current_user_org() AND is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org owners can delete members"
ON organization_members FOR DELETE
USING (organization_id = current_user_org() AND is_org_owner(auth.uid(), organization_id));

-- contratos
CREATE POLICY "mt_contratos_select"
ON contratos FOR SELECT
USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());

CREATE POLICY "mt_contratos_insert"
ON contratos FOR INSERT
WITH CHECK (
  organization_id = current_user_org()
  AND (has_role(auth.uid(), 'analista_juridico'::app_role) OR has_role(auth.uid(), 'consultoria_juridica'::app_role) OR has_role(auth.uid(), 'administrador'::app_role))
);

CREATE POLICY "mt_contratos_update"
ON contratos FOR UPDATE
USING (
  organization_id = current_user_org()
  AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultoria_juridica'::app_role) OR (has_role(auth.uid(), 'analista_juridico'::app_role) AND status = 'rascunho'::contract_status AND created_by = auth.uid()))
);

CREATE POLICY "mt_contratos_delete"
ON contratos FOR DELETE
USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- fornecedores
CREATE POLICY "mt_fornecedores_select" ON fornecedores FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_fornecedores_insert" ON fornecedores FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedores_update" ON fornecedores FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedores_delete" ON fornecedores FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_alerts
CREATE POLICY "mt_contract_alerts_select" ON contract_alerts FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_alerts_insert" ON contract_alerts FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));
CREATE POLICY "mt_contract_alerts_update" ON contract_alerts FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));
CREATE POLICY "mt_contract_alerts_delete" ON contract_alerts FOR DELETE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));

-- contract_obligations
CREATE POLICY "mt_contract_obligations_select" ON contract_obligations FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_obligations_insert" ON contract_obligations FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_contract_obligations_update" ON contract_obligations FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_contract_obligations_delete" ON contract_obligations FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_approvals
CREATE POLICY "mt_contract_approvals_select" ON contract_approvals FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_approvals_insert" ON contract_approvals FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() IS NOT NULL);
CREATE POLICY "mt_contract_approvals_update" ON contract_approvals FOR UPDATE USING (organization_id = current_user_org() AND (aprovador_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));
CREATE POLICY "mt_contract_approvals_delete" ON contract_approvals FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_signatures
CREATE POLICY "mt_contract_signatures_select" ON contract_signatures FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_signatures_insert" ON contract_signatures FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() = created_by);
CREATE POLICY "mt_contract_signatures_update" ON contract_signatures FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));
CREATE POLICY "mt_contract_signatures_delete" ON contract_signatures FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_analysis
CREATE POLICY "mt_contract_analysis_select" ON contract_analysis FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_analysis_insert" ON contract_analysis FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_contract_analysis_update" ON contract_analysis FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_contract_analysis_delete" ON contract_analysis FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_attachments
CREATE POLICY "mt_contract_attachments_select" ON contract_attachments FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_attachments_insert" ON contract_attachments FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() = uploaded_by);
CREATE POLICY "mt_contract_attachments_update" ON contract_attachments FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_contract_attachments_delete" ON contract_attachments FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_comments
CREATE POLICY "mt_contract_comments_select" ON contract_comments FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_comments_insert" ON contract_comments FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() = user_id);
CREATE POLICY "mt_contract_comments_update" ON contract_comments FOR UPDATE USING (organization_id = current_user_org() AND auth.uid() = user_id);
CREATE POLICY "mt_contract_comments_delete" ON contract_comments FOR DELETE USING (organization_id = current_user_org() AND auth.uid() = user_id);

-- contract_history
CREATE POLICY "mt_contract_history_select" ON contract_history FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_history_insert" ON contract_history FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- contract_versions
CREATE POLICY "mt_contract_versions_select" ON contract_versions FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_versions_insert" ON contract_versions FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- contract_requests (public insert allowed)
CREATE POLICY "mt_contract_requests_select" ON contract_requests FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_requests_insert" ON contract_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "mt_contract_requests_update" ON contract_requests FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_contract_requests_delete" ON contract_requests FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_templates
CREATE POLICY "mt_contract_templates_select" ON contract_templates FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_templates_insert" ON contract_templates FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));
CREATE POLICY "mt_contract_templates_update" ON contract_templates FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role]));
CREATE POLICY "mt_contract_templates_delete" ON contract_templates FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- contract_redlines
CREATE POLICY "mt_contract_redlines_select" ON contract_redlines FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_contract_redlines_insert" ON contract_redlines FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]) AND auth.uid() = created_by);
CREATE POLICY "mt_contract_redlines_update" ON contract_redlines FOR UPDATE USING (organization_id = current_user_org() AND ((created_by = auth.uid() AND status = 'draft') OR has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role])));
CREATE POLICY "mt_contract_redlines_delete" ON contract_redlines FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- unidades
CREATE POLICY "mt_unidades_select" ON unidades FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_unidades_insert" ON unidades FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_unidades_update" ON unidades FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_unidades_delete" ON unidades FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- franquias
CREATE POLICY "mt_franquias_select" ON franquias FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_franquias_insert" ON franquias FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_franquias_update" ON franquias FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_franquias_delete" ON franquias FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- especificacoes_servico
CREATE POLICY "mt_especificacoes_servico_select" ON especificacoes_servico FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_especificacoes_servico_insert" ON especificacoes_servico FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_especificacoes_servico_update" ON especificacoes_servico FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_especificacoes_servico_delete" ON especificacoes_servico FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- fornecedor_anexos
CREATE POLICY "mt_fornecedor_anexos_select" ON fornecedor_anexos FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_fornecedor_anexos_insert" ON fornecedor_anexos FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedor_anexos_update" ON fornecedor_anexos FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedor_anexos_delete" ON fornecedor_anexos FOR DELETE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- fornecedor_categorias_servico
CREATE POLICY "mt_fornecedor_categorias_select" ON fornecedor_categorias_servico FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_fornecedor_categorias_insert" ON fornecedor_categorias_servico FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedor_categorias_update" ON fornecedor_categorias_servico FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_fornecedor_categorias_delete" ON fornecedor_categorias_servico FOR DELETE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));

-- user_roles (org-scoped)
CREATE POLICY "mt_user_roles_select" ON user_roles FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_user_roles_insert" ON user_roles FOR INSERT WITH CHECK (organization_id = current_user_org() AND is_org_admin(auth.uid(), organization_id));
CREATE POLICY "mt_user_roles_update" ON user_roles FOR UPDATE USING (organization_id = current_user_org() AND is_org_admin(auth.uid(), organization_id));
CREATE POLICY "mt_user_roles_delete" ON user_roles FOR DELETE USING (organization_id = current_user_org() AND is_org_owner(auth.uid(), organization_id));

-- notification_preferences
CREATE POLICY "mt_notification_preferences_select" ON notification_preferences FOR SELECT USING (organization_id = current_user_org() AND (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));
CREATE POLICY "mt_notification_preferences_insert" ON notification_preferences FOR INSERT WITH CHECK (organization_id = current_user_org() AND user_id = auth.uid());
CREATE POLICY "mt_notification_preferences_update" ON notification_preferences FOR UPDATE USING (organization_id = current_user_org() AND user_id = auth.uid());

-- audit_logs (immutable, admin-only view)
CREATE POLICY "mt_audit_logs_select" ON audit_logs FOR SELECT USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- compliance_logs (immutable, admin-only view)
CREATE POLICY "mt_compliance_logs_select" ON compliance_logs FOR SELECT USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_compliance_logs_insert" ON compliance_logs FOR INSERT WITH CHECK (true);

-- security_metrics
CREATE POLICY "mt_security_metrics_select" ON security_metrics FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_security_metrics_insert" ON security_metrics FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_security_metrics_update" ON security_metrics FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_security_metrics_delete" ON security_metrics FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- report_configurations
CREATE POLICY "mt_report_configurations_select" ON report_configurations FOR SELECT USING (organization_id = current_user_org() AND (is_public = true OR created_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));
CREATE POLICY "mt_report_configurations_insert" ON report_configurations FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() = created_by);
CREATE POLICY "mt_report_configurations_update" ON report_configurations FOR UPDATE USING (organization_id = current_user_org() AND (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));
CREATE POLICY "mt_report_configurations_delete" ON report_configurations FOR DELETE USING (organization_id = current_user_org() AND (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));

-- negotiation_metrics
CREATE POLICY "mt_negotiation_metrics_select" ON negotiation_metrics FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_negotiation_metrics_insert" ON negotiation_metrics FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_negotiation_metrics_update" ON negotiation_metrics FOR UPDATE USING (organization_id = current_user_org() AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]));
CREATE POLICY "mt_negotiation_metrics_delete" ON negotiation_metrics FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- approval_workflows
CREATE POLICY "mt_approval_workflows_select" ON approval_workflows FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_approval_workflows_insert" ON approval_workflows FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_approval_workflows_update" ON approval_workflows FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_approval_workflows_delete" ON approval_workflows FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- integracao_config
CREATE POLICY "mt_integracao_config_select" ON integracao_config FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_integracao_config_insert" ON integracao_config FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_integracao_config_update" ON integracao_config FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_integracao_config_delete" ON integracao_config FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- data_retention_policies
CREATE POLICY "mt_data_retention_policies_select" ON data_retention_policies FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_data_retention_policies_insert" ON data_retention_policies FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_data_retention_policies_update" ON data_retention_policies FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_data_retention_policies_delete" ON data_retention_policies FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- go_nogo_checklist
CREATE POLICY "mt_go_nogo_checklist_select" ON go_nogo_checklist FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_go_nogo_checklist_insert" ON go_nogo_checklist FOR INSERT WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_go_nogo_checklist_update" ON go_nogo_checklist FOR UPDATE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "mt_go_nogo_checklist_delete" ON go_nogo_checklist FOR DELETE USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

-- sod_approvals
CREATE POLICY "mt_sod_approvals_select" ON sod_approvals FOR SELECT USING (organization_id = current_user_org() AND (creator_id = auth.uid() OR approver_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));
CREATE POLICY "mt_sod_approvals_insert" ON sod_approvals FOR INSERT WITH CHECK (organization_id = current_user_org() AND auth.uid() IS NOT NULL AND creator_id = auth.uid());
CREATE POLICY "mt_sod_approvals_update" ON sod_approvals FOR UPDATE USING (organization_id = current_user_org() AND (approver_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)));

-- solicitacoes_compras
CREATE POLICY "mt_solicitacoes_compras_select" ON solicitacoes_compras FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY "mt_solicitacoes_compras_insert" ON solicitacoes_compras FOR INSERT WITH CHECK (organization_id = current_user_org());
CREATE POLICY "mt_solicitacoes_compras_update" ON solicitacoes_compras FOR UPDATE USING (organization_id = current_user_org());

-- =====================================================
-- STEP 4: ADD NOT NULL CONSTRAINTS
-- =====================================================

ALTER TABLE contratos ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE fornecedores ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_alerts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_obligations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_approvals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_signatures ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_analysis ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_attachments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_comments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_versions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_templates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contract_redlines ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE unidades ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE franquias ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE especificacoes_servico ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE fornecedor_anexos ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE fornecedor_categorias_servico ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE compliance_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE security_metrics ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE report_configurations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE negotiation_metrics ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE approval_workflows ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE integracao_config ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE data_retention_policies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE go_nogo_checklist ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sod_approvals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE solicitacoes_compras ALTER COLUMN organization_id SET NOT NULL;