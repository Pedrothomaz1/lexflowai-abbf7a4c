-- Allow authenticated users to create organizations (for onboarding)
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also need to check if organization_members table allows INSERT for self-assignment
-- Let's also add policy for organization_members to allow users to join as owner when creating org
CREATE POLICY "Users can add themselves as first org member"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role_in_org = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organization_members.organization_id
  )
);