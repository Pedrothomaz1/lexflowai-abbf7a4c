
# PRD de Segurança Enterprise - LexFlow (Veri Semijoias)
## Plano de Implementacao Completo

---

## RESUMO EXECUTIVO

Este PRD define a implementacao de um sistema de seguranca enterprise-grade para a aplicacao LexFlow, que gerencia contratos e servicos da Veri Semijoias. O sistema protege dados financeiros criticos (~R$ 5,7 milhoes em NCG) e dados sensiveis de 20-30 usuarios internos.

### Investimento Estimado
| Categoria | Valor | Timeline |
|-----------|-------|----------|
| Desenvolvimento (300h @ R$ 150/h) | R$ 45.000 | 8 semanas |
| Ferramentas/Licencas | R$ 12.000/ano | Recorrente |
| Consultoria Pentest | R$ 25.000 | Q2 (one-time) |
| Treinamento | R$ 8.000 | Q1 (one-time) |
| **TOTAL Ano 1** | **R$ 90.000** | - |

---

## ESTADO ATUAL DO PROJETO

### O Que Ja Esta Implementado
- Supabase Auth com Google OAuth
- 2FA (TOTP) funcional via `totp-auth` Edge Function
- Sistema de roles basico (`user_roles` table)
- Audit logs basico (`audit_logs` table)
- RLS habilitado em tabelas principais
- HIBP Password Check (pendente ativacao manual)
- Cookie banner LGPD
- 11 Edge Functions deployadas

### Gaps Identificados pelo Linter
- 5x RLS Policies com `USING (true)` em INSERT (audit_logs, compliance_logs, uso_sistema)
- 1x Funcao sem search_path definido
- 1x Extensao no schema public

---

## FASE 1: FOUNDATION (Semanas 1-2)

### AUTH-001: Sistema de Autenticacao Base
**Prioridade:** P0 (Blocker) | **Esforco:** 16h

**Requisitos:**
- Politica de senha minimo 12 caracteres (atualmente 6)
- Complexidade: 1 maiuscula, 1 minuscula, 1 numero, 1 especial
- Nao permitir senhas comuns (top 10k list)
- Bloqueio apos 5 tentativas falhas
- Session timeout: 30 minutos de inatividade
- Logout automatico as 23:00

**Alteracoes Necessarias:**
```text
1. Atualizar Auth Settings no backend:
   - Aumentar min password length para 12
   - Habilitar HIBP check (ja disponivel)

2. Criar tabela login_attempts para tracking:
   - user_id, ip_address, success, created_at
   
3. Edge Function: validate-password
   - Verificar complexidade client-side e server-side
   - Verificar contra lista de senhas comuns
```

### AUTH-002: MFA Aprimorado
**Prioridade:** P0 (Blocker) | **Esforco:** 24h

**Requisitos:**
- MFA obrigatorio para: Admin, Financeiro Senior, Compras Manager
- MFA opcional para demais roles
- Backup codes (10 codigos unicos)
- Challenge MFA em:
  - Operacoes > R$ 10.000
  - Alteracao de permissoes
  - Exportacao em massa

**Alteracoes Necessarias:**
```text
1. Criar tabela mfa_requirements:
   - role, is_required, grace_period_days

2. Atualizar ProtectedRoute.tsx:
   - Verificar role e exigir MFA conforme config

3. Criar component MFAChallenge:
   - Para operacoes criticas especificas
```

### AUTHZ-001: RBAC Avancado
**Prioridade:** P0 (Blocker) | **Esforco:** 32h

**Novo Sistema de Roles:**
| Role | Level | Capabilities |
|------|-------|--------------|
| system_admin | 10 | Full access + user management |
| financeiro_senior | 8 | Todas ops financeiras + aprovacoes |
| financeiro_junior | 6 | Lancamentos + consultas |
| compras_manager | 7 | Criar POs + aprovar ate R$ 50k |
| compras_analyst | 5 | Cotacoes + POs ate R$ 10k |
| cobranca | 6 | Gestao recebiveis |
| rh_manager | 7 | Todos dados RH |
| rh_analyst | 5 | Cadastros basicos |
| auditor | 9 | Read-only + logs |
| executive | 9 | Dashboards (read-only) |
| readonly | 3 | Visualizacao basica |

