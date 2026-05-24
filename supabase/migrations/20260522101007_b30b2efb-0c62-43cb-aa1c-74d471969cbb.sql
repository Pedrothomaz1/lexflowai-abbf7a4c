
-- 1) Restrict contratos-documentos to ACTIVE organization only (current_user_org), not all memberships
DROP POLICY IF EXISTS storage_org_select ON storage.objects;
DROP POLICY IF EXISTS storage_org_insert ON storage.objects;
DROP POLICY IF EXISTS storage_org_update ON storage.objects;
DROP POLICY IF EXISTS storage_org_delete ON storage.objects;

CREATE POLICY storage_org_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'contratos-documentos'
  AND (
    (storage.foldername(name))[1] = (public.current_user_org())::text
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

CREATE POLICY storage_org_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contratos-documentos'
  AND (
    (storage.foldername(name))[1] = (public.current_user_org())::text
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

CREATE POLICY storage_org_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'contratos-documentos'
  AND (
    (storage.foldername(name))[1] = (public.current_user_org())::text
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

CREATE POLICY storage_org_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'contratos-documentos'
  AND (
    (storage.foldername(name))[1] = (public.current_user_org())::text
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

-- 2) Add missing UPDATE policy for obligation-evidences, mirroring INSERT restrictions
DROP POLICY IF EXISTS obligation_evidences_update ON storage.objects;
CREATE POLICY obligation_evidences_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'obligation-evidences'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (public.current_user_org())::text
  AND public.has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);
