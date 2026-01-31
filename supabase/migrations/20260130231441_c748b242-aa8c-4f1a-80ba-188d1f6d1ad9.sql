-- Drop the existing policy that targets only authenticated role
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create policy that works with the same pattern as other policies
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);