**Alteracoes Necessarias:**
```text
1. Criar ENUM user_role_extended com novos roles

2. Criar tabela permissions:
   - id, name, description, category

3. Criar tabela role_permissions (many-to-many)

4. Criar funcao SQL has_permission(user_id, permission)

5. Atualizar user_roles para usar novo sistema
```

### AUTHZ-002: RLS Avancado em Tabelas Criticas
**Prioridade:** P0 (Blocker) | **Esforco:** 40h

**Tabelas a Proteger (Top 5 Criticas):**
1. `contratos` - dados contratuais sensiveis
2. `fornecedores` - dados de parceiros + bancarios
3. `contract_analysis` - analises de risco
4. `user_roles` - permissoes de usuario
5. `contract_approvals` - aprovacoes financeiras

**Exemplo de Politica para Contratos:**
```sql
-- Leitura: Usuario ve apenas contratos do seu departamento
CREATE POLICY "contratos_read" ON contratos
  FOR SELECT
  USING (
    has_permission(auth.uid(), 'contract:read_all')
    OR created_by = auth.uid()
    OR responsavel_id = auth.uid()
  );

-- Criacao: Apenas usuarios autorizados
CREATE POLICY "contratos_insert" ON contratos
  FOR INSERT
  WITH CHECK (
    has_permission(auth.uid(), 'contract:create')
  );

-- Atualizacao: Criador ou aprovador
CREATE POLICY "contratos_update" ON contratos
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR has_permission(auth.uid(), 'contract:approve')
  );

-- Exclusao: Apenas admin com soft delete
CREATE POLICY "contratos_delete" ON contratos
  FOR DELETE
  USING (
    has_permission(auth.uid(), 'contract:delete')
  );
```

### AUDIT-001: Auditoria Completa
**Prioridade:** P0 (Blocker) | **Esforco:** 40h

**Aprimorar Tabela audit_logs Existente:**
```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS
  session_id UUID,
  event_category TEXT, -- 'auth', 'authz', 'financial', 'data'
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  success BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES auth.users,
  requires_review BOOLEAN DEFAULT FALSE;

-- Indices para performance
CREATE INDEX idx_audit_risk ON audit_logs(risk_level, created_at DESC)
  WHERE risk_level IN ('high', 'critical');

-- Prevenir alteracao (imutabilidade)
REVOKE UPDATE, DELETE ON audit_logs FROM public;
```

**Trigger Automatico:**
```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  risk TEXT;
BEGIN
  risk := CASE
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores') 
      AND TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_TABLE_NAME = 'user_roles' 
      AND (OLD.role IS DISTINCT FROM NEW.role) THEN 'critical'
    WHEN TG_TABLE_NAME IN ('contratos', 'fornecedores') THEN 'high'
    WHEN TG_OP = 'DELETE' THEN 'high'
    WHEN TG_OP = 'UPDATE' THEN 'medium'
    ELSE 'low'
  END;
  
  INSERT INTO audit_logs (
    user_id, acao, entidade, entidade_id,
    dados_anteriores, dados_novos, metadata
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    jsonb_build_object('risk_level', risk)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar em tabelas criticas
CREATE TRIGGER audit_contratos
  AFTER INSERT OR UPDATE OR DELETE ON contratos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## FASE 2: PROTECTION (Semanas 3-4)

### VALID-001: Validacao Frontend
**Prioridade:** P0 (Blocker) | **Esforco:** 20h

**Criar Hook useSecureInput:**
```typescript
// hooks/useSecureInput.ts
interface ValidationRule {
  type: 'email' | 'cpf' | 'cnpj' | 'phone' | 'currency' | 'date' | 'text'
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => { valid: boolean; error?: string }
}

