---
type: skill
name: Security Audit
description: Security review checklist for code and infrastructure
skillSlug: security-audit
phases: [R, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Security Audit

## When to Use

Ativar ao revisar segurança de código, RLS policies, edge functions ou configuração de infraestrutura do LexFlow.

## Instructions

1. **Multi-tenant isolation** (CRÍTICO):
   - [ ] Todas as tabelas de domínio têm `organization_id`
   - [ ] RLS ativo: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
   - [ ] Policy usa `USING (organization_id = current_user_org())`
   - [ ] Testar: usuário da org A não vê dados da org B
   - [ ] Testar: cross-user dentro da mesma org respeita roles

2. **Autenticação**:
   - [ ] Senha mínima 12 caracteres
   - [ ] Rate limiting em `login_attempts` + `is_login_blocked()`
   - [ ] Sem social login (apenas email + senha)
   - [ ] Reset de senha detecta sessão de recuperação
   - [ ] 2FA obrigatório para roles com `mfa_requirements.is_required = true`
   - [ ] Convites validados no servidor (`accept_organization_invite`)

3. **RBAC**:
   - [ ] `has_role()` e `has_permission()` usados corretamente
   - [ ] Menu items restritos por role (`MainSidebar`)
   - [ ] Edge functions verificam permissões antes de executar
   - [ ] Super admin verificado com `is_super_admin(user_id)`

4. **Edge Functions**:
   - [ ] Input validado (tipo, formato, obrigatoriedade)
   - [ ] Sem SQL injection (parameterized queries)
   - [ ] CORS headers presentes
   - [ ] Service role usado apenas quando necessário
   - [ ] Secrets via `Deno.env.get()` (nunca hardcoded)
   - [ ] Error messages não vazam informações internas

5. **Storage**:
   - [ ] Buckets privados (nunca públicos)
   - [ ] Acesso via URL assinada de curta duração
   - [ ] Path inclui `organization_id`: `{org_id}/{contrato_id}/{file}`
   - [ ] Sem upload de tipos perigosos (.exe, .sh)

6. **Frontend**:
   - [ ] Sem secrets em código client-side
   - [ ] CSP headers configurados (`_headers`)
   - [ ] Sem `dangerouslySetInnerHTML` com input de usuário
   - [ ] Sem `console.log` de dados sensíveis
   - [ ] Sessão em `localStorage` (limitação conhecida — mitigada por CSP)

7. **Compliance**:
   - [ ] `audit_logs` registra ações relevantes
   - [ ] `compliance_logs` para eventos LGPD
   - [ ] Dados sensíveis criptografados ou mascarados
   - [ ] Retenção de logs adequada

## Referências de segurança do projeto

| Documento | Conteúdo |
|-----------|----------|
| `SECURITY.md` | Política e responsible disclosure |
| `docs/security-checklist.md` | Checklist contínuo |
| `docs/security-readiness.md` | Checklist pré-produção |
| `docs/SECURITY_REPORT.md` | Relatório atual |

## Status atual

- ✅ Suite de regressão: 26/26 passed
- ✅ Pre-launch: 13/13 passed · 0 failed · 2 N/A
- ✅ Linter Supabase: 85→38 (47 fixes; 38 restantes intencionais)
- 🟡 10 testes manuais críticos pendentes

## Examples

### Auditoria de nova tabela
```sql
-- ✅ Correto
CREATE TABLE nova_entidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- ... campos
);
ALTER TABLE nova_entidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON nova_entidade
  FOR ALL USING (organization_id = current_user_org());

-- ❌ Problema: sem RLS
CREATE TABLE nova_entidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- sem organization_id, sem RLS
);
```

### Auditoria de edge function
```typescript
// ✅ Correto: validação + auth
const authHeader = req.headers.get("Authorization");
if (!authHeader) return unauthorized();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return unauthorized();

// ❌ Problema: sem auth
const { campo } = await req.json();
// processa direto sem verificar identidade
```
