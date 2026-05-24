
DROP POLICY IF EXISTS mt_security_alerts_insert ON public.security_alerts;

CREATE POLICY mt_security_alerts_service_role_insert
ON public.security_alerts
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
);
