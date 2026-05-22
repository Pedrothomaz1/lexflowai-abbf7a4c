
-- #9 Templates documentais versionados (spec v2)
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo contract_type,
  categoria TEXT,
  current_version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_org ON public.document_templates(organization_id);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  versao INT NOT NULL,
  conteudo TEXT NOT NULL,
  variaveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  changelog TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_org ON public.template_versions(organization_id);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_templates_select" ON public.document_templates
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "doc_templates_insert" ON public.document_templates
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "doc_templates_update" ON public.document_templates
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "doc_templates_delete" ON public.document_templates
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE POLICY "template_versions_select" ON public.template_versions
  FOR SELECT USING (organization_id = current_user_org());
CREATE POLICY "template_versions_insert" ON public.template_versions
  FOR INSERT WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "template_versions_update" ON public.template_versions
  FOR UPDATE USING (organization_id = current_user_org());
CREATE POLICY "template_versions_delete" ON public.template_versions
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

CREATE TRIGGER trg_doc_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
