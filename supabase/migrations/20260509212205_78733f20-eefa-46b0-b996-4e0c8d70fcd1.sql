
-- profiles: scope admin SELECT to own org members
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles in own org"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = profiles.id
      AND om.organization_id = current_user_org()
      AND om.is_active = true
  )
);

-- user_sessions: scope admin SELECT to own org members
DROP POLICY IF EXISTS users_view_own_sessions ON public.user_sessions;
CREATE POLICY users_view_own_sessions
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    has_role(auth.uid(), 'administrador'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = user_sessions.user_id
        AND om.organization_id = current_user_org()
        AND om.is_active = true
    )
  )
);

-- security_metrics: admin-only SELECT
DROP POLICY IF EXISTS mt_security_metrics_select ON public.security_metrics;
CREATE POLICY mt_security_metrics_select
ON public.security_metrics
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
  AND has_role(auth.uid(), 'administrador'::app_role)
);
