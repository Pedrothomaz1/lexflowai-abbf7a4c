
-- 1. Migrar usuários existentes de consultoria_juridica → analista_juridico
UPDATE public.user_roles
SET role = 'analista_juridico'::app_role
WHERE role = 'consultoria_juridica'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = user_roles.user_id
      AND ur2.role = 'analista_juridico'::app_role
      AND ur2.organization_id = user_roles.organization_id
  );

-- Remover duplicatas restantes (caso já existisse analista_juridico)
DELETE FROM public.user_roles WHERE role = 'consultoria_juridica'::app_role;

-- 2. Limpar permissões/MFA
DELETE FROM public.role_permissions WHERE role = 'consultoria_juridica'::app_role;
DELETE FROM public.mfa_requirements WHERE role = 'consultoria_juridica'::app_role;

-- 3. Converter convites pendentes
UPDATE public.organization_invites
SET role_in_org = 'membro'
WHERE role_in_org = 'consultoria'
  AND accepted_at IS NULL;

-- 4. Atualizar accept_organization_invite para não criar mais consultoria_juridica
CREATE OR REPLACE FUNCTION public.accept_organization_invite(invite_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_id UUID;
  v_existing_member UUID;
  v_app_role app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email do usuário não encontrado');
  END IF;

  SELECT * INTO v_invite FROM public.organization_invites WHERE token = invite_token LIMIT 1;
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado');
  END IF;
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite já foi aceito');
  END IF;
  IF v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite expirado');
  END IF;
  IF LOWER(v_user_email) != LOWER(v_invite.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este convite foi enviado para outro email');
  END IF;

  -- Mapeamento atualizado: consultoria removida, vira analista_juridico
  v_app_role := CASE
    WHEN v_invite.role_in_org IN ('owner', 'admin') THEN 'administrador'::app_role
    ELSE 'analista_juridico'::app_role
  END;

  SELECT id INTO v_existing_member
  FROM public.organization_members
  WHERE user_id = v_user_id AND organization_id = v_invite.organization_id;

  IF v_existing_member IS NOT NULL THEN
    UPDATE public.organization_invites SET accepted_at = NOW() WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'message', 'Já é membro desta organização');
  END IF;

  INSERT INTO public.organization_members (user_id, organization_id, role_in_org, is_active, joined_at)
  VALUES (v_user_id, v_invite.organization_id, v_invite.role_in_org, true, NOW());

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (v_user_id, v_app_role, v_invite.organization_id)
  ON CONFLICT (user_id, role) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  UPDATE public.organization_invites SET accepted_at = NOW() WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role_in_org
  );
END;
$function$;
