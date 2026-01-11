-- Criar função helper para verificar múltiplos roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = ANY(_roles)
  )
$$;

-- 1. Corrigir contract_history - INSERT
DROP POLICY IF EXISTS "Users can insert contract history" ON contract_history;
CREATE POLICY "Authorized users can insert contract history" ON contract_history
FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['analista_juridico', 'consultoria_juridica', 'administrador']::app_role[])
);

-- 2. Corrigir contract_alerts - ALL
DROP POLICY IF EXISTS "System can manage alerts" ON contract_alerts;
CREATE POLICY "Admins and consultores can manage alerts" ON contract_alerts
FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador', 'consultoria_juridica']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['administrador', 'consultoria_juridica']::app_role[]));

-- 3. Corrigir contract_signatures - UPDATE
DROP POLICY IF EXISTS "Sistema pode atualizar assinaturas via webhook" ON contract_signatures;
CREATE POLICY "Admins e consultores podem atualizar assinaturas" ON contract_signatures
FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['administrador', 'consultoria_juridica']::app_role[]));

-- 4. Corrigir contract_analysis - INSERT
DROP POLICY IF EXISTS "System can create analysis" ON contract_analysis;
CREATE POLICY "Consultores e admins podem criar análises" ON contract_analysis
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['administrador', 'consultoria_juridica']::app_role[]));