-- Create a secure view for profiles that hides sensitive PII (email, phone)
-- This view will be used by the application instead of querying the profiles table directly

CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  department,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Now we need to restrict direct SELECT access to the profiles table
-- First, drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;

-- Create a new SELECT policy that only allows users to view their own profile
-- This ensures that sensitive data (email, phone) can only be accessed by the profile owner
CREATE POLICY "Users can only view own profile directly"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add a policy for admins to view all profiles (for admin dashboard needs)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::app_role)
);

-- Comment explaining the security design
COMMENT ON VIEW public.profiles_safe IS 'Secure view of profiles table that hides sensitive PII (email, phone). Use this view for displaying user information in lists and dropdowns. Only profile owners and admins can access full profile data directly.';