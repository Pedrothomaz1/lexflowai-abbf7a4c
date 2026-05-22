
-- 1) FK opcional ligando comentário à etapa do workflow
ALTER TABLE public.contract_comments
  ADD COLUMN IF NOT EXISTS workflow_run_stage_id uuid NULL
    REFERENCES public.workflow_run_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contract_comments_stage
  ON public.contract_comments(workflow_run_stage_id);

-- 2) Trigger de snapshot automático de versões do contrato
CREATE OR REPLACE FUNCTION public.trg_contrato_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed boolean := false;
  v_alteracoes jsonb := '[]'::jsonb;
  v_next_versao integer;
  v_motivo text;
BEGIN
  -- Service role (jobs/edge) não gera snapshot
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Diff campo a campo (apenas relevantes)
  IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','titulo','anterior',OLD.titulo,'novo',NEW.titulo);
  END IF;
  IF NEW.descricao IS DISTINCT FROM OLD.descricao THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','descricao','anterior',OLD.descricao,'novo',NEW.descricao);
  END IF;
  IF NEW.valor_total IS DISTINCT FROM OLD.valor_total THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','valor_total','anterior',OLD.valor_total::text,'novo',NEW.valor_total::text);
  END IF;
  IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','data_inicio','anterior',OLD.data_inicio::text,'novo',NEW.data_inicio::text);
  END IF;
  IF NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','data_fim','anterior',OLD.data_fim::text,'novo',NEW.data_fim::text);
  END IF;
  IF NEW.fornecedor_id IS DISTINCT FROM OLD.fornecedor_id THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','fornecedor_id','anterior',OLD.fornecedor_id::text,'novo',NEW.fornecedor_id::text);
  END IF;
  IF NEW.condicao_pagamento IS DISTINCT FROM OLD.condicao_pagamento THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','condicao_pagamento','anterior',OLD.condicao_pagamento,'novo',NEW.condicao_pagamento);
  END IF;
  IF NEW.forma_pagamento IS DISTINCT FROM OLD.forma_pagamento THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','forma_pagamento','anterior',OLD.forma_pagamento,'novo',NEW.forma_pagamento);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','status','anterior',OLD.status::text,'novo',NEW.status::text);
  END IF;
  IF NEW.intake_status IS DISTINCT FROM OLD.intake_status THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','intake_status','anterior',OLD.intake_status::text,'novo',NEW.intake_status::text);
  END IF;
  IF NEW.dados_bancarios::text IS DISTINCT FROM OLD.dados_bancarios::text THEN
    v_changed := true;
    v_alteracoes := v_alteracoes || jsonb_build_object('campo','dados_bancarios','anterior',OLD.dados_bancarios,'novo',NEW.dados_bancarios);
  END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  -- Motivo opcional vindo de SET LOCAL app.versao_motivo = '...';
  BEGIN
    v_motivo := nullif(current_setting('app.versao_motivo', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_motivo := NULL;
  END;

  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_next_versao
  FROM public.contract_versions
  WHERE contrato_id = OLD.id;

  INSERT INTO public.contract_versions (
    contrato_id, organization_id, versao, snapshot, alteracoes, motivo, created_by
  ) VALUES (
    OLD.id, OLD.organization_id, v_next_versao,
    to_jsonb(OLD), v_alteracoes, v_motivo, auth.uid()
  );

  -- Mantém contratos.versao sincronizado (sem disparar recursão)
  NEW.versao := v_next_versao;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrato_snapshot ON public.contratos;
CREATE TRIGGER trg_contrato_snapshot
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contrato_snapshot();
