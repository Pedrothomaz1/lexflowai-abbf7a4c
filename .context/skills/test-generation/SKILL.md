---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code
skillSlug: test-generation
phases: [E, V]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Test Generation

## When to Use

Ativar ao precisar gerar testes para código novo ou existente no LexFlow. Cobertura prioritária: segurança > auth > hooks > componentes > utils.

## Instructions

1. **Identificar o tipo de teste necessário**:
   - **Unit test (Vitest)**: Hooks, utils, lógica de negócio
   - **Component test (Testing Library)**: Componentes React
   - **E2E test (Playwright)**: Fluxos completos de usuário
   - **Security test**: Isolamento multi-tenant, RLS

2. **Estruturar com AAA** (Arrange-Act-Assert):
   ```typescript
   it('should [expected behavior] when [condition]', () => {
     // Arrange - setup
     // Act - executar
     // Assert - verificar
   });
   ```

3. **Cobrir cenários**:
   - ✅ Happy path
   - ✅ Error handling (API failure, invalid input)
   - ✅ Edge cases (null, empty, boundary values)
   - ✅ Multi-tenant isolation (cross-org access)
   - ✅ Loading/empty states

4. **Nomear arquivo**: `NomeDoModulo.test.ts` ou `NomeDoModulo.test.tsx`

5. **Mock padrão do Supabase**:
   ```typescript
   vi.mock('@/integrations/supabase/client', () => ({
     supabase: {
       from: vi.fn().mockReturnThis(),
       select: vi.fn().mockReturnThis(),
       eq: vi.fn().mockResolvedValue({ data: [], error: null }),
     },
   }));
   ```

6. **Rodar e verificar**: `npm test`

## Examples

### Unit test de hook
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContratos } from '@/hooks/useContratos';

describe('useContratos', () => {
  it('should return contratos for current org', async () => {
    const { result } = renderHook(() => useContratos());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(supabase.from).mockRejectedValueOnce(new Error('Network'));
    const { result } = renderHook(() => useContratos());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### Component test
```tsx
import { render, screen } from '@testing-library/react';
import { ContratosTable } from '@/components/Contratos/ContratosTable';

it('should show empty state when no contratos', () => {
  render(<ContratosTable data={[]} />);
  expect(screen.getByText('Nenhum contrato encontrado')).toBeInTheDocument();
});
```

### E2E test
```typescript
import { test, expect } from '@playwright/test';

test('admin can create contract', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'securepassword');
  await page.click('[data-testid="login-btn"]');
  await page.goto('/contratos/novo');
  await expect(page.locator('h1')).toContainText('Novo Contrato');
});
```
