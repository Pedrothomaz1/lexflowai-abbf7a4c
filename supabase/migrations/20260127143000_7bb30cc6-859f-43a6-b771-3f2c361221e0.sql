-- Allow public read access to avatar images only
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contratos-documentos' 
  AND (storage.foldername(name))[2] = 'avatars'
);