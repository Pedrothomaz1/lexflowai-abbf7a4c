---
type: skill
name: Commit Message
description: Generate commit messages following conventional commits with scope detection
skillSlug: commit-message
phases: [E, C]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Commit Message

## When to Use

Ativar ao finalizar uma unidade de trabalho (feature, fix, refactor, etc.) para gerar um commit message padronizado seguindo Conventional Commits com referência à story.

## Instructions

1. Identificar o **tipo** da mudança:
   - `feat:` — Nova funcionalidade
   - `fix:` — Correção de bug
   - `docs:` — Documentação
   - `chore:` — Manutenção (deps, config)
   - `refactor:` — Refactoring sem mudança de comportamento
   - `test:` — Adição/mudança de testes
   - `style:` — Formatação (sem mudança de lógica)
   - `perf:` — Otimização de performance

2. Detectar o **escopo** (módulo afetado):
   - `auth` — Autenticação, login, sessão
   - `rbac` — Papéis e permissões
   - `contratos` — Módulo de contratos
   - `fornecedores` — Módulo de fornecedores
   - `workflow` — Workflow builder/runner
   - `forms` — Form builder
   - `templates` — Templates documentais
   - `dashboard` — Dashboard executivo
   - `security` — Segurança, RLS, audit
   - `super-admin` — Funcionalidades de super admin
   - `edge` — Edge functions
   - `ui` — Componentes de UI
   - `db` — Migrações SQL

3. Escrever **descrição concisa** em inglês (imperativo):
   - ✅ `feat(contratos): add multi-attachment support`
   - ✅ `fix(rbac): resolve cross-org permission leak`
   - ❌ `Fixed the bug with contracts`

4. Referenciar **story** quando aplicável:
   - `feat(workflow): implement stage transitions [Story 7.1]`

5. Para **breaking changes**, adicionar `!` após o tipo:
   - `feat(auth)!: require minimum 12 char password`

## Examples

```
feat(contratos): add redline IA suggestions
fix(rls): prevent cross-tenant data access in audit_logs
docs: update DOCUMENTACAO_TECNICA with edge function catalog
chore(deps): upgrade supabase-js to v2.45
refactor(hooks): extract auth logic into useAuth hook
test(security): add regression tests for multi-tenant isolation
perf(dashboard): add index on organization_id for kpi queries
feat(super-admin)!: change org approval to require email verification [Story 17.1]
```
