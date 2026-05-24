
-- #7 Workflow Builder
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  escopo_tipo contract_type,
  escopo_area TEXT,
  escopo_valor_min NUMERIC,
  escopo_valor_max NUMERIC,
  current_version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_org ON public.workflow_definitions(organization_id);

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  workflow_definition_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  nome TEXT NOT NULL,
  tipo_acao TEXT NOT NULL DEFAULT 'aprovacao', -- aprovacao | revisao | assinatura | tarefa
  aprovador_role TEXT,
  aprovador_user_id UUID,
  sla_horas INT,
  regras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_definition_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_workflow_stages_def ON public.workflow_stages(workflow_definition_id);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  workflow_definition_id UUID NOT NULL REFERENCES public.workflow_definitions(id),
  contrato_id UUID,
  requisicao_id UUID,
  status TEXT NOT NULL DEFAULT 'em_andamento', -- em_andamento | concluido | rejeitado | cancelado
  current_stage_ordem INT NOT NULL DEFAULT 1,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_org ON public.workflow_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_contrato ON public.workflow_runs(contrato_id);

CREATE TABLE IF NOT EXISTS public.workflow_run_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id),
  ordem INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado | pulado
  decisao TEXT,
  comentario TEXT,
  executado_por UUID,
  executado_em TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_run_stages_run ON public.workflow_run_stages(workflow_run_id);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_run_stages ENABLE ROW LEVEL SECURITY;

-- workflow_definitions
CREATE POLICY "wf_defs_select" ON public.workflow_definitions
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "wf_defs_insert" ON public.workflow_definitions
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "wf_defs_update" ON public.workflow_definitions
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "wf_defs_delete" ON public.workflow_definitions
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

-- workflow_stages
CREATE POLICY "wf_stages_select" ON public.workflow_stages
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "wf_stages_insert" ON public.workflow_stages
  FOR INSERT WITH CHECK (organization_id = current_user_org());
CREATE POLICY "wf_stages_update" ON public.workflow_stages
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "wf_stages_delete" ON public.workflow_stages
  FOR DELETE USING (organization_id = current_user_org());

-- workflow_runs
CREATE POLICY "wf_runs_select" ON public.workflow_runs
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "wf_runs_insert" ON public.workflow_runs
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "wf_runs_update" ON public.workflow_runs
  FOR UPDATE USING (organization_id = current_user_org());

-- workflow_run_stages
CREATE POLICY "wf_run_stages_select" ON public.workflow_run_stages
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "wf_run_stages_insert" ON public.workflow_run_stages
  FOR INSERT WITH CHECK (organization_id = current_user_org());
CREATE POLICY "wf_run_stages_update" ON public.workflow_run_stages
  FOR UPDATE USING (organization_id = current_user_org());

CREATE TRIGGER trg_wf_defs_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_wf_runs_updated_at
  BEFORE UPDATE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
