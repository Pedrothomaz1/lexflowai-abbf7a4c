-- =====================================================
-- PRD SEGURANÇA ENTERPRISE - FASE 1: FOUNDATION
-- =====================================================

-- 1. NOVO ENUM DE ROLES ESTENDIDO
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extended_role') THEN
    CREATE TYPE public.extended_role AS ENUM (
      'system_admin',
      'financeiro_senior',
      'financeiro_junior',
      'compras_manager',
      'compras_analyst',
      'cobranca',
      'rh_manager',
      'rh_analyst',
      'auditor',
      'executive',
      'readonly',
      'analista_juridico',
      'consultoria_juridica',
      'administrador'
    );
  END IF;
END $$;

-- 2. TABELA DE PERMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir permissões base
INSERT INTO public.permissions (name, description, category) VALUES
  -- Contratos
  ('contract:read', 'Visualizar contratos próprios', 'contracts'),
  ('contract:read_all', 'Visualizar todos os contratos', 'contracts'),
  ('contract:create', 'Criar novos contratos', 'contracts'),
  ('contract:update', 'Atualizar contratos', 'contracts'),
  ('contract:delete', 'Excluir contratos', 'contracts'),
  ('contract:approve', 'Aprovar contratos', 'contracts'),
  ('contract:analyze', 'Analisar contratos com IA', 'contracts'),
  -- Fornecedores
  ('supplier:read', 'Visualizar fornecedores', 'suppliers'),
  ('supplier:read_all', 'Visualizar todos fornecedores', 'suppliers'),
  ('supplier:create', 'Criar fornecedores', 'suppliers'),
  ('supplier:update', 'Atualizar fornecedores', 'suppliers'),
  ('supplier:delete', 'Excluir fornecedores', 'suppliers'),
  ('supplier:view_banking', 'Ver dados bancários', 'suppliers'),
  -- Financeiro
  ('financial:read', 'Visualizar dados financeiros', 'financial'),
  ('financial:create', 'Criar lançamentos', 'financial'),
  ('financial:approve', 'Aprovar operações financeiras', 'financial'),
  ('financial:export', 'Exportar dados financeiros', 'financial'),
  -- Usuários
  ('user:read', 'Visualizar usuários', 'users'),
  ('user:create', 'Criar usuários', 'users'),
  ('user:update', 'Atualizar usuários', 'users'),
  ('user:delete', 'Excluir usuários', 'users'),
  ('user:manage_roles', 'Gerenciar roles', 'users'),
  -- Auditoria
  ('audit:read', 'Visualizar logs de auditoria', 'audit'),
  ('audit:export', 'Exportar logs de auditoria', 'audit'),
  -- Serviços
  ('service:read', 'Visualizar serviços', 'services'),
  ('service:create', 'Criar serviços', 'services'),
  ('service:update', 'Atualizar serviços', 'services'),
  ('service:delete', 'Excluir serviços', 'services'),
  ('service:renew', 'Renovar serviços', 'services'),
  -- Sistema
  ('system:admin', 'Acesso administrativo total', 'system'),
  ('system:settings', 'Alterar configurações', 'system')
ON CONFLICT (name) DO NOTHING;

-- 3. TABELA DE ROLE_PERMISSIONS (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Mapear permissões para roles existentes
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'administrador'::app_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'consultoria_juridica'::app_role, id FROM public.permissions 
WHERE name IN (
  'contract:read_all', 'contract:create', 'contract:update', 'contract:approve', 'contract:analyze',
  'supplier:read_all', 'supplier:create', 'supplier:update', 'supplier:view_banking',
  'financial:read', 'financial:approve', 'financial:export',
  'user:read', 'audit:read',
  'service:read', 'service:create', 'service:update', 'service:renew'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'analista_juridico'::app_role, id FROM public.permissions 
WHERE name IN (
  'contract:read', 'contract:create', 'contract:update',
  'supplier:read', 'supplier:create', 'supplier:update',
  'financial:read',
  'service:read', 'service:create', 'service:update'
)
ON CONFLICT DO NOTHING;

-- 4. FUNÇÃO has_permission() SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.name = _permission
  )
$$;

-- 5. TABELA LOGIN_ATTEMPTS (Rate Limiting)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip_address, created_at DESC);

