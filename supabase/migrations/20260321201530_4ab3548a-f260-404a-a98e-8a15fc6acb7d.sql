DROP POLICY IF EXISTS "Users can view own invites" ON public.organization_invites;

CREATE POLICY "Users can view own invites"
  ON public.organization_invites
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );