-- ============================================================
-- AUDITORIA COMPLETA DE RLS - CORREÇÕES DE SEGURANÇA
-- ============================================================

-- ============================================================
-- 1. user_roles: Remover política permissiva "Users can view all roles"
--    A política mt_user_roles_select já faz o correto
-- ============================================================
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- ============================================================
-- 2. contract_approvals: Remover política permissiva "Users can view contract approvals"
--    A política mt_contract_approvals_select já faz o correto
-- ============================================================
DROP POLICY IF EXISTS "Users can view contract approvals" ON public.contract_approvals;
DROP POLICY IF EXISTS "Consultores e admins podem criar aprovações" ON public.contract_approvals;
DROP POLICY IF EXISTS "Users can update own approvals" ON public.contract_approvals;

-- ============================================================
-- 3. servicos_periodicos: Adicionar isolamento multi-tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view servicos" ON public.servicos_periodicos;
DROP POLICY IF EXISTS "Authorized users can insert servicos" ON public.servicos_periodicos;
DROP POLICY IF EXISTS "Authorized users can update servicos" ON public.servicos_periodicos;
DROP POLICY IF EXISTS "Admins can delete servicos" ON public.servicos_periodicos;

CREATE POLICY "mt_servicos_periodicos_select"
ON public.servicos_periodicos
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_user_org()
);

CREATE POLICY "mt_servicos_periodicos_insert"
ON public.servicos_periodicos
FOR INSERT
WITH CHECK (
  organization_id = current_user_org() 
  AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);

CREATE POLICY "mt_servicos_periodicos_update"
ON public.servicos_periodicos
FOR UPDATE
USING (
  organization_id = current_user_org() 
  AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);

CREATE POLICY "mt_servicos_periodicos_delete"
ON public.servicos_periodicos
FOR DELETE
USING (
  organization_id = current_user_org() 
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- ============================================================
-- 4. servico_historico: Adicionar isolamento multi-tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view historico" ON public.servico_historico;
DROP POLICY IF EXISTS "Authorized users can insert historico" ON public.servico_historico;
DROP POLICY IF EXISTS "Authorized users can update historico" ON public.servico_historico;

CREATE POLICY "mt_servico_historico_select"
ON public.servico_historico
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_user_org()
);

CREATE POLICY "mt_servico_historico_insert"
ON public.servico_historico
FOR INSERT
WITH CHECK (
  organization_id = current_user_org() 
  AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);

CREATE POLICY "mt_servico_historico_update"
ON public.servico_historico
FOR UPDATE
USING (
  organization_id = current_user_org() 
  AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);

CREATE POLICY "mt_servico_historico_delete"
ON public.servico_historico
FOR DELETE
USING (
  organization_id = current_user_org() 
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- ============================================================
-- 5. especificacoes_servico: Remover políticas antigas sem org
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete especificacoes" ON public.especificacoes_servico;
DROP POLICY IF EXISTS "Authorized users can insert especificacoes" ON public.especificacoes_servico;
DROP POLICY IF EXISTS "Authorized users can update especificacoes" ON public.especificacoes_servico;

-- ============================================================
-- 6. fornecedor_categorias_servico: Remover políticas antigas sem org
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view fornecedor categories" ON public.fornecedor_categorias_servico;
DROP POLICY IF EXISTS "Delete fornecedor categories" ON public.fornecedor_categorias_servico;
DROP POLICY IF EXISTS "Manage fornecedor categories" ON public.fornecedor_categorias_servico;
DROP POLICY IF EXISTS "Update fornecedor categories" ON public.fornecedor_categorias_servico;

-- ============================================================
-- 7. fornecedores: Remover políticas antigas sem isolamento de org
-- ============================================================
DROP POLICY IF EXISTS "Analistas e consultores podem atualizar fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Analistas e consultores podem criar fornecedores" ON public.fornecedores;
-- Manter apenas as políticas mt_ que têm isolamento correto

-- Remover políticas duplicadas de SELECT (manter apenas mt_fornecedores_select)
DROP POLICY IF EXISTS "mt_fornecedores_select_basic" ON public.fornecedores;
DROP POLICY IF EXISTS "mt_fornecedores_select_full" ON public.fornecedores;

-- ============================================================
-- 8. contract_analysis: Remover política antiga sem org
-- ============================================================
DROP POLICY IF EXISTS "Authorized users can view analysis" ON public.contract_analysis;
DROP POLICY IF EXISTS "Consultores e admins podem criar análises" ON public.contract_analysis;

-- ============================================================
-- 9. integracao_config: Remover políticas antigas sem org
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete integracao config" ON public.integracao_config;
DROP POLICY IF EXISTS "Admins can insert integracao config" ON public.integracao_config;
DROP POLICY IF EXISTS "Admins can update integracao config" ON public.integracao_config;
DROP POLICY IF EXISTS "Admins can view integracao config" ON public.integracao_config;

-- ============================================================
-- 10. security_alerts: Adicionar isolamento por organização
-- ============================================================
DROP POLICY IF EXISTS "Admins and auditors can view security_alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Admins can update security_alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Authorized system can insert security_alerts" ON public.security_alerts;

CREATE POLICY "mt_security_alerts_select"
ON public.security_alerts
FOR SELECT
USING (
  organization_id = current_user_org() 
  AND (has_role(auth.uid(), 'administrador'::app_role) OR has_permission(auth.uid(), 'audit:read'::text))
);

CREATE POLICY "mt_security_alerts_insert"
ON public.security_alerts
FOR INSERT
WITH CHECK (
  (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role))
  OR auth.uid() IS NULL -- Allow system/service role inserts
);

CREATE POLICY "mt_security_alerts_update"
ON public.security_alerts
FOR UPDATE
USING (
  organization_id = current_user_org() 
  AND has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "mt_security_alerts_delete"
ON public.security_alerts
FOR DELETE
USING (
  organization_id = current_user_org() 
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- ============================================================
-- 11. go_nogo_checklist: Remover política antiga sem org
-- ============================================================
DROP POLICY IF EXISTS "admins_manage_gonogo" ON public.go_nogo_checklist;

-- ============================================================
-- 12. incident_playbooks: Esta tabela é global (sem organization_id)
--     Portanto as políticas atuais estão corretas (admin-only)
-- ============================================================

-- ============================================================
-- 13. Verificar se todas as tabelas críticas têm RLS habilitado
-- ============================================================
-- (Todas já têm RLS habilitado baseado na auditoria)