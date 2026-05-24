-- =========================================================
-- Módulo #13 — Obrigações + Renovação + Reajuste
-- =========================================================

-- 1) ALTER contract_obligations
ALTER TABLE public.contract_obligations
  ADD COLUMN IF NOT EXISTS evidencia_url text,
  ADD COLUMN IF NOT EXISTS concluido_por uuid,
  ADD COLUMN IF NOT EXISTS observacao_conclusao text,
  ADD COLUMN IF NOT EXISTS responsavel_juridico_id uuid;

-- 2) contract_reajustes
CREATE TABLE public.contract_reajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  indice text NOT NULL,
  percentual numeric(10,4) NOT NULL,
  valor_anterior numeric(15,2) NULL,
  valor_novo numeric(15,2) NULL,
  vigencia_inicio date NOT NULL,
  observacao text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_reajustes_org ON public.contract_reajustes(organization_id);
CREATE INDEX idx_contract_reajustes_contrato ON public.contract_reajustes(contrato_id);

ALTER TABLE public.contract_reajustes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_contract_reajustes_select ON public.contract_reajustes
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_contract_reajustes_insert ON public.contract_reajustes
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_contract_reajustes_delete ON public.contract_reajustes
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_contract_reajustes_audit
  AFTER INSERT OR DELETE ON public.contract_reajustes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3) contract_renovacoes
CREATE TABLE public.contract_renovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id_origem uuid NOT NULL,
  contrato_id_novo uuid NULL,
  status text NOT NULL DEFAULT 'iniciada' CHECK (status IN ('iniciada','em_negociacao','concluida','cancelada')),
  requisicao_id uuid NULL,
  observacao text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_renovacoes_org ON public.contract_renovacoes(organization_id);
CREATE INDEX idx_contract_renovacoes_origem ON public.contract_renovacoes(contrato_id_origem);

ALTER TABLE public.contract_renovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_contract_renovacoes_select ON public.contract_renovacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_contract_renovacoes_insert ON public.contract_renovacoes
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_contract_renovacoes_update ON public.contract_renovacoes
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_contract_renovacoes_delete ON public.contract_renovacoes
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_contract_renovacoes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_renovacoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_contract_renovacoes_updated_at
  BEFORE UPDATE ON public.contract_renovacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Storage bucket: obligation-evidences (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('obligation-evidences', 'obligation-evidences', false)
ON CONFLICT (id) DO NOTHING;

-- RLS storage.objects para bucket — path: {organization_id}/{obligation_id}/{filename}
CREATE POLICY "obligation_evidences_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'obligation-evidences'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org()::text
  );

CREATE POLICY "obligation_evidences_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'obligation-evidences'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org()::text
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );

CREATE POLICY "obligation_evidences_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'obligation-evidences'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = current_user_org()::text
    AND has_role(auth.uid(), 'administrador'::app_role)
  );

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_reajustes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_renovacoes;