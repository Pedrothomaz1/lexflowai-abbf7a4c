-- =============================================
-- Security Fix: Storage Bucket Organization Isolation
-- =============================================
-- Issue: contratos-documentos bucket allows cross-organization access
-- Fix: Enforce organization-based folder structure in storage policies

-- 1. Drop existing permissive storage policies
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios documentos" ON storage.objects;

-- 2. Create organization-aware storage policies
-- Files must be organized as: {org_id}/{user_id}/filename

-- SELECT: Users can only view files from their organization's folder
CREATE POLICY "storage_org_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND
  (
    -- Check if first folder matches user's organization
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    -- Also allow legacy files (user_id only format) for backwards compatibility
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- INSERT: Users can only upload to their organization's folder
CREATE POLICY "storage_org_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contratos-documentos' AND
  (
    -- New format: org_id/user_id/filename
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    -- Allow legacy format for backwards compatibility
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- UPDATE: Users can update files in their organization's folder
CREATE POLICY "storage_org_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- DELETE: Users can delete files in their organization's folder
CREATE POLICY "storage_org_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);