

# Fase 5: Hardening - Plano de Implementacao

## Escopo

Esta fase finaliza a implementacao de seguranca enterprise conforme o PRD aprovado, focando em:
- Limites de rate por role detalhados
- Biblioteca de playbooks de resposta a incidentes
- Controle de sessoes concorrentes
- Aprimoramentos no dashboard de seguranca

---

## 1. Analise do Estado Atual

### Ja Implementado
| Componente | Status |
|------------|--------|
| Rate limiter com multiplicadores por role | Funcional |
| SecurityDashboard com metricas | Funcional |
| SecurityAlertsList com acoes | Funcional |
| MFAChallenge para operacoes criticas | Funcional |
| useSecureInput com validacao XSS/SQLi | Funcional |

### Faltando para Fase 5
| Componente | Descricao |
|------------|-----------|
| Limites detalhados por role | Limites especificos de exports/hora e sessoes concorrentes |
| Playbooks de incidentes | 10 playbooks documentados conforme memoria |
| Pagina de Playbooks | UI para consultar procedimentos |
| Controle de sessoes | Limite de sessoes simultaneas por role |
| Link no menu | Adicionar Security Dashboard no sidebar |

---

## 2. Database: Tabela de Sessoes e Playbooks

### 2.1 Tabela `user_sessions`

Rastreia sessoes ativas para controle de concorrencia:

```text
user_sessions
- id UUID
- user_id UUID (NOT NULL)
- session_token TEXT
- device_info JSONB
- ip_address INET
- last_activity TIMESTAMP
- expires_at TIMESTAMP
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMP
```

### 2.2 Tabela `incident_playbooks`

Armazena os 10 playbooks de resposta a incidentes:

```text
incident_playbooks
- id UUID
- incident_type TEXT (unauthorized_access, data_breach, ransomware, etc.)
- title TEXT
- severity TEXT (critical, high, medium, low)
- steps JSONB (array de passos ordenados)
- responsible_roles TEXT[]
- escalation_contacts JSONB
- time_to_respond_minutes INTEGER
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 3. Backend: Aprimoramentos no Rate Limiter

### 3.1 Atualizar `rate-limiter/index.ts`

Adicionar:
- Limites de exports por hora por role
- Verificacao de sessoes concorrentes
- Bloquear novas sessoes se limite excedido

Configuracao detalhada conforme PRD:

| Role | Calls/min | Exports/hora | Sessoes |
|------|-----------|--------------|---------|
| administrador | 500 | 20 | 3 |
| consultoria_juridica | 200 | 10 | 2 |
| analista_juridico | 100 | 5 | 1 |

---

## 4. Frontend: Componentes de Hardening

### 4.1 Componente `IncidentPlaybooks.tsx`

Nova pagina/componente com:
- Lista dos 10 playbooks
- Busca por tipo de incidente
- Visualizacao detalhada com passos
- Indicador de severidade
- Tempo estimado de resposta

### 4.2 Atualizar `SecurityDashboard.tsx`

Adicionar nova aba:
- "Playbooks" com lista de procedimentos
- Metricas de sessoes ativas

### 4.3 Atualizar `AppSidebar.tsx`

Adicionar link "Seguranca" no menu de Sistema para administradores.

---

## 5. Playbooks de Incidentes

Os 10 playbooks conforme memoria aprovada:

| ID | Tipo | Severidade | Tempo Resposta |
|----|------|------------|----------------|
| 1 | Unauthorized Access | critical | 15 min |
| 2 | Data Breach | critical | 30 min |
| 3 | Ransomware | critical | 15 min |
| 4 | Phishing | high | 30 min |
| 5 | Privilege Escalation | critical | 15 min |
| 6 | Financial Fraud | critical | 15 min |
| 7 | DDoS | high | 30 min |
| 8 | Insider Threat | high | 30 min |
| 9 | Account Takeover | critical | 15 min |
| 10 | Data Corruption | high | 30 min |

### Exemplo de Estrutura de Playbook

```json
{
  "incident_type": "unauthorized_access",
  "title": "Acesso Nao Autorizado",
  "severity": "critical",
  "time_to_respond_minutes": 15,
  "steps": [
    {"order": 1, "action": "Revogar sessoes do usuario", "tool": "supabase.auth.admin.signOut()"},
    {"order": 2, "action": "Investigar logs de auditoria", "tool": "audit_logs"},
    {"order": 3, "action": "Forcar reset de senha", "tool": "supabase.auth.admin.updateUser()"},
    {"order": 4, "action": "Notificar DPO se dados sensiveis", "tool": "email"}
  ],
  "responsible_roles": ["administrador"],
  "escalation_contacts": {"dpo": "dpo@empresa.com", "ti": "ti@empresa.com"}
}
```

---

## 6. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `src/components/security/IncidentPlaybooks.tsx` | Lista de playbooks com detalhes |

### Arquivos a Modificar
| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/rate-limiter/index.ts` | Limites detalhados por role, exports, sessoes |
| `src/pages/SecurityDashboard.tsx` | Nova aba Playbooks |
| `src/components/AppSidebar.tsx` | Link para /security |

