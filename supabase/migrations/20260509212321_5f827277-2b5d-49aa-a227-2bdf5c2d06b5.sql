
-- 1) Single active org per user
DELETE FROM public.organization_members om
USING public.organization_members om2
WHERE om.user_id = om2.user_id
  AND om.is_active = true
  AND om2.is_active = true
  AND om.id <> om2.id
  AND om.joined_at > om2.joined_at;

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_active_per_user
ON public.organization_members(user_id)
WHERE is_active = true;

-- 2) contract_requests: restrict SELECT to roles
DROP POLICY IF EXISTS mt_contract_requests_select ON public.contract_requests;
CREATE POLICY mt_contract_requests_select
ON public.contract_requests
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
  AND has_any_role(auth.uid(), ARRAY['administrador','analista_juridico','consultoria_juridica']::app_role[])
);

-- 3) login_attempts: own user or service role only
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS users_view_own_login_attempts ON public.login_attempts;
CREATE POLICY users_view_own_login_attempts
ON public.login_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (auth.jwt() ->> 'role') = 'service_role'
);

-- 4) user_sessions: own user only (admin path removed to avoid token exposure)
DROP POLICY IF EXISTS users_view_own_sessions ON public.user_sessions;
CREATE POLICY users_view_own_sessions
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (auth.jwt() ->> 'role') = 'service_role'
);
