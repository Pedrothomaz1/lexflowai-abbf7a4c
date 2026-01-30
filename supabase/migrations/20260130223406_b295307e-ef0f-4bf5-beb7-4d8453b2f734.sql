-- =============================================
-- PHASE 1: TENANT FOUNDATION FOR MULTI-TENANCY
-- =============================================

-- STEP 1A: Create organizations table (Tenant)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  slug TEXT NOT NULL,
  email_contato TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logo_url TEXT,
  plano TEXT DEFAULT 'basico',
  max_usuarios INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  configuracoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique indexes for organizations
CREATE UNIQUE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE UNIQUE INDEX idx_organizations_cnpj ON public.organizations(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_organizations_active ON public.organizations(is_active);

-- Enable RLS on organizations (policies will be added in Phase 2)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- STEP 1B: Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_org TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  invited_by UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for organization_members
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_active ON public.organization_members(organization_id, is_active);

-- Enable RLS on organization_members (policies will be added in Phase 2)
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STEP 2: SQL HELPER FUNCTIONS (NO RLS YET)
-- =============================================

-- Function: Get current user's organization
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND is_active = true 
  LIMIT 1;
$$;

-- Function: Check if user belongs to organization
CREATE OR REPLACE FUNCTION public.belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND is_active = true
  );
$$;

-- Function: Check if user is organization owner
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND role_in_org = 'owner'
    AND is_active = true
  );
$$;

-- Function: Check if user is organization admin (owner or admin)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND role_in_org IN ('owner', 'admin')
    AND is_active = true
  );
$$;

-- =============================================
-- STEP 3 & 4: ADD organization_id COLUMNS + INDEXES
-- =============================================

-- contratos
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contratos_org ON public.contratos(organization_id);

-- fornecedores
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_org ON public.fornecedores(organization_id);

-- contract_alerts
ALTER TABLE public.contract_alerts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_alerts_org ON public.contract_alerts(organization_id);

-- contract_obligations
ALTER TABLE public.contract_obligations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_org ON public.contract_obligations(organization_id);

-- contract_approvals
ALTER TABLE public.contract_approvals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_approvals_org ON public.contract_approvals(organization_id);

-- contract_signatures
ALTER TABLE public.contract_signatures ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_org ON public.contract_signatures(organization_id);

-- contract_analysis
ALTER TABLE public.contract_analysis ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_analysis_org ON public.contract_analysis(organization_id);

-- contract_attachments
ALTER TABLE public.contract_attachments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_attachments_org ON public.contract_attachments(organization_id);

-- contract_comments
ALTER TABLE public.contract_comments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_comments_org ON public.contract_comments(organization_id);

-- contract_history
ALTER TABLE public.contract_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_history_org ON public.contract_history(organization_id);

-- contract_versions
ALTER TABLE public.contract_versions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_org ON public.contract_versions(organization_id);

-- contract_requests
ALTER TABLE public.contract_requests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_requests_org ON public.contract_requests(organization_id);

-- contract_templates
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_org ON public.contract_templates(organization_id);

-- unidades
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_unidades_org ON public.unidades(organization_id);

-- franquias
ALTER TABLE public.franquias ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_franquias_org ON public.franquias(organization_id);

-- servicos_periodicos
ALTER TABLE public.servicos_periodicos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_servicos_periodicos_org ON public.servicos_periodicos(organization_id);

-- especificacoes_servico
ALTER TABLE public.especificacoes_servico ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_especificacoes_servico_org ON public.especificacoes_servico(organization_id);

-- fornecedor_anexos
ALTER TABLE public.fornecedor_anexos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_anexos_org ON public.fornecedor_anexos(organization_id);

-- fornecedor_categorias_servico
ALTER TABLE public.fornecedor_categorias_servico ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_categorias_servico_org ON public.fornecedor_categorias_servico(organization_id);

-- user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON public.user_roles(organization_id);

-- notification_preferences
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_org ON public.notification_preferences(organization_id);

-- audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);

-- compliance_logs
ALTER TABLE public.compliance_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_org ON public.compliance_logs(organization_id);

-- security_alerts
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_org ON public.security_alerts(organization_id);

-- report_configurations
ALTER TABLE public.report_configurations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_report_configurations_org ON public.report_configurations(organization_id);

-- negotiation_metrics
ALTER TABLE public.negotiation_metrics ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_negotiation_metrics_org ON public.negotiation_metrics(organization_id);

-- approval_workflows
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org ON public.approval_workflows(organization_id);

-- integracao_config
ALTER TABLE public.integracao_config ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_integracao_config_org ON public.integracao_config(organization_id);

-- data_retention_policies
ALTER TABLE public.data_retention_policies ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_org ON public.data_retention_policies(organization_id);

-- servico_historico
ALTER TABLE public.servico_historico ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_servico_historico_org ON public.servico_historico(organization_id);

-- sod_approvals
ALTER TABLE public.sod_approvals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_sod_approvals_org ON public.sod_approvals(organization_id);

-- solicitacoes_compras
ALTER TABLE public.solicitacoes_compras ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_compras_org ON public.solicitacoes_compras(organization_id);

-- contract_redlines (exists in schema, adding for completeness)
ALTER TABLE public.contract_redlines ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_contract_redlines_org ON public.contract_redlines(organization_id);

-- go_nogo_checklist
ALTER TABLE public.go_nogo_checklist ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_go_nogo_checklist_org ON public.go_nogo_checklist(organization_id);

-- security_metrics
ALTER TABLE public.security_metrics ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_security_metrics_org ON public.security_metrics(organization_id);