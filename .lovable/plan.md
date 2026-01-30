
# Fase 4: Compliance - Plano de Implementacao

## Escopo

Esta fase implementa os requisitos de compliance LGPD/GDPR e segregacao de funcoes conforme o PRD aprovado.

---

## 1. Database: Funcoes SQL de Mascaramento e LGPD

### 1.1 Funcao `mask_pii(value, field_type)`

Cria funcao SQL para mascarar dados sensiveis conforme regras:

| Campo | Original | Mascarado |
|-------|----------|-----------|
| CPF | 123.456.789-10 | \*\*\*.\*\*\*.\*89-10 |
| Email | joao@veri.com | j\*\*\*@veri.com |
| Telefone | (11) 99999-8888 | (11) \*\*\*\*-8888 |
| Generico | qualquer valor | \*\*\*\*1234 |

### 1.2 Funcao `gdpr_delete_user(user_uuid)`

Implementa direito de exclusao LGPD (Art. 18):
- Anonimiza dados do profile (nome, email, telefone)
- Marca audit_logs como anonimizados (mantem para compliance)
- Registra evento em compliance_logs com base legal

### 1.3 Tabela `sod_approvals` (Segregacao de Funcoes)

Nova tabela para garantir que criador != aprovador:

```text
sod_approvals
- id UUID
- entity_type TEXT (contrato, compra, lancamento)
- entity_id UUID
- creator_id UUID (NOT NULL)
- approver_id UUID
- status TEXT (pending, approved, rejected)
- amount DECIMAL(15,2)
- threshold_rule TEXT
- created_at TIMESTAMP
- decided_at TIMESTAMP
- notes TEXT
- CONSTRAINT: creator_id != approver_id
```

---

## 2. Backend: Edge Functions LGPD

### 2.1 Edge Function `gdpr-handler`

Endpoints para processar solicitacoes LGPD:
- `POST /gdpr-handler` com body `{ action: 'erasure' | 'export' | 'access', user_id }`
- Valida permissao do solicitante
- Executa acao via funcao SQL
- Retorna log de compliance

---

## 3. Frontend: Componentes de Compliance

### 3.1 Pagina `SecurityDashboard.tsx`

Nova pagina `/security` para admins com:
- Metricas: Alertas ativos, falhas de login 24h, operacoes alto risco
- Lista de `security_alerts` com filtro por severidade
- Acoes: Investigar, Resolver, Marcar falso positivo

### 3.2 Aprimorar `AuditLogs.tsx`

Adicionar:
- Filtro por `risk_level` (low, medium, high, critical)
- Filtro por data range
- Badges coloridos por risco
- Exportacao de relatorio PDF

### 3.3 Componente `PIIMaskingDemo.tsx`

Demonstracao de mascaramento para tela de compliance:
- Mostra exemplo de dados originais vs mascarados
- Util para treinamento e validacao

### 3.4 Atualizar `ComplianceLGPD.tsx`

Na aba "Direitos do Titular":
- Botao funcional para "Solicitar Exclusao"
- Dialog de confirmacao com aviso legal
- Chama edge function `gdpr-handler`
- Exibe resultado da operacao

---

## 4. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/SecurityDashboard.tsx` | Dashboard de alertas de seguranca |
| `src/components/security/SecurityAlertsList.tsx` | Lista de alertas com acoes |
| `src/components/security/PIIMaskingDemo.tsx` | Demo de mascaramento |

