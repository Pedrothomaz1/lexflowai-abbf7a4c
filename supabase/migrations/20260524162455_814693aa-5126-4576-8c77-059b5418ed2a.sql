
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS analise_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS analise_error text,
  ADD COLUMN IF NOT EXISTS analise_iniciada_em timestamptz;

ALTER TABLE public.contratos
  DROP CONSTRAINT IF EXISTS contratos_analise_status_check;
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_analise_status_check
  CHECK (analise_status IN ('idle','processing','done','failed'));

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contratos;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
