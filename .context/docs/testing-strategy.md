---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Testing Strategy

O LexFlow mantém qualidade através de múltiplas camadas de testes: unitários, E2E, regressão de segurança e pre-launch automatizado. A prioridade é garantir **isolamento multi-tenant** e **integridade de RLS**.

## Test Types

### Unit Tests — Vitest

- **Framework**: Vitest + Testing Library
- **Padrão de nomeação**: `*.test.ts` / `*.test.tsx`
- **Localização**: `src/**/*.test.ts`
- **Setup**: `vitest.config.ts`
- **Cobertura**: Hooks, utils, lógica de negócio, componentes React

### E2E Tests — Playwright

- **Framework**: Playwright
- **Config**: `playwright.config.ts`
- **Cobertura**: Fluxos críticos (login, CRUD contratos, workflow, aprovações)

### Security Regression Tests

- **Suite dedicada**: 26 testes de regressão de segurança
- **Edge function**: `security-regression-runner`
- **Foco**: Isolamento multi-tenant, RLS cross-user, cross-org
- **Status**: ✅ 26/26 passed

### Pre-Launch Tests

- **Edge function**: `pre-launch-test-runner`
- **Resultado persistido**: tabela `pre_launch_test_runs`
- **UI**: Aba `/security` → Pré-Venda
- **Status**: ✅ 13/13 passed · 0 failed · 2 N/A
- **Spec completa**: `docs/PRE_LAUNCH_TEST_SPEC.md`

### Manual Tests

- 10 testes críticos manuais pendentes (listados na aba Pré-Venda)
- Cada teste tem "Como executar" e "Aprovado se"
- Registrar resultado via botão "Registrar" na UI

## Running Tests

```bash
# Unit tests
npm test

# Unit tests em watch mode
npm test -- --watch

# Unit tests com coverage
npm test -- --coverage

# E2E tests
npx playwright test

# E2E com UI mode
npx playwright test --ui

# Lint
npm run lint

# Type check
npm run typecheck

# Full validation antes de PR
npm run lint && npm run typecheck && npm test
```

## Quality Gates

### Antes de marcar tarefa como completa

1. ✅ `npm run lint` — sem erros
2. ✅ `npm run typecheck` — sem erros de tipo
3. ✅ `npm test` — todos os testes passando
4. ✅ Testes adicionados para funcionalidade nova
5. ✅ Edge cases e cenários de erro testados

### Cobertura mínima esperada

- Hooks críticos de autenticação/RBAC: 90%+
- Edge functions de segurança: 100% dos cenários documentados
- Componentes de UI: testes de renderização + interação básica
- Utils/helpers: 80%+

### Gates de segurança

- Suite de regressão de segurança: 26/26 devem passar
- Pre-launch tests: 13/13 devem passar
- Linter Supabase: warnings intencionais documentados (38 restantes são aceitáveis)

## Troubleshooting

### Testes falhando após mudança de RLS

- Verificar se `current_user_org()` retorna o org_id correto no contexto de teste
- Confirmar que mocks de autenticação incluem `organization_id` no JWT
- Rodar suite de regressão de segurança para validar isolamento

### Playwright timeout

- Edge functions podem demorar no cold start — aumentar timeout se necessário
- Verificar se `.env` está configurado com URLs válidas do Supabase

### Vitest não encontra módulos

- Verificar aliases em `vite.config.ts` (seção `resolve.alias`)
- Confirmar que `vitest.config.ts` herda a config do Vite

## Related Resources

- [development-workflow.md](./development-workflow.md)
