-- Allow users to see their own organization membership regardless of organization status.
-- This lets the app route pending/suspended/active accounts correctly instead of treating them as "no organization".
DROP POLICY IF EXISTS users_select_own_membership_any_org_status ON public.organization_members;
CREATE POLICY users_select_own_membership_any_org_status
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to see the organization record they belong to regardless of status.
-- Existing domain data policies still depend on current_user_org(), so business data remains limited to active orgs.
DROP POLICY IF EXISTS users_select_member_organizations_any_status ON public.organizations;
CREATE POLICY users_select_member_organizations_any_status
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.is_active = true
  )
);

-- Legacy cleanup: after removing onboarding, old pending organizations should no longer trap users.
UPDATE public.organizations
SET status = 'ativa',
    aprovada_em = COALESCE(aprovada_em, now()),
    motivo_suspensao = NULL,
    suspensa_em = NULL,
    suspensa_por = NULL
WHERE status = 'pendente_aprovacao';