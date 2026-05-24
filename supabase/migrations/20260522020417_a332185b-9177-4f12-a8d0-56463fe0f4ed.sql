
CREATE TABLE IF NOT EXISTS public.ai_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_extraido TEXT,
  valor_aceito TEXT,
  confianca NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aceito | editado | descartado
  modelo TEXT,
  trecho_origem TEXT,
  revisado_por UUID,
  revisado_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_extr_org ON public.ai_extractions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_extr_contrato ON public.ai_extractions(contrato_id);

CREATE TABLE IF NOT EXISTS public.ai_risk_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL,
  clausula TEXT,
  tipo_risco TEXT,
  severidade TEXT NOT NULL DEFAULT 'media', -- alta | media | baixa
  descricao TEXT,
  recomendacao TEXT,
  trecho_origem TEXT,
  confianca NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aceito | editado | descartado
  revisado_por UUID,
  revisado_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_risk_org ON public.ai_risk_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_risk_contrato ON public.ai_risk_reviews(contrato_id);

ALTER TABLE public.ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_risk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_extr_select" ON public.ai_extractions
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "ai_extr_insert" ON public.ai_extractions
  FOR INSERT WITH CHECK (organization_id = current_user_org());
CREATE POLICY "ai_extr_update" ON public.ai_extractions
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "ai_extr_delete" ON public.ai_extractions
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE POLICY "ai_risk_select" ON public.ai_risk_reviews
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "ai_risk_insert" ON public.ai_risk_reviews
  FOR INSERT WITH CHECK (organization_id = current_user_org());
CREATE POLICY "ai_risk_update" ON public.ai_risk_reviews
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "ai_risk_delete" ON public.ai_risk_reviews
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE TRIGGER trg_ai_extr_updated_at
  BEFORE UPDATE ON public.ai_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ai_risk_updated_at
  BEFORE UPDATE ON public.ai_risk_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
