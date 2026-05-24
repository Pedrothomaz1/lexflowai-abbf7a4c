CREATE OR REPLACE FUNCTION public.verify_monitor_cron_secret(_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_stored text;
BEGIN
  -- Apenas service_role pode validar
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RETURN false;
  END IF;
  SELECT decrypted_secret INTO v_stored
  FROM vault.decrypted_secrets
  WHERE name = 'monitor_cron_secret'
  LIMIT 1;
  RETURN v_stored IS NOT NULL AND v_stored = _secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_monitor_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_monitor_cron_secret(text) TO service_role;