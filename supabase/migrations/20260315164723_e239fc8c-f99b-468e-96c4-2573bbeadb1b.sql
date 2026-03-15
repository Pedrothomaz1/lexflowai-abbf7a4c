-- ============================================================
-- ERROR FIX: contract_requests — secure the INSERT and fix SELECT cross-tenant
-- Keep public submissions but require organization_id to be NULL for anonymous
-- and restrict SELECT to not expose cross-tenant data
-- ============================================================

-- Fix INSERT: allow anonymous but require sanitized fields
DROP POLICY IF EXISTS "mt_contract_requests_insert" ON public.contract_requests;

CREATE POLICY "mt_contract_requests_insert"
ON public.contract_requests
FOR INSERT
TO public
WITH CHECK (
  -- Authenticated users: must match their org
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  -- Anonymous users: organization_id must be NULL (public form)
  OR (auth.uid() IS NULL AND organization_id IS NULL)
  -- Service role
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Fix SELECT: remove organization_id IS NULL branch exposure
DROP POLICY IF EXISTS "mt_contract_requests_select" ON public.contract_requests;

CREATE POLICY "mt_contract_requests_select"
ON public.contract_requests
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
);

-- ============================================================
-- ERROR FIX: uso_sistema — restrict INSERT to service_role only
-- ============================================================

DROP POLICY IF EXISTS "authenticated_or_service_insert_usage" ON public.uso_sistema;

CREATE POLICY "service_role_insert_usage"
ON public.uso_sistema
FOR INSERT
TO public
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARN FIX: login_attempts — restrict INSERT to service_role only
-- ============================================================

DROP POLICY IF EXISTS "service_or_auth_insert_login_attempts" ON public.login_attempts;

CREATE POLICY "service_role_insert_login_attempts"
ON public.login_attempts
FOR INSERT
TO public
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARN FIX: solicitacoes_compras UPDATE — add role check
-- ============================================================

DROP POLICY IF EXISTS "mt_solicitacoes_compras_update" ON public.solicitacoes_compras;

CREATE POLICY "mt_solicitacoes_compras_update"
ON public.solicitacoes_compras
FOR UPDATE
TO public
USING (
  organization_id = current_user_org()
  AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'administrador'::app_role])
);