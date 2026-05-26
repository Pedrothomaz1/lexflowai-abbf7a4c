
-- 1. Revoke column-level SELECT on sensitive 2FA columns from anon/authenticated.
-- Only service_role (edge function totp-auth) should read these.
REVOKE SELECT (totp_secret, backup_codes, backup_codes_hash)
  ON public.user_2fa_settings FROM anon, authenticated;

-- 2. Make profile creation intent explicit: only service role (used by handle_new_user trigger) can insert.
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Allow authenticated users to read onboarding_settings (single config row consumed by frontend).
DROP POLICY IF EXISTS "Authenticated can read onboarding settings" ON public.onboarding_settings;
CREATE POLICY "Authenticated can read onboarding settings"
  ON public.onboarding_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Tighten permissions SELECT policy: restrict to authenticated (was public).
DROP POLICY IF EXISTS "Admins view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "permissions_select_admin" ON public.permissions;
-- Recreate scoped to authenticated only
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='permissions' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.permissions', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Admins can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));
