
-- 1) TOTP backup codes: hash storage + revoke direct column reads
ALTER TABLE public.user_2fa_settings
  ADD COLUMN IF NOT EXISTS backup_codes_hash text[];

-- Migrate any existing plaintext backup codes into hashed form, then clear plaintext.
UPDATE public.user_2fa_settings
SET backup_codes_hash = (
      SELECT array_agg(encode(digest(c, 'sha256'), 'hex'))
      FROM unnest(backup_codes) AS c
    ),
    backup_codes = NULL
WHERE backup_codes IS NOT NULL
  AND array_length(backup_codes, 1) IS NOT NULL
  AND backup_codes_hash IS NULL;

-- Prevent clients from selecting the sensitive columns directly via PostgREST.
-- Edge functions use service_role and remain unaffected.
REVOKE SELECT (totp_secret, backup_codes, backup_codes_hash)
  ON public.user_2fa_settings FROM anon, authenticated;

-- 2) contract_requests: tighten INSERT policy to authenticated role only
DROP POLICY IF EXISTS mt_contract_requests_insert ON public.contract_requests;
CREATE POLICY mt_contract_requests_insert
  ON public.contract_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(
      auth.uid(),
      ARRAY['analista_juridico'::app_role,
            'consultoria_juridica'::app_role,
            'administrador'::app_role]
    )
  );

-- 3) storage/contratos-documentos: add role check to write operations
DROP POLICY IF EXISTS storage_org_insert ON storage.objects;
CREATE POLICY storage_org_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
    AND has_any_role(
      auth.uid(),
      ARRAY['analista_juridico'::app_role,
            'consultoria_juridica'::app_role,
            'administrador'::app_role]
    )
  );

DROP POLICY IF EXISTS storage_org_update ON storage.objects;
CREATE POLICY storage_org_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
    AND has_any_role(
      auth.uid(),
      ARRAY['analista_juridico'::app_role,
            'consultoria_juridica'::app_role,
            'administrador'::app_role]
    )
  );

DROP POLICY IF EXISTS storage_org_delete ON storage.objects;
CREATE POLICY storage_org_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contratos-documentos'
    AND (storage.foldername(name))[1] = (current_user_org())::text
    AND has_any_role(
      auth.uid(),
      ARRAY['analista_juridico'::app_role,
            'consultoria_juridica'::app_role,
            'administrador'::app_role]
    )
  );

-- 4) Fix mutable search_path on email-queue wrapper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public;
