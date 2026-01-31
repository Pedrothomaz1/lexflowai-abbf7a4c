-- 1) Fix: allow a user to become the FIRST member (owner) of a new organization
-- The existing policy is incorrect because it checks a tautology and ends up blocking inserts once the table has any rows.

DROP POLICY IF EXISTS "Users can add themselves as first org member" ON public.organization_members;

CREATE POLICY "Users can add themselves as first org member"
ON public.organization_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role_in_org = 'owner'
  AND COALESCE(is_active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
  )
);
