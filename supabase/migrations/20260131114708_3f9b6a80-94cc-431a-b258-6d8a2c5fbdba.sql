-- Fix: Create function to check pending invite for current user
CREATE OR REPLACE FUNCTION public.check_pending_invite_for_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id UUID;
  v_invite_token TEXT;
  v_invite_role TEXT;
  v_invite_expires TIMESTAMPTZ;
  v_org_name TEXT;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('has_invite', false);
  END IF;
  
  -- Find pending invite
  SELECT 
    oi.id,
    oi.token,
    oi.role_in_org,
    oi.expires_at,
    o.nome
  INTO 
    v_invite_id,
    v_invite_token,
    v_invite_role,
    v_invite_expires,
    v_org_name
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE LOWER(oi.email) = LOWER(v_user_email)
    AND oi.accepted_at IS NULL
    AND oi.expires_at > NOW()
  ORDER BY oi.created_at DESC
  LIMIT 1;
  
  IF v_invite_id IS NULL THEN
    RETURN jsonb_build_object('has_invite', false);
  END IF;
  
  RETURN jsonb_build_object(
    'has_invite', true,
    'token', v_invite_token,
    'organization_name', v_org_name,
    'role', v_invite_role,
    'expires_at', v_invite_expires
  );
END;
$$;