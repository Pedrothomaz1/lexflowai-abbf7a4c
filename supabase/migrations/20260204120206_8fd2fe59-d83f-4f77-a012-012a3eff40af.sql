-- =============================================
-- Consolidacao de Politicas RLS: contract_requests
-- =============================================

-- 1. Remover politicas duplicadas/antigas
DROP POLICY IF EXISTS "Público pode inserir requisições" ON contract_requests;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Consultores e admins podem atualizar requisições" ON contract_requests;
DROP POLICY IF EXISTS "Admins podem deletar requisições" ON contract_requests;

-- 2. Recriar SELECT para incluir requisicoes sem organizacao
DROP POLICY IF EXISTS "mt_contract_requests_select" ON contract_requests;

CREATE POLICY "mt_contract_requests_select" ON contract_requests
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY[
    'analista_juridico'::app_role, 
    'consultoria_juridica'::app_role, 
    'administrador'::app_role
  ])
  AND (
    organization_id IS NULL
    OR organization_id = current_user_org()
  )
);