-- 1) Flag de regra aplicada
ALTER TABLE public.workflow_run_stages
  ADD COLUMN IF NOT EXISTS regra_aplicada boolean NOT NULL DEFAULT false;

-- 2) Anexa o audit trigger genérico (audit_trigger_func já existe e infere organization_id)
DROP TRIGGER IF EXISTS audit_workflow_runs ON public.workflow_runs;
CREATE TRIGGER audit_workflow_runs
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workflow_run_stages ON public.workflow_run_stages;
CREATE TRIGGER audit_workflow_run_stages
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_run_stages
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
