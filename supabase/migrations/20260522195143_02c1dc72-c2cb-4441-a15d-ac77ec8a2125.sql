
-- ============================================================
-- FASE A — INTAKE DE CONTRATOS (migração aditiva)
-- ============================================================

-- 1) ENUMS novos
DO $$ BEGIN
  CREATE TYPE public.intake_status_enum AS ENUM (
    'rascunho','em_preenchimento','revisao_legal','liberado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nivel_risco_enum AS ENUM ('baixo','medio','alto','critico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.confidencialidade_enum AS ENUM ('publico','interno','confidencial','restrito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.due_diligence_enum AS ENUM ('nao_iniciada','em_andamento','aprovada','reprovada','dispensada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sanction_check_enum AS ENUM ('nao_verificado','limpo','alerta','bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) CONTRATOS — colunas novas (aditivas)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS intake_status public.intake_status_enum NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS nivel_risco public.nivel_risco_enum,
  ADD COLUMN IF NOT EXISTS nivel_risco_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nivel_confidencialidade public.confidencialidade_enum DEFAULT 'interno',
  ADD COLUMN IF NOT EXISTS centro_custo text,
  ADD COLUMN IF NOT EXISTS departamento_responsavel text,
  ADD COLUMN IF NOT EXISTS dados_pessoais_envolvidos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intermediario_envolvido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terceirizacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dias_aviso_nao_renovacao integer,
  ADD COLUMN IF NOT EXISTS due_diligence_status public.due_diligence_enum NOT NULL DEFAULT 'nao_iniciada',
  ADD COLUMN IF NOT EXISTS due_diligence_concluida_em timestamptz,
  ADD COLUMN IF NOT EXISTS due_diligence_observacoes text,
  ADD COLUMN IF NOT EXISTS sanction_check_status public.sanction_check_enum NOT NULL DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS sanction_check_em timestamptz,
  -- Bloco Financeiro
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS condicao_pagamento text,
  ADD COLUMN IF NOT EXISTS numero_parcelas integer,
  ADD COLUMN IF NOT EXISTS dia_vencimento smallint,
  ADD COLUMN IF NOT EXISTS valor_parcela numeric(15,2),
  ADD COLUMN IF NOT EXISTS indice_reajuste text,
  ADD COLUMN IF NOT EXISTS periodicidade_reajuste text,
  ADD COLUMN IF NOT EXISTS multa_atraso_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS juros_mora_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS dados_bancarios jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS email_financeiro_notificado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_contratos_intake_status ON public.contratos(organization_id, intake_status);
CREATE INDEX IF NOT EXISTS idx_contratos_nivel_risco ON public.contratos(organization_id, nivel_risco);

-- 3) CONTRACT_ATTACHMENTS — colunas novas
ALTER TABLE public.contract_attachments
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS is_original boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_attachment_original_por_contrato
  ON public.contract_attachments(contrato_id) WHERE is_original = true;

-- 4) ORGANIZATIONS — email financeiro
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_financeiro text;

-- 5) COMPLIANCE: templates e itens
CREATE TABLE IF NOT EXISTS public.compliance_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  aplicavel_tipo public.contract_type,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_checklists_org ON public.compliance_checklists(organization_id);

CREATE TABLE IF NOT EXISTS public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES public.compliance_checklists(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_items_checklist ON public.compliance_items(checklist_id);

CREATE TABLE IF NOT EXISTS public.contract_compliance_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente', -- pendente | atendido | excecao | nao_aplicavel
  justificativa text,
  evidencia_url text,
  verificado_por uuid REFERENCES auth.users(id),
  verificado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contrato_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_ccs_contrato ON public.contract_compliance_status(contrato_id);

-- 6) INTAKE LEGAL REVIEWS (Gate 2)
CREATE TABLE IF NOT EXISTS public.intake_legal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nivel_risco_avaliado public.nivel_risco_enum NOT NULL,
  parecer text NOT NULL,
  decisao text NOT NULL CHECK (decisao IN ('aprovado','aprovado_com_ressalvas','reprovado','solicitado_ajuste')),
  revisor_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ilr_contrato ON public.intake_legal_reviews(contrato_id);

-- 7) RLS
ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_legal_reviews ENABLE ROW LEVEL SECURITY;

