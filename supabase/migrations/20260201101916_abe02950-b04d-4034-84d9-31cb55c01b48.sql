-- FIX 1: Improve profiles table RLS policy for proper organization isolation
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;

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

-- FIX 2: fornecedores_safe is a VIEW, not a table - Views inherit RLS from underlying tables
-- The underlying 'fornecedores' table already has RLS enabled with proper organization isolation
-- However, we need to ensure the view respects SECURITY INVOKER (already done in previous migration)
-- The scanner may be detecting that views don't have their own RLS - this is expected behavior
-- Views with SECURITY INVOKER use the caller's permissions and the underlying table's RLS

-- Verify fornecedores table has proper RLS (it should already have this)
-- Just ensure the policies are correct
DROP POLICY IF EXISTS "mt_fornecedores_select" ON public.fornecedores;

CREATE POLICY "mt_fornecedores_select"
ON public.fornecedores
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_user_org()
);