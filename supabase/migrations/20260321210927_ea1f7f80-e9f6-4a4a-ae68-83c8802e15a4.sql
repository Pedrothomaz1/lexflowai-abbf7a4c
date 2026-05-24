
-- Allow authenticated users to look up invites by token (needed for accept invite flow)
-- The anon policy blocks all access, but authenticated users who aren't in any org
-- need to find their invite by token
CREATE POLICY "Authenticated users can view invites by token"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (true);
