
-- Add created_by to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill from earliest owner
UPDATE public.organizations o
SET created_by = sub.user_id
FROM (
  SELECT DISTINCT ON (organization_id) organization_id, user_id
  FROM public.organization_members
  WHERE role_in_org = 'owner'
  ORDER BY organization_id, joined_at ASC
) sub
WHERE o.id = sub.organization_id AND o.created_by IS NULL;

-- Lock down first-member self-assignment
DROP POLICY IF EXISTS "Users can add themselves as first org member" ON public.organization_members;
DROP POLICY IF EXISTS "Org creator becomes first member" ON public.organization_members;

CREATE POLICY "Org creator becomes first member"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role_in_org = 'owner'
  AND COALESCE(is_active, true) = true
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.organization_id
      AND o.created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
  )
);

-- uso_sistema: add organization_id and scope
ALTER TABLE public.uso_sistema ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.uso_sistema us
SET organization_id = c.organization_id
FROM public.contratos c
WHERE us.organization_id IS NULL AND us.contrato_id = c.id;

UPDATE public.uso_sistema us
SET organization_id = ur.organization_id
FROM public.user_roles ur
WHERE us.organization_id IS NULL AND us.user_id = ur.user_id;

CREATE INDEX IF NOT EXISTS uso_sistema_org_idx ON public.uso_sistema(organization_id);

DROP POLICY IF EXISTS "Admins can view all usage" ON public.uso_sistema;
CREATE POLICY mt_uso_sistema_admin_select
ON public.uso_sistema
FOR SELECT
TO authenticated
USING (
  organization_id = current_user_org()
  AND has_role(auth.uid(), 'administrador'::app_role)
);

DROP POLICY IF EXISTS mt_uso_sistema_service_insert ON public.uso_sistema;
CREATE POLICY mt_uso_sistema_service_insert
ON public.uso_sistema
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR (organization_id = current_user_org() AND user_id = auth.uid())
);
