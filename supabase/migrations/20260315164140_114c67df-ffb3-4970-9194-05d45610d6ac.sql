-- Fix notifications INSERT policy — allow service role and authenticated users only
DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;

CREATE POLICY "system_insert_notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- contract_requests INSERT stays as-is (intentionally public for /requisicao page)
-- but add a comment via a no-op to document the decision
COMMENT ON POLICY "mt_contract_requests_insert" ON public.contract_requests 
IS 'Intentionally public: allows unauthenticated users to submit contract requests via /requisicao page';