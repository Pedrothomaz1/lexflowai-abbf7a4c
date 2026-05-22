-- 1) Colunas do pacote final
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS pacote_final_url text,
  ADD COLUMN IF NOT EXISTS pacote_final_hash text,
  ADD COLUMN IF NOT EXISTS pacote_final_congelado_at timestamptz;

-- 2) Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('final-packages', 'final-packages', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies — leitura por membros da org dona do contrato
DROP POLICY IF EXISTS "final_packages_read_org" ON storage.objects;
CREATE POLICY "final_packages_read_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'final-packages'
  AND (storage.foldername(name))[1] = public.current_user_org()::text
);

-- Write/update/delete somente via service role (edge functions)
DROP POLICY IF EXISTS "final_packages_service_write" ON storage.objects;
CREATE POLICY "final_packages_service_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'final-packages'
  AND (auth.jwt() ->> 'role') = 'service_role'
);

DROP POLICY IF EXISTS "final_packages_service_update" ON storage.objects;
CREATE POLICY "final_packages_service_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'final-packages'
  AND (auth.jwt() ->> 'role') = 'service_role'
);

DROP POLICY IF EXISTS "final_packages_service_delete" ON storage.objects;
CREATE POLICY "final_packages_service_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'final-packages'
  AND (auth.jwt() ->> 'role') = 'service_role'
);

-- 4) Trigger de imutabilidade após congelamento
CREATE OR REPLACE FUNCTION public.enforce_contrato_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (edge functions) tem passe livre para gravar o congelamento
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF OLD.pacote_final_congelado_at IS NOT NULL THEN
    RAISE EXCEPTION 'Contrato % está congelado (pacote final assinado) e não pode ser alterado.', OLD.id
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contrato_imutavel ON public.contratos;
CREATE TRIGGER trg_enforce_contrato_imutavel
BEFORE UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contrato_imutavel();
