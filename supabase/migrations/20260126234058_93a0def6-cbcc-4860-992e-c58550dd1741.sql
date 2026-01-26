-- Fix 1: Storage bucket policies - Add owner verification
-- First drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios documentos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update all documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete all documents" ON storage.objects;

-- Create proper owner-scoped UPDATE policy
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contratos-documentos' AND auth.uid() = owner);

-- Create proper owner-scoped DELETE policy  
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contratos-documentos' AND auth.uid() = owner);

-- Allow admins to manage all documents (UPDATE)
CREATE POLICY "Admins can update all documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contratos-documentos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

-- Allow admins to manage all documents (DELETE)
CREATE POLICY "Admins can delete all documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contratos-documentos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

-- Fix 2: Profiles table - Require authentication for viewing profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Only authenticated users can view profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);