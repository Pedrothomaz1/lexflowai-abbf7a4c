
CREATE OR REPLACE FUNCTION public.promote_super_admin_by_email(_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  INSERT INTO public.super_admins (user_id, granted_by)
  VALUES (v_user_id, auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_super_admin_by_email(_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode remover seu próprio acesso');
  END IF;

  DELETE FROM public.super_admins WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS TABLE(user_id uuid, email text, full_name text, granted_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.user_id, p.email, p.full_name, sa.created_at
  FROM public.super_admins sa
  LEFT JOIN public.profiles p ON p.id = sa.user_id
  WHERE public.is_super_admin(auth.uid())
  ORDER BY sa.created_at DESC;
$$;
