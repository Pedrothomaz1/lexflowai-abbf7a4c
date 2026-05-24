-- Helper SECURITY DEFINER to bypass organizations RLS during onboarding
CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND created_by = _user_id
  );
$$;

-- Replace the policy to use the security definer helper
DROP POLICY IF EXISTS "Org creator becomes first member" ON public.organization_members;

CREATE POLICY "Org creator becomes first member"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role_in_org = 'owner'
  AND COALESCE(is_active, true) = true
  AND public.is_org_creator(auth.uid(), organization_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
  )
);