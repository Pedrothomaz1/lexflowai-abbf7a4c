-- 1. Tabela de metricas de seguranca
CREATE TABLE IF NOT EXISTS public.security_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_metrics_type_period 
  ON security_metrics(metric_type, period_start DESC);

ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_metrics" ON security_metrics
  FOR ALL USING (has_role(auth.uid(), 'administrador'));

-- 2. Tabela de checklist Go/No-Go
CREATE TABLE IF NOT EXISTS public.go_nogo_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_name TEXT NOT NULL UNIQUE,
  criteria_description TEXT,
  is_automated BOOLEAN DEFAULT false,
  last_check_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('passed', 'failed', 'pending', 'na')),
  details JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE go_nogo_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_gonogo" ON go_nogo_checklist
  FOR ALL USING (has_role(auth.uid(), 'administrador'));

-- 3. Popular criterios iniciais
INSERT INTO go_nogo_checklist (criteria_name, criteria_description, is_automated, sort_order) VALUES
('zero_critical_cves', 'Zero vulnerabilidades criticas no pentest', false, 1),
('rls_coverage', '100% das tabelas criticas com RLS', true, 2),
('mfa_critical_roles', 'MFA obrigatorio para Admin e Financeiro Senior', true, 3),
('audit_financial_ops', '100% das operacoes financeiras auditadas', true, 4),
('rate_limiting_functional', 'Rate limiting funcional em todos endpoints', true, 5),
('playbooks_documented', 'Todos os 10 playbooks documentados', true, 6),
('password_policy', 'Politica de senha de 12+ caracteres ativa', true, 7),
('hibp_enabled', 'Verificacao de senhas vazadas ativa', false, 8),
('team_training', 'Treinamento da equipe concluido', false, 9),
('backup_tested', 'Backup e disaster recovery testados', false, 10);