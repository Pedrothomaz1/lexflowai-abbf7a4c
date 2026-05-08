
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS cnpj_status text DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS cnpj_situacao_data date,
  ADD COLUMN IF NOT EXISTS cnpj_verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cnpj_dados_receita jsonb;

CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj_status ON public.fornecedores(organization_id, cnpj_status);

CREATE TABLE IF NOT EXISTS public.cnpj_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid,
  cnpj text NOT NULL,
  status text NOT NULL,
  response jsonb,
  error_message text,
  organization_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnpj_verif_log_fornecedor ON public.cnpj_verification_log(fornecedor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnpj_verif_log_org ON public.cnpj_verification_log(organization_id, created_at DESC);

ALTER TABLE public.cnpj_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_cnpj_verif_log_select" ON public.cnpj_verification_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());

CREATE POLICY "mt_cnpj_verif_log_insert" ON public.cnpj_verification_log
  FOR INSERT WITH CHECK (
    ((auth.uid() IS NOT NULL AND organization_id = current_user_org())
     OR (auth.jwt() ->> 'role') = 'service_role')
  );