-- Helper macro: select para todos da org; mutações apenas admin/analista/consultoria
DO $$ BEGIN
  CREATE POLICY mt_cc_select ON public.compliance_checklists FOR SELECT
    USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_cc_ins ON public.compliance_checklists FOR INSERT
    WITH CHECK (organization_id = current_user_org() AND
      (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'analista_juridico'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_cc_upd ON public.compliance_checklists FOR UPDATE
    USING (organization_id = current_user_org() AND
      (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'analista_juridico'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_cc_del ON public.compliance_checklists FOR DELETE
    USING (organization_id = current_user_org() AND has_role(auth.uid(),'administrador'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY mt_ci_select ON public.compliance_items FOR SELECT
    USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ci_ins ON public.compliance_items FOR INSERT
    WITH CHECK (organization_id = current_user_org() AND
      (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'analista_juridico'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ci_upd ON public.compliance_items FOR UPDATE
    USING (organization_id = current_user_org() AND
      (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'analista_juridico'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ci_del ON public.compliance_items FOR DELETE
    USING (organization_id = current_user_org() AND has_role(auth.uid(),'administrador'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY mt_ccs_select ON public.contract_compliance_status FOR SELECT
    USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ccs_ins ON public.contract_compliance_status FOR INSERT
    WITH CHECK (organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ccs_upd ON public.contract_compliance_status FOR UPDATE
    USING (organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ccs_del ON public.contract_compliance_status FOR DELETE
    USING (organization_id = current_user_org() AND has_role(auth.uid(),'administrador'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY mt_ilr_select ON public.intake_legal_reviews FOR SELECT
    USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mt_ilr_ins ON public.intake_legal_reviews FOR INSERT
    WITH CHECK (organization_id = current_user_org() AND revisor_id = auth.uid() AND
      (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'analista_juridico'::app_role) OR has_role(auth.uid(),'consultoria_juridica'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Pareceres são append-only: sem UPDATE/DELETE

-- 8) TRIGGERS

-- 8.1 arquivo_hash imutável quando preenchido
CREATE OR REPLACE FUNCTION public.enforce_arquivo_hash_imutavel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF OLD.arquivo_hash IS NOT NULL AND OLD.arquivo_hash <> ''
     AND NEW.arquivo_hash IS DISTINCT FROM OLD.arquivo_hash THEN
    RAISE EXCEPTION 'arquivo_hash é imutável após preenchido (cadeia de custódia)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_arquivo_hash_imutavel ON public.contratos;
CREATE TRIGGER trg_arquivo_hash_imutavel
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_arquivo_hash_imutavel();

-- 8.2 dias_aviso obrigatório se renovacao_automatica
CREATE OR REPLACE FUNCTION public.validate_aviso_renovacao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.renovacao_automatica = true
     AND (NEW.dias_aviso_nao_renovacao IS NULL OR NEW.dias_aviso_nao_renovacao <= 0)
     AND NEW.intake_status IN ('revisao_legal','liberado') THEN
    RAISE EXCEPTION 'dias_aviso_nao_renovacao é obrigatório (>0) quando renovacao_automatica=true';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_aviso_renovacao ON public.contratos;
CREATE TRIGGER trg_validate_aviso_renovacao
  BEFORE INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.validate_aviso_renovacao();

-- 8.3 auto-popular nivel_risco a partir de score_risco (manual prevalece)
-- score: 0-3 baixo | 3.01-6 medio | 6.01-8 alto | >8 critico
CREATE OR REPLACE FUNCTION public.auto_set_nivel_risco_from_analysis()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nivel public.nivel_risco_enum;
  v_manual boolean;
BEGIN
  IF NEW.score_risco IS NULL THEN RETURN NEW; END IF;

  SELECT nivel_risco_manual INTO v_manual FROM public.contratos WHERE id = NEW.contrato_id;
  IF v_manual THEN RETURN NEW; END IF;

  v_nivel := CASE
    WHEN NEW.score_risco <= 3   THEN 'baixo'::public.nivel_risco_enum
    WHEN NEW.score_risco <= 6   THEN 'medio'::public.nivel_risco_enum
    WHEN NEW.score_risco <= 8   THEN 'alto'::public.nivel_risco_enum
    ELSE 'critico'::public.nivel_risco_enum
  END;

  UPDATE public.contratos SET nivel_risco = v_nivel WHERE id = NEW.contrato_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_nivel_risco ON public.contract_analysis;
CREATE TRIGGER trg_auto_nivel_risco
  AFTER INSERT OR UPDATE OF score_risco ON public.contract_analysis
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_nivel_risco_from_analysis();

-- 8.4 sha256 imutável em anexos quando preenchido
CREATE OR REPLACE FUNCTION public.enforce_attachment_sha256_imutavel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN RETURN NEW; END IF;
  IF OLD.sha256 IS NOT NULL AND NEW.sha256 IS DISTINCT FROM OLD.sha256 THEN
    RAISE EXCEPTION 'sha256 do anexo é imutável após preenchido' USING ERRCODE = '42501';
  END IF;
  IF OLD.is_original = true AND NEW.is_original = false THEN
    RAISE EXCEPTION 'não é permitido remover marcação de anexo original' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_attach_sha_imutavel ON public.contract_attachments;
CREATE TRIGGER trg_attach_sha_imutavel
  BEFORE UPDATE ON public.contract_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_attachment_sha256_imutavel();

-- 8.5 updated_at em novas tabelas
CREATE TRIGGER trg_cc_updated_at BEFORE UPDATE ON public.compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ccs_updated_at BEFORE UPDATE ON public.contract_compliance_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