### Migracoes SQL
1. Criar tabela `user_sessions`
2. Criar tabela `incident_playbooks` com RLS
3. Popular 10 playbooks iniciais

---

## 7. Detalhes Tecnicos

### Migracao SQL

```sql
-- 1. Tabela de sessoes ativas
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
('unauthorized_access', 'Acesso Nao Autorizado', 'critical', 15, 
 '[{"order":1,"action":"Revogar todas as sessoes do usuario","tool":"auth.admin.signOut"},{"order":2,"action":"Investigar audit_logs das ultimas 24h","tool":"audit_logs"},{"order":3,"action":"Forcar reset de senha","tool":"auth.admin.updateUser"},{"order":4,"action":"Notificar DPO se dados sensiveis acessados","tool":"email"}]',
 ARRAY['administrador'], '{"dpo":"dpo@empresa.com","ti":"ti@empresa.com"}'),

('data_breach', 'Vazamento de Dados', 'critical', 30,
 '[{"order":1,"action":"Isolar sistemas afetados","tool":"network"},{"order":2,"action":"Notificar DPO imediatamente","tool":"email"},{"order":3,"action":"Iniciar processo de notificacao LGPD","tool":"compliance"},{"order":4,"action":"Preservar logs para investigacao","tool":"backup"},{"order":5,"action":"Preparar comunicado aos afetados","tool":"legal"}]',
 ARRAY['administrador'], '{"dpo":"dpo@empresa.com","juridico":"juridico@empresa.com"}'),

('ransomware', 'Ataque Ransomware', 'critical', 15,
 '[{"order":1,"action":"Bloquear usuario/sistema afetado","tool":"network"},{"order":2,"action":"NAO pagar resgate","tool":"policy"},{"order":3,"action":"Preservar logs e evidencias","tool":"backup"},{"order":4,"action":"Acionar equipe de resposta","tool":"escalation"},{"order":5,"action":"Iniciar restauracao de backup","tool":"recovery"}]',
 ARRAY['administrador'], '{"ciso":"ciso@empresa.com","ti":"ti@empresa.com"}'),

('phishing', 'Ataque de Phishing', 'high', 30,
 '[{"order":1,"action":"Forcar reset de MFA do usuario","tool":"auth.mfa"},{"order":2,"action":"Atualizar filtros de email","tool":"email_security"},{"order":3,"action":"Comunicar usuarios sobre o ataque","tool":"internal_comms"},{"order":4,"action":"Realizar treinamento de conscientizacao","tool":"training"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com"}'),

('privilege_escalation', 'Escalacao de Privilegios', 'critical', 15,
 '[{"order":1,"action":"Auditar todas mudancas de roles","tool":"audit_logs"},{"order":2,"action":"Revogar tokens do usuario","tool":"auth.admin"},{"order":3,"action":"Reverter alteracoes de permissao","tool":"user_roles"},{"order":4,"action":"Investigar origem do acesso","tool":"security_alerts"}]',
 ARRAY['administrador'], '{"ciso":"ciso@empresa.com"}'),

('financial_fraud', 'Fraude Financeira', 'critical', 15,
 '[{"order":1,"action":"Bloquear transacoes pendentes","tool":"financial"},{"order":2,"action":"Congelar contas envolvidas","tool":"banking"},{"order":3,"action":"Iniciar revisao forense","tool":"forensics"},{"order":4,"action":"Notificar compliance e juridico","tool":"escalation"}]',
 ARRAY['administrador'], '{"financeiro":"cfo@empresa.com","juridico":"juridico@empresa.com"}'),

('ddos', 'Ataque DDoS', 'high', 30,
 '[{"order":1,"action":"Ativar protecao Cloudflare","tool":"cdn"},{"order":2,"action":"Aumentar rate limits temporariamente","tool":"rate_limiter"},{"order":3,"action":"Comunicar usuarios sobre intermitencia","tool":"status_page"},{"order":4,"action":"Monitorar origem do ataque","tool":"analytics"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com","devops":"devops@empresa.com"}'),

('insider_threat', 'Ameaca Interna', 'high', 30,
 '[{"order":1,"action":"Restringir acessos do suspeito","tool":"permissions"},{"order":2,"action":"Revogar sessoes ativas","tool":"auth.admin"},{"order":3,"action":"Iniciar investigacao interna","tool":"hr"},{"order":4,"action":"Preservar evidencias","tool":"audit_logs"}]',
 ARRAY['administrador'], '{"hr":"rh@empresa.com","juridico":"juridico@empresa.com"}'),

('account_takeover', 'Sequestro de Conta', 'critical', 15,
 '[{"order":1,"action":"Forcar reset de senha imediato","tool":"auth.admin.updateUser"},{"order":2,"action":"Exigir MFA para reativacao","tool":"mfa_requirements"},{"order":3,"action":"Invalidar todas as sessoes","tool":"auth.admin.signOut"},{"order":4,"action":"Revisar atividades recentes","tool":"audit_logs"}]',
 ARRAY['administrador'], '{"ti":"ti@empresa.com"}'),

('data_corruption', 'Corrupcao de Dados', 'high', 30,
 '[{"order":1,"action":"Fazer rollback para versao anterior","tool":"versioning"},{"order":2,"action":"Restaurar backup mais recente","tool":"backup"},{"order":3,"action":"Revisar trilha de auditoria","tool":"audit_logs"},{"order":4,"action":"Validar integridade pos-restauracao","tool":"validation"}]',
 ARRAY['administrador'], '{"dba":"dba@empresa.com","ti":"ti@empresa.com"}');
```

