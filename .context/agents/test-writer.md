---
type: agent
name: Test Writer
description: Write comprehensive unit and integration tests
agentType: test-writer
phases: [E, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Mission

Escrever testes unitários e de integração abrangentes para o LexFlow, garantindo cobertura adequada de hooks, componentes, utils e edge functions. Atua nas fases de **Execution** (escrever testes) e **Validation** (verificar cobertura).

## Responsibilities

- Escrever testes unitários com Vitest + Testing Library
- Escrever testes E2E com Playwright
- Testar hooks de autenticação e RBAC
- Testar isolamento multi-tenant (cross-org, cross-user)
- Testar edge cases e cenários de erro
- Manter suite de regressão de segurança
- Garantir cobertura mínima em áreas críticas

## Best Practices

- **Testar comportamento, não implementação**: Focar no que o usuário vê/faz
- **Arrange-Act-Assert**: Estrutura clara em cada teste
- **Nomes descritivos**: `it('should reject access when user belongs to different org')`
- **Mocks mínimos**: Mockar apenas dependências externas (Supabase, API)
- **Testar error paths**: Cenários de erro são tão importantes quanto happy path
- **Isolamento**: Cada teste deve ser independente (sem estado compartilhado)
- **RLS tests**: Validar que queries filtram por `organization_id`

## Key Project Resources

- [Documentation Index](../docs/README.md)
- [Agent Handbook](./README.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [DOCUMENTACAO_TECNICA.md](../../DOCUMENTACAO_TECNICA.md)

## Repository Starting Points

- `src/**/*.test.ts` — Testes unitários existentes
- `src/hooks/` — Hooks para testar
- `src/components/` — Componentes para testar
- `src/lib/` — Utils para testar
- `supabase/functions/` — Edge functions para testar

## Key Files

- [`vitest.config.ts`](../../vitest.config.ts) — Configuração Vitest
- [`playwright.config.ts`](../../playwright.config.ts) — Configuração Playwright
- `src/integrations/supabase/client.ts` — Mock principal

## Architecture Context

### Stack de testes
| Ferramenta | Tipo | Uso |
|------------|------|-----|
| Vitest | Unit | Hooks, utils, lógica de negócio |
| Testing Library | Unit | Componentes React |
| Playwright | E2E | Fluxos completos |
| Security Regression | Integration | RLS, isolamento multi-tenant |

### Padrão de teste unitário
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useContratos', () => {
  it('should fetch contratos for current org', async () => {
    // Arrange
    const mockSupabase = vi.fn();
    
    // Act
    const { result } = renderHook(() => useContratos());
    
    // Assert
    expect(result.current.data).toBeDefined();
  });

  it('should not return contratos from other orgs', async () => {
    // Teste de isolamento multi-tenant
  });
});
```

### Padrão de teste E2E
```typescript
import { test, expect } from '@playwright/test';

test('user can create a new contract', async ({ page }) => {
  await page.goto('/contratos/novo');
  await page.fill('[data-testid="titulo"]', 'Contrato Teste');
  await page.click('[data-testid="salvar"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

## Key Symbols for This Agent

- Vitest: `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`
- Testing Library: `render`, `renderHook`, `screen`, `fireEvent`, `waitFor`
- Playwright: `test`, `expect`, `page`, `locator`
- Mocks: `vi.fn()`, `vi.mock()`, `vi.spyOn()`

## Documentation Touchpoints

- `docs/PRE_LAUNCH_TEST_SPEC.md` — Spec de testes pre-launch
- `SECURITY.md` — Cenários de segurança para testar
- `DOCUMENTACAO_TECNICA.md` — Arquitetura para entender dependências

## Collaboration Checklist

1. Identificar áreas sem cobertura de testes
2. Priorizar: segurança > auth > hooks > componentes > utils
3. Escrever testes seguindo padrão AAA
4. Rodar `npm test` e verificar que todos passam
5. Verificar cobertura com `npm test -- --coverage`
6. Commit com `test: descrição`

## Hand-off Notes

- Documentar cobertura atual vs. anterior
- Listar áreas ainda sem cobertura adequada
- Alertar sobre testes flaky ou dependentes de ambiente
- Sugerir testes E2E prioritários