### Arquivos a Modificar
| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/AuditLogs.tsx` | Filtros risk_level, date range, badges |
| `src/pages/ComplianceLGPD.tsx` | Funcionalidade real de exclusao LGPD |
| `src/App.tsx` | Rota `/security` |
| `supabase/config.toml` | Registrar `gdpr-handler` |

### Migracoes SQL
1. Criar funcao `mask_pii()`
2. Criar funcao `gdpr_delete_user()`
3. Criar tabela `sod_approvals` com RLS
4. Criar indice para `security_alerts.status`

---

## 5. Detalhes Tecnicos

### Migracao SQL

```sql
-- 1. Funcao de mascaramento PII
CREATE OR REPLACE FUNCTION public.mask_pii(
  value TEXT,
  field_type TEXT DEFAULT 'generic'
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF value IS NULL OR value = '' THEN
    RETURN value;
  END IF;
  
  CASE field_type
    WHEN 'cpf' THEN
      RETURN regexp_replace(value, '(\d{3})\.(\d{3})\.(\d)(\d{2})-(\d{2})', '***.***.***\3-\5');
    WHEN 'email' THEN
      RETURN regexp_replace(value, '^(.).*(@.+)$', '\1***\2');
    WHEN 'phone' THEN
      RETURN regexp_replace(value, '(.+)(\d{4})$', '****-\2');
    WHEN 'salary' THEN
      RETURN 'R$ **.**0,00';
    ELSE
      IF length(value) > 4 THEN
        RETURN repeat('*', length(value) - 4) || right(value, 4);
      ELSE
        RETURN repeat('*', length(value));
      END IF;
  END CASE;
END;
$$;

-- 2. Funcao LGPD Erasure
CREATE OR REPLACE FUNCTION public.gdpr_delete_user(user_uuid UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Anonimizar profile
  UPDATE profiles
  SET
    full_name = 'Usuario Excluido',
    email = concat('deleted_', user_uuid::text, '@deleted.local'),
    phone = NULL,
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = user_uuid;

  -- Marcar audit_logs como anonimizados
  UPDATE audit_logs
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"anonymized": true}'::jsonb
  WHERE user_id = user_uuid;

  -- Registrar no compliance_logs
  INSERT INTO compliance_logs (
    tipo_evento,
    entidade,
    entidade_id,
    dados_afetados,
    base_legal,
    user_id
  ) VALUES (
    'erasure_request',
    'profiles',
    user_uuid,
    '{"campos": ["full_name", "email", "phone", "avatar_url"]}'::jsonb,
    'LGPD Art. 18',
    auth.uid()
  );

  result := jsonb_build_object(
    'success', true,
    'user_id', user_uuid,
    'action', 'erasure',
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- 3. Tabela SoD Approvals
CREATE TABLE IF NOT EXISTS public.sod_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  approver_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  amount DECIMAL(15,2),
  threshold_rule TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT sod_different_users CHECK (
    approver_id IS NULL OR creator_id != approver_id
  )
);

ALTER TABLE sod_approvals ENABLE ROW LEVEL SECURITY;

-- RLS: Usuarios veem suas proprias solicitacoes ou sao aprovadores
CREATE POLICY "sod_view_own_or_approver" ON sod_approvals
  FOR SELECT USING (
    creator_id = auth.uid() 
    OR approver_id = auth.uid()
    OR has_role(auth.uid(), 'administrador')
  );

CREATE POLICY "sod_insert_authenticated" ON sod_approvals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND creator_id = auth.uid()
  );

CREATE POLICY "sod_update_approver_only" ON sod_approvals
  FOR UPDATE USING (
    approver_id = auth.uid() 
    OR has_role(auth.uid(), 'administrador')
  );
```

### Edge Function gdpr-handler

```typescript
// Processa solicitacoes LGPD
// Actions: erasure, export, access
// Valida JWT e permissoes
// Registra tudo em compliance_logs
```

---

## 6. Fluxo de Implementacao

1. **Migracao SQL** - Criar funcoes e tabela SoD
2. **Edge Function** - gdpr-handler
3. **SecurityDashboard** - Nova pagina
4. **AuditLogs aprimorado** - Filtros e badges
5. **ComplianceLGPD** - Direitos funcionais
6. **Rota no App.tsx** - /security

---

## 7. Consideracoes de Seguranca

- Funcao `gdpr_delete_user` e SECURITY DEFINER para executar com privilegios elevados
- Constraint SoD impede fraude (criador != aprovador)
- Todas acoes LGPD sao logadas em compliance_logs
- Mascaramento PII e funcao IMMUTABLE para performance

---

## 8. Resultado Esperado

Apos implementacao:
- Dados sensiveis mascarados em relatorios e dashboards
- Usuarios podem solicitar exclusao de dados (LGPD Art. 18)
- Segregacao de funcoes impede auto-aprovacao
- Dashboard de seguranca centraliza alertas
- Audit logs filtrados por nivel de risco
