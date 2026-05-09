
-- 1) Helper: admin status scoped to a specific org (no reliance on current_user_org)
CREATE OR REPLACE FUNCTION public.is_admin_of_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'administrador'::app_role
      AND organization_id = _org_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_of_org(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of_org(uuid, uuid) TO authenticated, service_role;

-- 2) Fix user_roles policies: pin to org where caller is admin
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS mt_user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS mt_user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS mt_user_roles_delete ON public.user_roles;

CREATE POLICY mt_user_roles_insert ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_org(auth.uid(), organization_id));

CREATE POLICY mt_user_roles_update ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin_of_org(auth.uid(), organization_id))
WITH CHECK (public.is_admin_of_org(auth.uid(), organization_id));

CREATE POLICY mt_user_roles_delete ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin_of_org(auth.uid(), organization_id));

-- 3) Restrict integracao_config SELECT to admins
DROP POLICY IF EXISTS mt_integracao_config_select ON public.integracao_config;
CREATE POLICY mt_integracao_config_select ON public.integracao_config
FOR SELECT TO authenticated
USING (
  organization_id = current_user_org()
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- 4) Realtime: scope channel topics to caller's org or user
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;

CREATE POLICY "Realtime topic scoped to org or user"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Default postgres_changes channels (no explicit topic prefix) still rely on
  -- the underlying table RLS, which is already enforced. We allow these and
  -- block only explicit cross-org topic prefixes.
  topic IS NULL
  OR topic = ''
  OR topic NOT LIKE 'org:%' -- non org-prefixed channels gated by source RLS
  OR topic LIKE ('org:' || current_user_org()::text || ':%')
  OR topic = ('user:' || auth.uid()::text)
);
