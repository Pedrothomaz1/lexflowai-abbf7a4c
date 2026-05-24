
-- =============================================================
-- FIX 1: Restrict fornecedores SELECT to authorized roles only
-- =============================================================
DROP POLICY IF EXISTS "mt_fornecedores_select" ON public.fornecedores;

CREATE POLICY "mt_fornecedores_select" ON public.fornecedores
  FOR SELECT TO public
  USING (
    (organization_id = current_user_org())
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
  );

-- =============================================================
-- FIX 2: Replace bypassable current_setting service_role checks
--         with secure (auth.jwt() ->> 'role') = 'service_role'
-- =============================================================

-- audit_logs INSERT
DROP POLICY IF EXISTS "mt_audit_logs_insert_restricted" ON public.audit_logs;
CREATE POLICY "mt_audit_logs_insert_restricted" ON public.audit_logs
  FOR INSERT TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (organization_id = current_user_org()))
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

-- compliance_logs INSERT
DROP POLICY IF EXISTS "mt_compliance_logs_insert" ON public.compliance_logs;
CREATE POLICY "mt_compliance_logs_insert" ON public.compliance_logs
  FOR INSERT TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (organization_id = current_user_org()))
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

-- contract_requests INSERT
DROP POLICY IF EXISTS "mt_contract_requests_insert" ON public.contract_requests;
CREATE POLICY "mt_contract_requests_insert" ON public.contract_requests
  FOR INSERT TO public
  WITH CHECK (
    ((organization_id = current_user_org()) AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role]))
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

-- login_attempts INSERT
DROP POLICY IF EXISTS "service_role_insert_login_attempts" ON public.login_attempts;
CREATE POLICY "service_role_insert_login_attempts" ON public.login_attempts
  FOR INSERT TO public
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- notifications INSERT
DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (organization_id = current_user_org()))
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

-- rate_limits ALL
DROP POLICY IF EXISTS "service_role_manage_rate_limits" ON public.rate_limits;
CREATE POLICY "service_role_manage_rate_limits" ON public.rate_limits
  FOR ALL TO public
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- security_alerts INSERT
DROP POLICY IF EXISTS "mt_security_alerts_insert" ON public.security_alerts;
CREATE POLICY "mt_security_alerts_insert" ON public.security_alerts
  FOR INSERT TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (organization_id = current_user_org()))
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

-- user_sessions ALL
DROP POLICY IF EXISTS "service_role_manage_sessions" ON public.user_sessions;
CREATE POLICY "service_role_manage_sessions" ON public.user_sessions
  FOR ALL TO public
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- uso_sistema INSERT
DROP POLICY IF EXISTS "service_role_insert_usage" ON public.uso_sistema;
CREATE POLICY "service_role_insert_usage" ON public.uso_sistema
  FOR INSERT TO public
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- =============================================================
-- FIX 3: Tighten organization_invites SELECT policy
-- =============================================================
DROP POLICY IF EXISTS "authenticated_view_invites" ON public.organization_invites;

CREATE POLICY "authenticated_view_invites" ON public.organization_invites
  FOR SELECT TO authenticated
  USING (
    (token = current_setting('request.headers.x-invite-token', true))
    OR is_org_admin(auth.uid(), organization_id)
  );

-- =============================================================
-- FIX 4: Make contratos-documentos bucket private
-- =============================================================
UPDATE storage.buckets
SET public = false
WHERE id = 'contratos-documentos';
