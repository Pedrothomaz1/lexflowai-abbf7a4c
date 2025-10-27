-- Criar bucket de storage para documentos de contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-documentos', 'contratos-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para contratos
CREATE POLICY "Usuários autenticados podem fazer upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contratos-documentos');

CREATE POLICY "Usuários autenticados podem visualizar documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contratos-documentos');

CREATE POLICY "Usuários podem atualizar seus próprios documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contratos-documentos');

CREATE POLICY "Usuários podem deletar seus próprios documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contratos-documentos');