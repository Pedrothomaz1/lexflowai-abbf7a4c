
CREATE OR REPLACE FUNCTION public.accept_organization_invite(invite_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_id UUID;
  v_existing_member UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Get authenticated user's email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email do usuário não encontrado');
  END IF;

  -- Find the invite by token
  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = invite_token
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado');
  END IF;

  -- Check if already accepted
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite já foi aceito');
  END IF;

  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite expirado');
  END IF;

  -- SERVER-SIDE EMAIL VALIDATION: ensure the authenticated user's email matches the invite
  IF LOWER(v_user_email) != LOWER(v_invite.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este convite foi enviado para outro email');
  END IF;

  -- Check if user is already a member of this organization
  SELECT id INTO v_existing_member
  FROM public.organization_members
  WHERE user_id = v_user_id
    AND organization_id = v_invite.organization_id;

  IF v_existing_member IS NOT NULL THEN
    -- Mark invite as accepted anyway
    UPDATE public.organization_invites
    SET accepted_at = NOW()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'message', 'Já é membro desta organização');
  END IF;

  -- Add user as organization member
  INSERT INTO public.organization_members (
    user_id,
    organization_id,
    role_in_org,
    is_active,
    joined_at
  ) VALUES (
    v_user_id,
    v_invite.organization_id,
    v_invite.role_in_org,
    true,
    NOW()
  );

  -- Assign default role if not already assigned
  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (v_user_id, 'analista_juridico'::app_role, v_invite.organization_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark invite as accepted
  UPDATE public.organization_invites
  SET accepted_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role_in_org
  );
END;
$$;
