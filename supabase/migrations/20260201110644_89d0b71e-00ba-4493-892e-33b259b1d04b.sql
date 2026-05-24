-- Fix: Restrict audit_logs INSERT policy to prevent log tampering
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "mt_audit_logs_insert" ON public.audit_logs;

-- Create a more restrictive INSERT policy
-- Allow inserts only when:
-- 1. User is inserting their own audit log (user_id matches auth.uid())
-- 2. OR it's a system insert (auth.uid() IS NULL - for edge functions with service role)
-- 3. OR the user is an administrator
CREATE POLICY "mt_audit_logs_insert_restricted" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  -- System-level operations (edge functions using service role key)
  auth.uid() IS NULL 
  OR 
  -- User can only insert logs for themselves
  (user_id = auth.uid() AND organization_id = current_user_org())
  OR
  -- Administrators can insert any logs within their org
  (has_role(auth.uid(), 'administrador'::app_role) AND organization_id = current_user_org())
);