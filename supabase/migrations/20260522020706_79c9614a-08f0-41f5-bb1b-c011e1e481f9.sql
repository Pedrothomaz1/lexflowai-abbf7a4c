
CREATE TABLE IF NOT EXISTS public.request_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  escopo_tipo contract_type,
  escopo_area TEXT,
  workflow_definition_id UUID REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  current_version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_forms_org ON public.request_forms(organization_id);

CREATE TABLE IF NOT EXISTS public.request_form_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  form_id UUID NOT NULL REFERENCES public.request_forms(id) ON DELETE CASCADE,
  versao INT NOT NULL,
  schema_campos JSONB NOT NULL DEFAULT '[]'::jsonb,
  changelog TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_request_form_versions_form ON public.request_form_versions(form_id);
CREATE INDEX IF NOT EXISTS idx_request_form_versions_org ON public.request_form_versions(organization_id);

ALTER TABLE public.request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_forms_select" ON public.request_forms
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "request_forms_insert" ON public.request_forms
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "request_forms_update" ON public.request_forms
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "request_forms_delete" ON public.request_forms
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE POLICY "request_form_versions_select" ON public.request_form_versions
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "request_form_versions_insert" ON public.request_form_versions
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "request_form_versions_update" ON public.request_form_versions
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "request_form_versions_delete" ON public.request_form_versions
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE TRIGGER trg_request_forms_updated_at
  BEFORE UPDATE ON public.request_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contract_requests
  ADD COLUMN IF NOT EXISTS form_version_id UUID REFERENCES public.request_form_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS respostas JSONB;
