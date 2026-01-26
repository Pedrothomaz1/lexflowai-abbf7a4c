-- Fix contract_comments RLS policy to restrict visibility
DROP POLICY IF EXISTS "Usuários podem visualizar comentários de contratos" ON contract_comments;

CREATE POLICY "Users can view comments on contracts they have access to" ON contract_comments
FOR SELECT USING (
  -- User created the comment
  user_id = auth.uid()
  OR
  -- User created the contract
  EXISTS (
    SELECT 1 FROM contratos 
    WHERE contratos.id = contract_comments.contrato_id 
    AND contratos.created_by = auth.uid()
  )
  OR
  -- User has consultant or admin role
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('consultoria_juridica', 'administrador')
  )
);

-- Fix storage policies for contratos-documentos bucket
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios documentos" ON storage.objects;

-- Create owner-based storage policies that enforce folder structure
CREATE POLICY "Users can upload to their own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contratos-documentos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own documents or with role" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('consultoria_juridica', 'administrador')
    )
  )
);

CREATE POLICY "Users can update own documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents or admins" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'contratos-documentos' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'administrador'
    )
  )
);
