-- Allow any authenticated user to view invites (needed for the accept-invite flow)
DROP POLICY IF EXISTS "Users can view own invites" ON public.organization_invites;

CREATE POLICY "Authenticated users can view invites"
  ON public.organization_invites
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon users to view invites by token (for pre-login accept flow)
CREATE POLICY "Anyone can view invites"
  ON public.organization_invites
  FOR SELECT
  TO anon
  USING (true);