export function useSecureInput(rules: ValidationRule) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const validate = useCallback((input: any): boolean => {
    // Sanitizacao base com DOMPurify
    let sanitized = input
    if (typeof input === 'string') {
      sanitized = DOMPurify.sanitize(input.trim())
    }
    
    // XSS prevention
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
      setError('Conteudo nao permitido')
      return false
    }
    
    // Validacao por tipo...
    return true
  }, [rules])
  
  return { value, error, validate, setValue }
}
```

**Funcoes de Validacao:**
- validateCPF() - digitos verificadores
- validateCNPJ() - digitos verificadores
- validateEmail() - regex RFC 5322
- validatePhone() - formato brasileiro
- validateCurrency() - apenas numeros, max 2 decimais

### VALID-002: Validacao Backend
**Prioridade:** P0 (Blocker) | **Esforco:** 16h

**Edge Function Middleware:**
```typescript
// supabase/functions/_shared/validator.ts
interface ValidationSchema {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'email' | 'uuid'
    required?: boolean
    min?: number
    max?: number
    pattern?: string
    enum?: any[]
  }
}

function validateRequest(body: any, schema: ValidationSchema): ValidationResult {
  const errors: string[] = []
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field]
    
    // SQL Injection patterns
    if (typeof value === 'string' &&
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i.test(value)) {
      errors.push(`${field} contem padrao suspeito`)
    }
    
    // XSS patterns
    if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
      errors.push(`${field} contem conteudo nao permitido`)
    }
  }
  
  return { valid: errors.length === 0, errors }
}
```

### RATE-001: Rate Limiting Global
**Prioridade:** P0 (Blocker) | **Esforco:** 24h

**Rate Limit Tiers:**
| Endpoint | Tier | Max Requests | Window | Burst |
|----------|------|--------------|--------|-------|
| `/api/auth/login` | CRITICAL | 5 | 5 min | 0 |
| `/api/auth/reset-password` | CRITICAL | 3 | 1 hour | 0 |
| `/api/financial/*` (POST) | HIGH | 20 | 1 min | 5 |
| `/api/export/*` | HIGH | 5 | 1 hour | 0 |
| Global | BASELINE | 200 | 1 min | 50 |

**Criar Tabela e Edge Function:**
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  endpoint_key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key ON rate_limits(user_id, endpoint_key, window_start);
```

```typescript
// supabase/functions/rate-limiter/index.ts
serve(async (req) => {
  const user = await getUser(req)
  const endpoint = new URL(req.url).pathname
  const rule = findMatchingRule(endpoint)
  
  const result = await checkRateLimit(user.id, endpoint, rule)
  
  if (!result.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(rule.maxRequests),
        'X-RateLimit-Remaining': '0'
      }
    })
  }
  
  return new Response(JSON.stringify({ allowed: true }), { status: 200 })
})
```

---

## FASE 3: DETECTION (Semanas 5-6)

### AUDIT-002: Deteccao de Anomalias
**Prioridade:** P1 (High) | **Esforco:** 32h

**Regras de Anomalia:**
| Rule ID | Nome | Condicao | Severidade |
|---------|------|----------|------------|
| AN-001 | Operacao fora de horario | financial op 22h-6h | HIGH |
| AN-002 | Multiplas exclusoes | 5+ DELETE em <5min | CRITICAL |
| AN-003 | Compra sem aprovacao | >R$ 10k sem approver | HIGH |
| AN-004 | Alteracao de permissoes | role changed | CRITICAL |
| AN-005 | Export em massa | >1000 records | MEDIUM |
| AN-006 | Login location incomum | IP diferente | MEDIUM |
| AN-007 | Falhas de login | 3+ em <5min | HIGH |

**Criar Tabela security_alerts:**
```sql
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users,
  event_id UUID REFERENCES audit_logs(id),
  details JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID REFERENCES auth.users,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
```

**Edge Function Scheduled (cron: * * * * *):**
```typescript
// supabase/functions/anomaly-detector/index.ts
serve(async (req) => {
  const supabase = createClient(...)
  
  // AN-001: Ops financeiras fora de horario
  const { data: afterHours } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .then(({ data }) => 
      data?.filter(e => {
        const hour = new Date(e.created_at).getHours()
        return hour < 6 || hour > 22
      })
    )
  
  for (const event of afterHours || []) {
    await createAlert('AN-001', 'high', event)
  }
  
  // ... outras regras
})
```

### IR-001: Resposta Automatizada a Incidentes
**Prioridade:** P1 (High) | **Esforco:** 20h

**Response Matrix:**
| Severidade | Acoes Automaticas | SLA |
|------------|-------------------|-----|
| CRITICAL | 1. Block user 2. Revoke sessions 3. Alert multi-channel 4. Create ticket | 15 min |
| HIGH | 1. Flag for review 2. Alert email+Slack | 2 hours |
| MEDIUM | 1. Log event 2. Alert email | 24 hours |
| LOW | 1. Log only | 7 days |

### DATA-001: Criptografia em Repouso
**Prioridade:** P0 (Blocker) | **Esforco:** 32h

**Classificacao de Dados:**
| Nivel | Tipo | Exemplos | Acao |
|-------|------|----------|------|
| L1 - CRITICO | Credenciais | Tokens, API keys | Vault |
| L2 - ALTO | Financeiro | Margens, salarios | Encrypt |
| L3 - MEDIO | PII | CPF, telefone | Encrypt |
| L4 - BAIXO | Operacional | SKUs, categorias | Hash |

**Usar Supabase Vault:**
```sql
-- Criar chave de criptografia
SELECT vault.create_secret('lexflow-master-key', 'generated-key');

-- Funcao de criptografia
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT)
RETURNS TEXT AS $$
  SELECT vault.encrypt(data::bytea, 'lexflow-master-key')::text;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive(encrypted TEXT)
RETURNS TEXT AS $$
  SELECT vault.decrypt(encrypted::bytea, 'lexflow-master-key')::text;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### VALID-003: Validacao de Upload de Arquivos
**Prioridade:** P1 (High) | **Esforco:** 20h

**Requisitos:**
- Tipos permitidos: PDF, XLSX, CSV, PNG, JPG (whitelist)
- Validacao de magic bytes (nao confiar em extensao)
- Tamanho maximo: 10MB
- Rename seguro (remover caracteres especiais)
- URLs assinadas com expiracao (1h)
- Log de todos uploads

---

## FASE 4: COMPLIANCE (Semanas 7-8)

### DATA-003: Mascaramento de Dados
**Prioridade:** P1 (High) | **Esforco:** 16h

**Regras de Mascaramento:**
| Campo | Original | Mascarado |
|-------|----------|-----------|
| CPF | 123.456.789-10 | ***.***.*89-10 |
| Email | joao@veri.com | j***@veri.com |
| Telefone | (11) 99999-8888 | (11) ****-8888 |
| Salario | R$ 12.500,00 | R$ **.*00,00 |

**Funcao SQL:**
```sql
CREATE OR REPLACE FUNCTION mask_pii(
  value TEXT,
  field_type TEXT DEFAULT 'generic'
) RETURNS TEXT AS $$
BEGIN
  CASE field_type
    WHEN 'cpf' THEN
      RETURN regexp_replace(value, '\d{3}\.\d{3}\.(\d{1})\d{2}', '***.***.***-\1**');
    WHEN 'email' THEN
      RETURN regexp_replace(value, '^(.).*@', '\1***@');
    WHEN 'phone' THEN
      RETURN regexp_replace(value, '\d{4}(\d{4})$', '****-\1');
    ELSE
      RETURN repeat('*', length(value) - 4) || right(value, 4);
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### DATA-004: Retencao e Exclusao (LGPD)
**Prioridade:** P1 (High) | **Esforco:** 24h

**Politica de Retencao:**
| Tipo de Dado | Retencao Ativa | Arquivamento | Exclusao Final |
|--------------|----------------|--------------|----------------|
| Dados financeiros | 3 anos | 7 anos | 10 anos |
| Audit logs | 1 ano | 3 anos | 5 anos |
| Dados colaboradores | Durante vinculo | 5 anos | 10 anos |
| Auth logs | 6 meses | 1 ano | 2 anos |

**Funcao LGPD Erasure:**
```sql
CREATE OR REPLACE FUNCTION gdpr_delete_user(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Anonimizar dados (nao excluir audit trail)
  UPDATE profiles
  SET
    nome = 'Usuario Excluido',
    email = concat('deleted_', user_uuid, '@deleted.local'),
    telefone = NULL,
    deleted_at = NOW()
  WHERE id = user_uuid;
  
  -- Excluir dados nao-criticos
  DELETE FROM user_preferences WHERE user_id = user_uuid;
  
  -- Logs de audit MANTEM (obrigacao legal)
  UPDATE audit_logs
  SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{anonymized}', 'true')
  WHERE user_id = user_uuid;
  
  -- Log da exclusao
  INSERT INTO compliance_logs (
    user_id, tipo_evento, entidade, base_legal
  ) VALUES (user_uuid, 'erasure_request', 'profiles', 'LGPD Art. 18');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### AUTHZ-003: Segregacao de Funcoes (SoD)
**Prioridade:** P1 (High) | **Esforco:** 24h

**Regras:**
| Operacao | Criador | Aprovador | Valor Limite |
|----------|---------|-----------|--------------|
| Compra | Compras Analyst | Compras Manager | > R$ 10.000 |
| Compra | Compras Manager | Financeiro Senior | > R$ 50.000 |
| Lancamento | Financeiro Junior | Financeiro Senior | > R$ 5.000 |

**Criar Tabela approvals:**
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  creator_id UUID REFERENCES auth.users,
  approver_id UUID REFERENCES auth.users,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP,
  notes TEXT,
  CONSTRAINT different_creator_approver CHECK (creator_id != approver_id)
);
```

### AUDIT-003: Dashboard de Auditoria
**Prioridade:** P2 (Medium) | **Esforco:** 24h

**Features:**
- Pagina `/security/audit` (apenas Admin + Auditor)
- Filtros: usuario, data, entity_type, risk_level
- Timeline de eventos por usuario
- Heatmap de atividades por horario/dia
- Export de relatorios PDF
- Comparacao before/after de registros

### IR-002: Dashboard de Investigacoes
**Prioridade:** P2 (Medium) | **Esforco:** 24h

**Tabela security_investigations:**
```sql
CREATE TABLE security_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES security_alerts,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users,
  sla_deadline TIMESTAMP,
  findings JSONB,
  actions_taken TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

---

## FASE 5: HARDENING (Semana 9+)

### RATE-002: Rate Limiting por Usuario
**Prioridade:** P1 (High) | **Esforco:** 12h

| Role | API Calls/min | Exports/hour | Sessoes Concorrentes |
|------|---------------|--------------|----------------------|
| System Admin | 500 | 20 | 3 |
| Financeiro Senior | 200 | 10 | 2 |
| Financeiro Junior | 100 | 5 | 1 |
| Readonly | 50 | 1 | 1 |

### RATE-003: Protecao DDoS (Cloudflare)
**Prioridade:** P1 (High) | **Esforco:** 8h

**Configuracao:**
```text
Firewall Rules:
1. (http.user_agent contains "sqlmap") -> BLOCK
2. (http.user_agent contains "nikto") -> BLOCK
3. (ip.geoip.country ne "BR") -> CHALLENGE
4. (http.request.uri.path contains "../") -> BLOCK

Rate Limiting:
- /api/auth/login: 5 req/5min per IP
- /api/*: 100 req/min per IP
```

### IR-003: Biblioteca de Playbooks
**Prioridade:** P2 (Medium) | **Esforco:** 16h

**Playbooks a Criar:**
1. Acesso Nao Autorizado
2. Vazamento de Dados
3. Ransomware / Malware
4. Phishing Interno
5. Escalacao de Privilegios
6. Fraude Financeira
7. DDoS Attack
8. Insider Threat
9. Account Takeover
10. Data Corruption

---

## COMPONENTES UI NECESSARIOS

### 1. SecurityDashboard.tsx
```typescript
// components/security/SecurityDashboard.tsx
export function SecurityDashboard() {
  const { data: alerts } = useQuery('security-alerts', ...)
  const { data: auditSummary } = useQuery('audit-summary', ...)

  return (
    <div className="security-dashboard">
      <div className="metrics-grid">
        <MetricCard title="Alertas Ativos" value={criticalCount} status="critical" />
        <MetricCard title="Falhas de Login (24h)" value={failedLogins} />
        <MetricCard title="Operacoes de Alto Risco" value={highRiskOps} />
        <MetricCard title="Usuarios Ativos" value={activeUsers} />
      </div>
      <AlertList alerts={alerts} />
      <ActivityChart data={auditSummary?.hourly_activity} />
    </div>
  )
}
```

### 2. AuditForensicsPage.tsx
```typescript
// pages/SecurityAudit.tsx
export function AuditForensicsPage() {
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: [startOfWeek(new Date()), new Date()],
    riskLevels: ['high', 'critical']
  })

  return (
    <div className="audit-forensics">
      <AuditFilters filters={filters} onChange={setFilters} />
      <Tabs>
        <Tab label="Lista" />
        <Tab label="Timeline" />
        <Tab label="Heatmap" />
      </Tabs>
      <EventsList events={events} />
      <ExportButton onClick={exportAuditReport} />
    </div>
  )
}
```

### 3. MFAChallenge.tsx
```typescript
// components/security/MFAChallenge.tsx
export function MFAChallenge({ 
  operation, 
  amount, 
  onSuccess, 
  onCancel 
}: MFAChallengeProps) {
  return (
    <Dialog>
      <DialogContent>
        <h3>Verificacao Necessaria</h3>
        <p>Esta operacao ({operation}) de R$ {amount} requer confirmacao.</p>
        <InputOTP onComplete={handleVerify} />
        <Button onClick={onCancel}>Cancelar</Button>
      </DialogContent>
    </Dialog>
  )
}
```

---

## EDGE FUNCTIONS A CRIAR

| Funcao | Descricao | verify_jwt |
|--------|-----------|------------|
| rate-limiter | Middleware de rate limiting | true |
| anomaly-detector | Deteccao de anomalias (cron) | false |
| security-alert-handler | Resposta automatizada a alertas | true |
| validate-password | Validacao de complexidade | false |
| secure-file-upload | Upload com validacao de magic bytes | true |
| gdpr-handler | Processar requisicoes LGPD | true |

---

## TESTES DE SEGURANCA

### Suite Automatizada (CI/CD)
```typescript
// tests/security/auth.test.ts
describe('Authentication Security', () => {
  test('Reject weak passwords', async () => {
    const result = await signUp('user@test.com', 'weak123')
    expect(result.error).toMatch(/senha muito fraca/)
  })
  
  test('Block after 5 failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await login('user@test.com', 'wrongpassword')
    }
    const result = await login('user@test.com', 'wrongpassword')
    expect(result.error).toMatch(/conta bloqueada/)
  })
})

// tests/security/authorization.test.ts
describe('Authorization (RLS)', () => {
  test('User cannot read other user data', async () => {
    const userA = await createUser('userA')
    const userB = await createUser('userB')
    const dataA = await createContract(userA)
    
    await loginAs(userB)
    const result = await fetchContract(dataA.id)
    
    expect(result.error).toMatch(/permission denied/)
  })
})
```

### Pentest Manual (Trimestral)
- Testes de penetracao por consultoria externa
- Scope: IDOR, SQL Injection, XSS, CSRF, Rate limit bypass
- Deliverable: Relatorio + POCs + Recomendacoes

---

## CRONOGRAMA DE IMPLANTACAO

```text
SEMANA 1-2 (FOUNDATION)
+-------------------------------------------------------+
| AUTH-001 | AUTH-002 | AUTHZ-001 | AUTHZ-002 | AUDIT-001 |
| 16h      | 24h      | 32h       | 40h       | 40h       |
+-------------------------------------------------------+

SEMANA 3-4 (PROTECTION)
+-------------------------------------------------------+
| VALID-001 | VALID-002 | RATE-001 | RLS Completo        |
| 20h       | 16h       | 24h      | (continuacao)       |
+-------------------------------------------------------+

SEMANA 5-6 (DETECTION)
+-------------------------------------------------------+
| AUDIT-002 | IR-001 | DATA-001 | VALID-003             |
| 32h       | 20h    | 32h      | 20h                   |
+-------------------------------------------------------+

SEMANA 7-8 (COMPLIANCE)
+-------------------------------------------------------+
| DATA-003 | DATA-004 | AUTHZ-003 | AUDIT-003 | IR-002  |
| 16h      | 24h      | 24h       | 24h       | 24h     |
+-------------------------------------------------------+

SEMANA 9+ (HARDENING)
+-------------------------------------------------------+
| RATE-002 | RATE-003 | IR-003 | Pentest | Training    |
| 12h      | 8h       | 16h    | Externo | Equipe      |
+-------------------------------------------------------+
```

---

## METRICAS DE SUCESSO

### KPIs de Seguranca
| Metrica | Baseline | Target Q2 | Target Q4 |
|---------|----------|-----------|-----------|
| CVEs criticas | 12 (est.) | 0 | 0 |
| Tentativas bloqueadas | N/A | 100% | 100% |
| MTTD (Tempo para detectar) | N/A | <5 min | <2 min |
| Operacoes auditadas | 30% | 100% | 100% |
| Compliance LGPD | 40% | 85% | 100% |

### Criterios Go/No-Go para Producao
- [ ] Zero vulnerabilidades criticas em pentest
- [ ] 100% tabelas criticas com RLS
- [ ] MFA ativo para Admin + Financeiro Senior
- [ ] Audit logging em 100% ops financeiras
- [ ] Rate limiting funcional
- [ ] Playbooks de incidentes documentados
- [ ] Treinamento completo da equipe

---

## RISCOS E MITIGACAO

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| RLS bloqueia ops legitimas | MEDIUM | HIGH | Testes extensivos + admin bypass |
| Rate limit impacta power users | MEDIUM | MEDIUM | Limites diferenciados por role |
| Falsos positivos em alertas | MEDIUM | MEDIUM | Tuning iterativo + classificacao |
| MFA cria friccao para usuarios | HIGH | LOW | UX suave + "lembrar dispositivo" |
| Equipe sem expertise | MEDIUM | HIGH | Contratar especialista + treinamento |

---

## PROXIMOS PASSOS IMEDIATOS

1. **Semana 1**: 
   - Ativar HIBP Password Check no backend
   - Aumentar min password para 12 caracteres
   - Criar tabela permissions e role_permissions

2. **Semana 2**:
   - Implementar funcao has_permission()
   - Atualizar RLS policies nas 5 tabelas criticas
   - Aprimorar audit_logs com campos adicionais

3. **Semana 3**:
   - Criar hook useSecureInput
   - Implementar Edge Function rate-limiter
   - Criar tabela security_alerts

4. **Continuo**:
   - Documentar playbooks
   - Preparar testes automatizados
   - Agendar pentest externo (Q2)
