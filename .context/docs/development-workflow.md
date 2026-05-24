---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Development Workflow

O LexFlow segue o modelo **Story-Driven Development** (SDD) do framework Synkra AIOX. Todo trabalho de desenvolvimento começa com uma story documentada em `docs/stories/`.

### Ciclo PREVC

Cada tarefa passa pelas fases:

| Fase | Nome | Atividades |
|------|------|------------|
| **P** | Planning | Feature breakdown, documentação, API design |
| **R** | Review | PR review, code review, security audit |
| **E** | Execution | Implementação, commit, testes, refactoring, bug fix |
| **V** | Validation | Testes de regressão, code review final, security audit |
| **C** | Confirmation | Commit message final, documentação atualizada |

### Fluxo diário

1. Consultar story ativa em `docs/stories/`
2. Ler acceptance criteria da story
3. Implementar seguindo padrões existentes (princípio **No Invention**)
4. Marcar checkboxes `[ ] → [x]` conforme completa tarefas
5. Rodar `npm run lint` + `npm run typecheck` + `npm test`
6. Atualizar File List na story
7. Commit com conventional commits referenciando a story

## Branching & Releases

### Modelo de branching

- `main` — Branch principal, sempre deployável
- `feature/*` — Features novas (ex: `feature/stripe-integration`)
- `fix/*` — Bug fixes (ex: `fix/rls-cross-tenant`)
- `docs/*` — Atualizações de documentação

### Convenções de commit

Seguir **Conventional Commits**:

```
feat: implement IDE detection [Story 2.1]
fix: resolve RLS cross-tenant leak
docs: update API documentation
chore: upgrade Supabase client
refactor: extract validation logic
test: add unit tests for config cache
```

### Release

- Deploy automático via Lovable Cloud (preview → staging → produção)
- Domínio de produção: `lexflowai.com.br`

## Local Development

### Pré-requisitos

- Node.js 18+
- Bun (package manager)
- Git
- GitHub CLI (`gh`)

### Setup

```bash
# Clonar o repositório
git clone <repo-url>
cd lexflowai-main

# Instalar dependências
bun install

# Configurar variáveis de ambiente
cp .env.example .env
# Preencher SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# Iniciar dev server
npm run dev
```

### Comandos principais

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com HMR (Vite) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Rodar testes (Vitest) |
| `npx playwright test` | Testes E2E |

## Code Review Expectations

### Checklist de review

1. ✅ Código segue padrões existentes (sem invenção)
2. ✅ TypeScript strict — sem `any` desnecessário
3. ✅ Error handling completo com mensagens claras
4. ✅ RLS respeitado — queries filtram por `organization_id`
5. ✅ Testes adicionados para funcionalidade nova
6. ✅ Lint e typecheck passando
7. ✅ Documentação atualizada se comportamento mudou
8. ✅ Story atualizada com checkboxes e File List
9. ✅ Sem credenciais ou secrets no código
10. ✅ Imports absolutos (preferencial)

### Aprovações necessárias

- PRs exigem pelo menos 1 review antes de merge
- Mudanças em segurança/RLS exigem review adicional

## Onboarding Tasks

1. Ler `DOCUMENTACAO_TECNICA.md` para visão completa do sistema
2. Ler `CLAUDE.md` para regras do framework AIOX
3. Ler `SECURITY.md` para política de segurança
4. Ler `PROGRESS.md` para status atual
5. Configurar ambiente local (ver seção Local Development)
6. Explorar stories em `docs/stories/` para contexto
7. Revisar edge functions em `supabase/functions/`

## Related Resources

- [testing-strategy.md](./testing-strategy.md)
- [tooling.md](./tooling.md)
