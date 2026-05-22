-- =========================================================
-- Módulo #11 — Aprovação (série/paralelo) + checklist pré-assinatura
-- =========================================================

-- 1) approval_steps
CREATE TABLE public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  workflow_id uuid NULL,
  ordem integer NOT NULL DEFAULT 1,
  modo text NOT NULL DEFAULT 'serie' CHECK (modo IN ('serie','paralelo')),
  minimo_aprovacoes integer NOT NULL DEFAULT 1 CHECK (minimo_aprovacoes >= 1),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','cancelado')),
  due_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL
);

CREATE INDEX idx_approval_steps_org ON public.approval_steps(organization_id);
CREATE INDEX idx_approval_steps_contrato ON public.approval_steps(contrato_id);
CREATE INDEX idx_approval_steps_status ON public.approval_steps(status) WHERE status = 'pendente';

ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_approval_steps_select ON public.approval_steps
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_approval_steps_insert ON public.approval_steps
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_approval_steps_update ON public.approval_steps
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_approval_steps_delete ON public.approval_steps
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_approval_steps_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_approval_steps_updated_at
  BEFORE UPDATE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) approval_step_approvers
CREATE TABLE public.approval_step_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  step_id uuid NOT NULL REFERENCES public.approval_steps(id) ON DELETE CASCADE,
  aprovador_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','ajuste')),
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, aprovador_id)
);

CREATE INDEX idx_approval_step_approvers_org ON public.approval_step_approvers(organization_id);
CREATE INDEX idx_approval_step_approvers_aprovador ON public.approval_step_approvers(aprovador_id, status);

ALTER TABLE public.approval_step_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_approval_step_approvers_select ON public.approval_step_approvers
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_approval_step_approvers_insert ON public.approval_step_approvers
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_approval_step_approvers_update ON public.approval_step_approvers
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND (aprovador_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role))
  );
CREATE POLICY mt_approval_step_approvers_delete ON public.approval_step_approvers
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

-- 3) approval_decisions
CREATE TABLE public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  step_id uuid NOT NULL REFERENCES public.approval_steps(id) ON DELETE CASCADE,
  aprovador_id uuid NOT NULL,
  decisao text NOT NULL CHECK (decisao IN ('aprovado','rejeitado','ajuste')),
  motivo text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_decisions_org ON public.approval_decisions(organization_id);
CREATE INDEX idx_approval_decisions_step ON public.approval_decisions(step_id);

ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_approval_decisions_select ON public.approval_decisions
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_approval_decisions_insert ON public.approval_decisions
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND aprovador_id = auth.uid()
  );

-- Trigger: rejeitado/ajuste exigem motivo
CREATE OR REPLACE FUNCTION public.validate_approval_decision_motivo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.decisao IN ('rejeitado','ajuste') AND (NEW.motivo IS NULL OR length(trim(NEW.motivo)) < 5) THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres) para decisão %', NEW.decisao;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_approval_decisions_validate
  BEFORE INSERT ON public.approval_decisions
  FOR EACH ROW EXECUTE FUNCTION public.validate_approval_decision_motivo();

CREATE TRIGGER trg_approval_decisions_audit
  AFTER INSERT ON public.approval_decisions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4) contract_checklist (checklist pré-assinatura)
CREATE TABLE public.contract_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  criterio text NOT NULL,
  satisfeito boolean NOT NULL DEFAULT false,
  validado_por uuid NULL,
  validado_em timestamptz NULL,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, criterio)
);

CREATE INDEX idx_contract_checklist_org ON public.contract_checklist(organization_id);
CREATE INDEX idx_contract_checklist_contrato ON public.contract_checklist(contrato_id);

ALTER TABLE public.contract_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_contract_checklist_select ON public.contract_checklist
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_contract_checklist_insert ON public.contract_checklist
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_contract_checklist_update ON public.contract_checklist
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_contract_checklist_delete ON public.contract_checklist
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_contract_checklist_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_checklist
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER trg_contract_checklist_updated_at
  BEFORE UPDATE ON public.contract_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) workflow_tasks
CREATE TABLE public.workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  step_id uuid NULL REFERENCES public.approval_steps(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  due_at timestamptz NULL,
  assignee_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_tasks_org ON public.workflow_tasks(organization_id);
CREATE INDEX idx_workflow_tasks_assignee ON public.workflow_tasks(assignee_id, status);

ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_workflow_tasks_select ON public.workflow_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = current_user_org());
CREATE POLICY mt_workflow_tasks_insert ON public.workflow_tasks
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role,'consultoria_juridica'::app_role,'administrador'::app_role])
  );
CREATE POLICY mt_workflow_tasks_update ON public.workflow_tasks
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND (assignee_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role,'administrador'::app_role]))
  );
CREATE POLICY mt_workflow_tasks_delete ON public.workflow_tasks
  FOR DELETE USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE TRIGGER trg_workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_step_approvers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_checklist;