### Rate Limiter Aprimorado

Estrutura de limites detalhados:

```typescript
const ROLE_LIMITS: Record<string, RoleLimits> = {
  'administrador': {
    multiplier: 2.5,
    callsPerMinute: 500,
    exportsPerHour: 20,
    maxConcurrentSessions: 3
  },
  'consultoria_juridica': {
    multiplier: 2.0,
    callsPerMinute: 200,
    exportsPerHour: 10,
    maxConcurrentSessions: 2
  },
  'analista_juridico': {
    multiplier: 1.5,
    callsPerMinute: 100,
    exportsPerHour: 5,
    maxConcurrentSessions: 1
  },
  'default': {
    multiplier: 1.0,
    callsPerMinute: 50,
    exportsPerHour: 1,
    maxConcurrentSessions: 1
  }
};
```

---

## 8. Fluxo de Implementacao

1. **Migracao SQL** - Criar tabelas e popular playbooks
2. **Rate Limiter** - Adicionar limites detalhados
3. **IncidentPlaybooks** - Componente de visualizacao
4. **SecurityDashboard** - Integrar aba Playbooks
5. **AppSidebar** - Link para /security

---

## 9. Consideracoes de Seguranca

- Playbooks acessiveis apenas por admins e consultores
- Sessoes expiram automaticamente apos inatividade
- Rate limits impedem abuso mesmo por usuarios autenticados
- Logs de todas as consultas a playbooks

---

## 10. Resultado Esperado

Apos implementacao:
- Limites de API personalizados por nivel de acesso
- 10 playbooks de resposta a incidentes disponiveis
- Controle de sessoes concorrentes por usuario
- Dashboard de seguranca completo no menu lateral
- Sistema pronto para producao conforme Go/No-Go criteria

