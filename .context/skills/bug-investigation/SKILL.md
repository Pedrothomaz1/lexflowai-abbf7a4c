---
type: skill
name: Bug Investigation
description: Systematic bug investigation and root cause analysis
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Investigation

## When to Use

Ativar ao investigar bugs reportados — desde erros de UI até falhas de RLS, edge functions ou triggers.

## Instructions

1. **Coletar informações**:
   - Qual é o comportamento esperado vs. atual?
   - Em qual módulo/página ocorre?
   - É reproduzível? Em quais condições?
   - Afeta todos os usuários ou específicos (role/org)?
   - Há stack trace ou logs disponíveis?

2. **Classificar a origem provável**:
   | Sintoma | Origem provável | Onde investigar |
   |---------|-----------------|-----------------|
   | UI não renderiza | Componente React | `src/components/`, `src/pages/` |
   | Dados não carregam | Hook / React Query | `src/hooks/` |
   | 401/403 | Auth / RBAC | `useAuth`, `useRoles`, RLS policies |
   | Dados de outra org visíveis | RLS breach | `supabase/migrations/`, `current_user_org()` |
   | Edge function falha | Deno runtime | `supabase/functions/` |
   | Dados inconsistentes | Trigger SQL | `supabase/migrations/` (triggers) |

3. **Reproduzir o bug**:
   - Criar cenário mínimo que reproduz o problema
   - Documentar os steps exatos

4. **Encontrar root cause**:
   - Usar logs de edge functions (Lovable Cloud panel)
   - Verificar `audit_logs` para ações recentes
   - Inspecionar RLS policies da tabela afetada
   - Verificar `login_attempts` se for auth-related

5. **Implementar fix**:
   - Corrigir apenas o necessário (minimal fix)
   - Adicionar teste que cobre o cenário do bug
   - Rodar suite de regressão se envolve segurança

6. **Validar**:
   ```bash
   npm run lint && npm run typecheck && npm test
   ```

## Examples

### Bug de RLS
```
Bug: Usuário vê contratos de outra organização
Root cause: Tabela `contratos` faltando policy SELECT
Fix: CREATE POLICY "Users can view own org contratos" ON contratos FOR SELECT USING (organization_id = current_user_org());
Teste: Adicionar caso na suite de regressão de segurança
```

### Bug de edge function
```
Bug: Edge function `gerar-documento` retorna 500
Root cause: Template não encontrado (template_id inválido)
Fix: Adicionar validação de template_id antes de processar
Teste: Testar com template_id inexistente
```
