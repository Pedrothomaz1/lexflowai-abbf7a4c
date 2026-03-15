-- ============================================================
-- CRITICAL FIX 1: user_sessions — replace anonymous access with service-role check
-- ============================================================

DROP POLICY IF EXISTS "system_manage_sessions" ON public.user_sessions;

CREATE POLICY "service_role_manage_sessions"
ON public.user_sessions
FOR ALL
TO public
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- CRITICAL FIX 2: rate_limits — replace anonymous access with service-role check
-- ============================================================

DROP POLICY IF EXISTS "Service role can manage rate_limits" ON public.rate_limits;

CREATE POLICY "service_role_manage_rate_limits"
ON public.rate_limits
FOR ALL
TO public
USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- CRITICAL FIX 3: has_role / has_any_role / has_permission — add org scoping
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND organization_id = current_user_org()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
      AND organization_id = current_user_org()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.name = _permission
      AND ur.organization_id = current_user_org()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT has_role(auth.uid(), 'administrador'::app_role)
$$;

-- ============================================================
-- WARNING FIX 1: compliance_logs INSERT — require auth + org scoping
-- ============================================================

DROP POLICY IF EXISTS "mt_compliance_logs_insert" ON public.compliance_logs;

CREATE POLICY "mt_compliance_logs_insert"
ON public.compliance_logs
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARNING FIX 2: audit_logs INSERT — remove anonymous branch
-- ============================================================

DROP POLICY IF EXISTS "mt_audit_logs_insert_restricted" ON public.audit_logs;

CREATE POLICY "mt_audit_logs_insert_restricted"
ON public.audit_logs
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARNING FIX 3: uso_sistema INSERT — require auth
-- ============================================================

DROP POLICY IF EXISTS "System can insert usage" ON public.uso_sistema;

CREATE POLICY "authenticated_or_service_insert_usage"
ON public.uso_sistema
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ============================================================
-- WARNING FIX 4: login_attempts INSERT — tighten but allow service role
-- ============================================================

DROP POLICY IF EXISTS "Authenticated or anonymous can insert login attempts" ON public.login_attempts;

CREATE POLICY "service_or_auth_insert_login_attempts"
ON public.login_attempts
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);