-- 6. TABELA MFA_REQUIREMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.mfa_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  is_required BOOLEAN DEFAULT FALSE,
  grace_period_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configurações padrão (Admin requer MFA)
INSERT INTO public.mfa_requirements (role, is_required, grace_period_days) VALUES
  ('administrador', TRUE, 0),
  ('consultoria_juridica', FALSE, 7),
  ('analista_juridico', FALSE, 14)
ON CONFLICT (role) DO NOTHING;

-- 7. TABELA SECURITY_ALERTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  event_id UUID REFERENCES public.audit_logs(id),
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON public.security_alerts(user_id, timestamp DESC);

-- 8. APRIMORAR AUDIT_LOGS
-- =====================================================
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS event_category TEXT,
  ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON public.audit_logs(risk_level, created_at DESC)
  WHERE risk_level IN ('high', 'critical');

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(event_category, created_at DESC);

-- 9. TRIGGER DE AUDITORIA AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  risk TEXT;
  category TEXT;
BEGIN
  -- Determinar nível de risco
  risk := CASE
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores') AND TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_TABLE_NAME = 'user_roles' AND (OLD IS NULL OR OLD.role IS DISTINCT FROM NEW.role) THEN 'critical'
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores', 'contract_approvals') THEN 'high'
    WHEN TG_OP = 'DELETE' THEN 'high'
    WHEN TG_OP = 'UPDATE' THEN 'medium'
    ELSE 'low'
  END;
  
  -- Determinar categoria
  category := CASE
    WHEN TG_TABLE_NAME IN ('user_roles', 'profiles', 'user_2fa_settings') THEN 'auth'
    WHEN TG_TABLE_NAME IN ('contratos', 'contract_approvals', 'contract_signatures') THEN 'financial'
    WHEN TG_TABLE_NAME = 'fornecedores' THEN 'financial'
    ELSE 'data'
  END;
  
  INSERT INTO public.audit_logs (
    user_id, acao, entidade, entidade_id,
    dados_anteriores, dados_novos, 
    metadata, risk_level, event_category
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    jsonb_build_object(
      'trigger', TG_NAME,
      'timestamp', NOW()
    ),
    risk,
    category
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar triggers em tabelas críticas
DROP TRIGGER IF EXISTS audit_contratos_trigger ON public.contratos;
CREATE TRIGGER audit_contratos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_fornecedores_trigger ON public.fornecedores;
CREATE TRIGGER audit_fornecedores_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 10. RLS POLICIES PARA NOVAS TABELAS
-- =====================================================

-- Permissions (somente leitura para todos)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Role_permissions (somente leitura para todos, admin pode gerenciar)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'administrador'))
  WITH CHECK (has_role(auth.uid(), 'administrador'));

-- Login_attempts (apenas sistema insere, admin visualiza)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (has_role(auth.uid(), 'administrador'));

-- MFA_requirements (admin gerencia, todos visualizam)
ALTER TABLE public.mfa_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mfa_requirements"
  ON public.mfa_requirements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage mfa_requirements"
  ON public.mfa_requirements FOR ALL
  USING (has_role(auth.uid(), 'administrador'))
  WITH CHECK (has_role(auth.uid(), 'administrador'));

-- Security_alerts (admin e auditor visualizam)
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and auditors can view security_alerts"
  ON public.security_alerts FOR SELECT
  USING (
    has_role(auth.uid(), 'administrador')
    OR has_permission(auth.uid(), 'audit:read')
  );

CREATE POLICY "System can insert security_alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update security_alerts"
  ON public.security_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'));

-- 11. FUNÇÃO PARA VERIFICAR MFA OBRIGATÓRIO
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_mfa_required_for_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT mr.is_required
      FROM public.user_roles ur
      JOIN public.mfa_requirements mr ON mr.role = ur.role
      WHERE ur.user_id = _user_id
      ORDER BY mr.is_required DESC
      LIMIT 1
    ),
    FALSE
  )
$$;