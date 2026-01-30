

# Fase 6: Monitoring e Metricas Avancadas

## Objetivo

Implementar as funcionalidades de monitoramento e metricas pendentes das secoes 6-10 do PRD, focando em:
- Dashboard de metricas MTTD/MTTR
- Sistema de alertas com thresholds configurados
- Visualizacao de metricas de sucesso do PRD
- Checklist Go/No-Go para producao

---

## 1. Estado Atual

### Implementado nas Fases 1-5
| Componente | Status |
|------------|--------|
| SecurityDashboard com KPIs basicos | Funcional |
| 10 Playbooks de incidentes | Populados no DB |
| Rate limiter com ROLE_LIMITS | Funcional |
| Audit logs com risk_level | Funcional |
| Login attempts tracking | Funcional |
| Security alerts com status/severity | Funcional |

### Pendente (Secoes 6-10)
| Componente | Descricao |
|------------|-----------|
| Metricas MTTD/MTTR | Tempo medio de deteccao e resposta |
| Alert Thresholds | Limites de alerta conforme PRD |
| Go/No-Go Checklist | Verificacao automatizada de criterios |
| Success Metrics Dashboard | Metricas de sucesso pos-lancamento |

---

## 2. Database: Tabelas de Metricas

### 2.1 Tabela `security_metrics`

Nova tabela para rastrear metricas de seguranca ao longo do tempo:

```text
security_metrics
- id UUID
- metric_type TEXT (mttd, mttr, failed_logins, rate_limit_hits, etc.)
- value NUMERIC
- period_start TIMESTAMP
- period_end TIMESTAMP
- metadata JSONB
- created_at TIMESTAMP
```

### 2.2 Tabela `go_nogo_checklist`

Checklist automatizado de criterios de producao:

```text
go_nogo_checklist
- id UUID
- criteria_name TEXT
- criteria_description TEXT
- is_automated BOOLEAN
- last_check_at TIMESTAMP
- status TEXT (passed, failed, pending)
- details JSONB
- created_at TIMESTAMP
```

---

## 3. Backend: Calculo de Metricas

### 3.1 Nova Edge Function `security-metrics`

Calcula e armazena metricas periodicamente:

- **MTTD (Mean Time to Detect):** Diferenca entre `created_at` do alerta e `timestamp` do evento
- **MTTR (Mean Time to Respond):** Diferenca entre `resolved_at` e `created_at` do alerta
- **Failed Logins/Day:** Contagem diaria de `login_attempts.success = false`
- **Rate Limit Hits/User/Day:** Contagem de violacoes do rate limiter

### 3.2 Thresholds de Alerta (conforme PRD)

| Metrica | Target | Alert Threshold |
|---------|--------|-----------------|
| Failed login attempts | menos de 10/dia | mais de 50/dia |
| Rate limit hits | menos de 5/user/dia | mais de 20/user/dia |
| Critical security alerts | 0 | mais de 0 |
| MTTD | menos de 5 min | mais de 15 min |
| MTTR | menos de 30 min | mais de 2 hours |
| MFA adoption (critical) | 100% | menos de 90% |
| Audit log lag | menos de 1 min | mais de 5 min |
| RLS violations | 0 | mais de 0 |

---

## 4. Frontend: Dashboard de Metricas

### 4.1 Novo Componente `SecurityMetrics.tsx`

Adicionar ao SecurityDashboard:
- Grafico de tendencia de MTTD/MTTR
- Indicadores de status com cores (verde/amarelo/vermelho)
- Comparacao Target vs Atual

### 4.2 Novo Componente `GoNoGoChecklist.tsx`

Checklist visual para lancamento:
- Lista dos 10 criterios do PRD
- Status automatizado onde possivel
- Botao para executar verificacao

### 4.3 Atualizar `SecurityDashboard.tsx`

Adicionar novas abas:
- "Metricas" com graficos de tendencia
- "Go/No-Go" com checklist de producao

---

## 5. Criterios Go/No-Go (Automatizaveis)

| Criterio | Verificacao Automatica |
|----------|------------------------|
| Zero critical CVEs | Manual (pentest externo) |
| 100% RLS em tabelas criticas | Sim - query nas policies |
| MFA para Admin/Financeiro Senior | Sim - query mfa_requirements |
| 100% audit logging financeiro | Sim - verificar triggers |
| Rate limiting funcional | Sim - testar endpoint |
| Playbooks documentados | Sim - contar incident_playbooks |
| Training completo | Manual (registro externo) |
| Backup testado | Manual (processo externo) |

---

## 6. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `src/components/security/SecurityMetrics.tsx` | Dashboard de metricas MTTD/MTTR |
| `src/components/security/GoNoGoChecklist.tsx` | Checklist de criterios de producao |
| `supabase/functions/security-metrics/index.ts` | Calculo periodico de metricas |

### Arquivos a Modificar
| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/SecurityDashboard.tsx` | Adicionar abas Metricas e Go/No-Go |
| `src/components/security/index.ts` | Exportar novos componentes |

### Migracoes SQL
1. Criar tabela `security_metrics`
2. Criar tabela `go_nogo_checklist`
3. Popular criterios iniciais

---

## 7. Detalhes Tecnicos

### Migracao SQL

```sql
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
```

### Estrutura de Metricas

```typescript
interface SecurityMetric {
  metric_type: 
    | 'mttd'           // Mean Time to Detect (minutes)
    | 'mttr'           // Mean Time to Respond (minutes)
    | 'failed_logins'  // Count per day
    | 'rate_limit_hits'// Count per day
    | 'critical_alerts'// Count per day
    | 'mfa_adoption'   // Percentage
    | 'active_sessions'// Count
    | 'high_risk_ops'; // Count per day
  value: number;
  period_start: string;
  period_end: string;
  metadata: {
    threshold_target?: number;
    threshold_alert?: number;
    status?: 'ok' | 'warning' | 'critical';
  };
}
```

---

## 8. Fluxo de Implementacao

1. **Migracao SQL** - Criar tabelas security_metrics e go_nogo_checklist
2. **Edge Function** - Criar security-metrics para calculo periodico
3. **SecurityMetrics.tsx** - Componente de visualizacao de metricas
4. **GoNoGoChecklist.tsx** - Componente de checklist de producao
5. **SecurityDashboard** - Integrar novas abas

---

## 9. Consideracoes

### Metricas Calculadas vs Manuais

- **Automatizadas:** MTTD, MTTR, failed logins, rate limits, RLS coverage
- **Manuais:** Pentest, training, backup testing

### Frequencia de Calculo

- Metricas em tempo real: A cada requisicao ao dashboard
- Metricas agregadas: Calculadas diariamente por cron job (opcional)

### Thresholds Visiveis

Dashboard mostrara claramente:
- Valor atual vs Target
- Status com codigo de cores
- Tendencia (melhorando/piorando)

---

## 10. Resultado Esperado

Apos implementacao:
- Dashboard completo de metricas de seguranca
- MTTD/MTTR visiveis e rastreados
- Checklist Go/No-Go automatizado
- Sistema pronto para auditoria externa
- Visibilidade completa do estado de seguranca

