-- Fix: Improve profiles table RLS to properly restrict access to same organization only
-- Drop existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;

-- Create new SELECT policy using current_user_org() for proper organization isolation
CREATE POLICY "Users can view profiles in same org"
ON public.profiles
FOR SELECT
USING (
  -- User can see their own profile
  id = auth.uid()
  OR
  -- User can see profiles of members in their organization
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = profiles.id
    AND om.organization_id = current_user_org()
    AND om.is_active = true
  )
);