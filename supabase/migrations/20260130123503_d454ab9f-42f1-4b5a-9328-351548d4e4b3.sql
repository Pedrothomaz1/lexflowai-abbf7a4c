-- 1. Tabela de sessoes ativas
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'));

CREATE POLICY "system_manage_sessions" ON user_sessions
  FOR ALL USING (auth.uid() IS NULL) WITH CHECK (true);

-- 2. Tabela de playbooks
CREATE TABLE IF NOT EXISTS public.incident_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsible_roles TEXT[] NOT NULL,
  escalation_contacts JSONB DEFAULT '{}'::jsonb,
  time_to_respond_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE incident_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_playbooks" ON incident_playbooks
  FOR ALL USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "authorized_view_playbooks" ON incident_playbooks
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
  );

-- 3. Popular playbooks iniciais
INSERT INTO incident_playbooks (incident_type, title, severity, time_to_respond_minutes, steps, responsible_roles, escalation_contacts) VALUES
('unauthorized_access', 'Acesso Não Autorizado', 'critical', 15, 
 '[{"order":1,"action":"Revogar todas as sessões do usuário","tool":"auth.admin.signOut"},{"order":2,"action":"Investigar audit_logs das últimas 24h","tool":"audit_logs"},{"order":3,"action":"Forçar reset de senha","tool":"auth.admin.updateUser"},{"order":4,"action":"Notificar DPO se dados sensíveis acessados","tool":"email"}]',
 ARRAY['administrador'], '{"dpo":"dpo@empresa.com","ti":"ti@empresa.com"}'),

('data_breach', 'Vazamento de Dados', 'critical', 30,
 '[{"order":1,"action":"Isolar sistemas afetados","tool":"network"},{"order":2,"action":"Notificar DPO imediatamente","tool":"email"},{"order":3,"action":"Iniciar processo de notificação LGPD","tool":"compliance"},{"order":4,"action":"Preservar logs para investigação","tool":"backup"},{"order":5,"action":"Preparar comunicado aos afetados","tool":"legal"}]',
 ARRAY['administrador'], '{"dpo":"dpo@empresa.com","juridico":"juridico@empresa.com"}'),

('ransomware', 'Ataque Ransomware', 'critical', 15,
 '[{"order":1,"action":"Bloquear usuário/sistema afetado","tool":"network"},{"order":2,"action":"NÃO pagar resgate","tool":"policy"},{"order":3,"action":"Preservar logs e evidências","tool":"backup"},{"order":4,"action":"Acionar equipe de resposta","tool":"escalation"},{"order":5,"action":"Iniciar restauração de backup","tool":"recovery"}]',
 ARRAY['administrador'], '{"ciso":"ciso@empresa.com","ti":"ti@empresa.com"}'),

('phishing', 'Ataque de Phishing', 'high', 30,
 '[{"order":1,"action":"Forçar reset de MFA do usuário","tool":"auth.mfa"},{"order":2,"action":"Atualizar filtros de email","tool":"email_security"},{"order":3,"action":"Comunicar usuários sobre o ataque","tool":"internal_comms"},{"order":4,"action":"Realizar treinamento de conscientização","tool":"training"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com"}'),

('privilege_escalation', 'Escalação de Privilégios', 'critical', 15,
 '[{"order":1,"action":"Auditar todas mudanças de roles","tool":"audit_logs"},{"order":2,"action":"Revogar tokens do usuário","tool":"auth.admin"},{"order":3,"action":"Reverter alterações de permissão","tool":"user_roles"},{"order":4,"action":"Investigar origem do acesso","tool":"security_alerts"}]',
 ARRAY['administrador'], '{"ciso":"ciso@empresa.com"}'),

('financial_fraud', 'Fraude Financeira', 'critical', 15,
 '[{"order":1,"action":"Bloquear transações pendentes","tool":"financial"},{"order":2,"action":"Congelar contas envolvidas","tool":"banking"},{"order":3,"action":"Iniciar revisão forense","tool":"forensics"},{"order":4,"action":"Notificar compliance e jurídico","tool":"escalation"}]',
 ARRAY['administrador'], '{"financeiro":"cfo@empresa.com","juridico":"juridico@empresa.com"}'),

('ddos', 'Ataque DDoS', 'high', 30,
 '[{"order":1,"action":"Ativar proteção Cloudflare","tool":"cdn"},{"order":2,"action":"Aumentar rate limits temporariamente","tool":"rate_limiter"},{"order":3,"action":"Comunicar usuários sobre intermitência","tool":"status_page"},{"order":4,"action":"Monitorar origem do ataque","tool":"analytics"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com","devops":"devops@empresa.com"}'),

('insider_threat', 'Ameaça Interna', 'high', 30,
 '[{"order":1,"action":"Restringir acessos do suspeito","tool":"permissions"},{"order":2,"action":"Revogar sessões ativas","tool":"auth.admin"},{"order":3,"action":"Iniciar investigação interna","tool":"hr"},{"order":4,"action":"Preservar evidências","tool":"audit_logs"}]',
 ARRAY['administrador'], '{"hr":"rh@empresa.com","juridico":"juridico@empresa.com"}'),

('account_takeover', 'Sequestro de Conta', 'critical', 15,
 '[{"order":1,"action":"Forçar reset de senha imediato","tool":"auth.admin.updateUser"},{"order":2,"action":"Exigir MFA para reativação","tool":"mfa_requirements"},{"order":3,"action":"Invalidar todas as sessões","tool":"auth.admin.signOut"},{"order":4,"action":"Revisar atividades recentes","tool":"audit_logs"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com"}'),

('data_corruption', 'Corrupção de Dados', 'high', 30,
 '[{"order":1,"action":"Fazer rollback para versão anterior","tool":"versioning"},{"order":2,"action":"Restaurar backup mais recente","tool":"backup"},{"order":3,"action":"Revisar trilha de auditoria","tool":"audit_logs"},{"order":4,"action":"Validar integridade pós-restauração","tool":"validation"}]',
 ARRAY['administrador'], '{"dba":"dba@empresa.com","ti":"ti@empresa.com"}');

-- 4. Função para contar sessões ativas
CREATE OR REPLACE FUNCTION public.count_active_sessions(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_sessions
  WHERE user_id = _user_id
    AND is_active = true
    AND expires_at > NOW()
$$;