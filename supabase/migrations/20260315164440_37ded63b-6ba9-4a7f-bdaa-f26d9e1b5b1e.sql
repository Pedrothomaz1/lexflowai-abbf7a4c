-- ============================================================
-- ERROR FIX 1: fornecedores_safe view — enable RLS (it's a view, need to secure it)
-- Views don't support RLS directly, so we recreate with security_invoker
-- ============================================================

DROP VIEW IF EXISTS public.fornecedores_safe;

CREATE VIEW public.fornecedores_safe
WITH (security_invoker = true)
AS SELECT 
  id, nome, cnpj, cidade, estado, email, telefone, 
  is_active, organization_id, created_at, updated_at,
  tipo_pessoa, porte_empresa, contato_nome, contato_email, contato_telefone, contato_cargo
FROM public.fornecedores;

-- ============================================================
-- ERROR FIX 2: security_alerts INSERT — fix anonymous branch
-- ============================================================

DROP POLICY IF EXISTS "mt_security_alerts_insert" ON public.security_alerts;

CREATE POLICY "mt_security_alerts_insert"
ON public.security_alerts
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARN FIX 1: profiles_safe view — recreate with security_invoker
-- ============================================================

DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS SELECT 
  id, full_name, department, avatar_url, created_at, updated_at
FROM public.profiles;

-- ============================================================
-- WARN FIX 2: uso_sistema INSERT — add org scoping
-- ============================================================

DROP POLICY IF EXISTS "authenticated_or_service_insert_usage" ON public.uso_sistema;

CREATE POLICY "authenticated_or_service_insert_usage"
ON public.uso_sistema
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL)
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARN FIX 3: current_user_org() — add deterministic ORDER BY
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND is_active = true 
  ORDER BY joined_at ASC
  LIMIT 1;
$$;