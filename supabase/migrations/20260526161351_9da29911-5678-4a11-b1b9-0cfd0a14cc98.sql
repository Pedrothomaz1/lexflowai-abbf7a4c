CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token text)
RETURNS TABLE(email text, role_in_org text, expires_at timestamptz, accepted_at timestamptz, organization_id uuid, organization_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email, i.role_in_org::text, i.expires_at, i.accepted_at, i.organization_id, o.nome
  FROM public.organization_invites i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;