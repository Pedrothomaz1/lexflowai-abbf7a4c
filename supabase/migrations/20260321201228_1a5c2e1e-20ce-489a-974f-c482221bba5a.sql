
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_in_org TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email, token)
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage invites for their org
CREATE POLICY "Org admins can manage invites"
  ON public.organization_invites
  FOR ALL
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Users can view invites sent to their email
CREATE POLICY "Users can view own invites"
  ON public.organization_invites
  FOR SELECT
  TO authenticated
  USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));
