
-- ============ #10 Negociação / Redlining ============
CREATE TABLE IF NOT EXISTS public.contract_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  versao_id UUID REFERENCES public.contract_versions(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.contract_negotiations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('proposta','contraproposta','comentario','aceite','rejeicao')),
  autor_lado TEXT NOT NULL DEFAULT 'interno' CHECK (autor_lado IN ('interno','contraparte')),
  conteudo TEXT,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','aceito','rejeitado','superado')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_negotiations_contrato ON public.contract_negotiations(contrato_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_negotiations_org ON public.contract_negotiations(organization_id);
CREATE INDEX IF NOT EXISTS idx_contract_negotiations_parent ON public.contract_negotiations(parent_id);

ALTER TABLE public.contract_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Negotiations: select org"
  ON public.contract_negotiations FOR SELECT
  USING (organization_id = current_user_org());

CREATE POLICY "Negotiations: insert org"
  ON public.contract_negotiations FOR INSERT
  WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());

CREATE POLICY "Negotiations: update author or admin"
  ON public.contract_negotiations FOR UPDATE
  USING (
    organization_id = current_user_org()
    AND (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role))
  );

CREATE POLICY "Negotiations: delete admin"
  ON public.contract_negotiations FOR DELETE
  USING (
    organization_id = current_user_org()
    AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_contract_negotiations_updated_at
  BEFORE UPDATE ON public.contract_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contract_negotiations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_negotiations;
ALTER TABLE public.contract_negotiations REPLICA IDENTITY FULL;

COMMENT ON COLUMN public.contract_signatures.provider IS
  'Provider: docusign, clicksign, d4sign, zapsign, custom';
