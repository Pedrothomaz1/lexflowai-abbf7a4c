---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Mission

Investigar e corrigir bugs reportados no LexFlow, desde erros de UI até falhas de RLS e edge functions. O bug fixer atua nas fases de **Execution** (implementar o fix) e **Validation** (confirmar que o fix resolve sem regressões).

## Responsibilities

- Reproduzir bugs a partir de reports ou logs
- Analisar stack traces e logs de edge functions
- Identificar root cause (frontend, RLS, edge function, trigger)
- Implementar correção mínima e focada
- Adicionar testes que cobrem o cenário do bug
- Verificar que o fix não quebra isolamento multi-tenant
- Atualizar story com detalhes do fix

## Best Practices

- **Reproduzir primeiro**: Nunca assumir a causa sem reproduzir o bug
- **Minimal fix**: Corrigir apenas o necessário — sem refactoring oportunístico
- **Testar isolamento**: Bugs de RLS devem ser validados com cenários cross-org e cross-user
- **Verificar edge cases**: Checar cenários adjacentes ao bug (null, empty, concurrent)
- **Conventional commit**: `fix: describe the fix [Story X.X]`
- **Não inventar**: Seguir padrões existentes no codebase (princípio No Invention)

## Key Project Resources

- [Documentation Index](../docs/README.md)
- [Agent Handbook](./README.md)
- [AGENTS.md](../../AGENTS.md)
- [SECURITY.md](../../SECURITY.md)
- [DOCUMENTACAO_TECNICA.md](../../DOCUMENTACAO_TECNICA.md)

## Repository Starting Points

- `src/` — Código frontend (React + TypeScript)
- `src/hooks/` — Hooks de auth, RBAC, data fetching (bugs frequentes)
- `src/integrations/supabase/` — Cliente e types Supabase
- `supabase/functions/` — Edge functions (Deno) — erros de backend
- `supabase/migrations/` — Migrações SQL — bugs de schema/RLS

## Key Files

- `src/integrations/supabase/client.ts` — Cliente Supabase (erros de conexão)
- `src/hooks/useAuth.ts` — Autenticação (erros de sessão)
- `supabase/functions/security-regression-runner/` — Suite de regressão
- `vite.config.ts` — Config de build (erros de import/alias)

## Architecture Context

### Frontend (React)
- SPA com React 18 + Vite 5 + TypeScript 5
- Componentes em `src/components/`, hooks em `src/hooks/`, páginas em `src/pages/`
- State management via React Query + hooks customizados

### Backend (Supabase)
- PostgreSQL com RLS multi-tenant baseado em `organization_id`
- 25+ Edge Functions em Deno
- Auth via Supabase Auth (email + senha)
- Storage com buckets privados e URLs assinadas

### Funções SECURITY DEFINER críticas
- `current_user_org()` — Retorna org ativa do usuário
- `has_role(user_id, role)` — Checagem de papel
- `is_super_admin(user_id)` — Verificação de super admin

## Key Symbols for This Agent

- `current_user_org()` — SQL function que determina tenant ativo
- `has_role()`, `has_permission()` — Funções de RBAC
- `useAuth`, `useRoles`, `usePermissions` — Hooks de autenticação
- `audit_trigger_func` — Trigger de auditoria

## Documentation Touchpoints

- `DOCUMENTACAO_TECNICA.md` — Arquitetura completa
- `SECURITY.md` — Política de segurança
- `docs/stories/` — Stories com contexto do bug
- `PROGRESS.md` — Status geral do projeto

## Collaboration Checklist

1. Confirmar que o bug foi reproduzido antes de iniciar o fix
2. Verificar se existe story relacionada; criar se não existir
3. Implementar fix com teste(s) que cobre(m) o cenário
4. Rodar `npm run lint && npm run typecheck && npm test`
5. Rodar suite de regressão de segurança se o fix envolve RLS/auth
6. Atualizar story com checkboxes e File List
7. Commit com `fix: descrição [Story X.X]`

## Hand-off Notes

- Documentar root cause encontrado na story
- Listar cenários testados e edge cases verificados
- Alertar se o bug pode ter impacto em outros módulos
- Sugerir melhorias preventivas (sem implementar — deixar para refactoring)
