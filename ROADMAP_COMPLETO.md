# Roadmap Completo — Melhorias de Código (P0-P4)

**Status:** Em execução  
**Escopo:** 4 prioridades, ~10-12 horas total  
**Formato:** Serial (uma priority por vez)

---

## 📋 Breakdown Completo

### ✅ P0 — Impacto Alto (JÁ FEITO)
- [x] Extract magic strings para constantes (routes.ts)
- [x] Extrair features array para config (landing.ts)
- [x] Component composition — Index.tsx (5 componentes)
- [x] Push para GitHub

**Tempo gasto:** 4-6h  
**Commit:** 210a845

---

### ⏳ P1 — Manutenibilidade (PRÓXIMO)

#### 1.1 Type-safe Supabase client
```typescript
// src/types/database.ts (gerado via CLI)
export type Database = { ... }

// Usar em qualquer query:
import type { Database } from '@/types/database';
const supabase = createClient<Database>(url, key);
supabase.from('contratos').select('*') // tipado!
```

**Archivos a criar:**
- `src/types/database.ts` (template + instruções)
- `src/lib/supabase-client.ts` (factory tipado)
- Documentação de uso

**Tempo:** 1h

---

#### 1.2 React Query hooks pattern
```typescript
// src/hooks/useContratos.ts
export const useContratos = (orgId: string) => {
  return useQuery({
    queryKey: ['contratos', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 2,
  });
};

// Usar em componentes:
const { data: contratos, isLoading, error } = useContratos(orgId);
```

**Arquivos a criar:**
- `src/hooks/useContratos.ts`
- `src/hooks/useFornecedores.ts`
- `src/hooks/useFranquias.ts`
- Padrão reutilizável

**Tempo:** 2h

---

#### 1.3 Error boundaries + fallback UI
```typescript
// src/components/ErrorBoundary.tsx
export const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return (props) => (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// Usar:
export default withErrorBoundary(Dashboard);
```

**Arquivos a criar:**
- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorFallback.tsx`
- Wrapper HOC para aplicar em páginas críticas

**Tempo:** 1h

---

### ⏳ P2 — Performance (OPCIONAL)

#### 2.1 Lazy load chunks grandes
```typescript
// vite.config.ts já tem split, mas validar:
// - recharts carrega só em Dashboard? ✅
// - dnd-kit carrega só em Kanban? ✅
// - jsPDF carrega sob demanda? (TODO)

// Implementar lazy loading:
const ExportModal = lazy(() => import('@/components/ExportModal')); // carrega jsPDF aqui
```

**Arquivos a criar:**
- Validação de vite.config.ts (já feito)
- Identificar onde recharts/dnd-kit/jsPDF são importados
- Lazy load componentes que usam bibliotecas pesadas

**Tempo:** 30min

---

#### 2.2 Image optimization
```typescript
// Se houver imagens em landing:
// src/assets/logo.png → converter para webp com Vite plugin

// Uso:
import logo from '@/assets/logo.png?w=200&h=200&format=webp';
<img src={logo} alt="Logo" />
```

**Arquivos a criar:**
- Validar se há imagens em public/assets
- Configurar Vite image plugin (opcional)

**Tempo:** 30min

---

### ⏳ P3 — Testing

#### 3.1 Cobertura de testes
```typescript
// Já temos template: HeroSection.test.tsx

// Replicar para:
// src/__tests__/components/landing/LandingHeader.test.tsx
// src/__tests__/components/landing/FeaturesGrid.test.tsx
// src/__tests__/hooks/useContratos.test.ts
// src/__tests__/lib/supabase-client.test.ts
```

**Arquivos a criar:**
- 5+ testes unitários (copiar padrão)
- Test utilities/mocks para Supabase
- CI config (GitHub Actions)

**Tempo:** 2h

---

### ⏳ P4 — Documentação

#### 4.1 API docs inline
```typescript
/**
 * Retorna contratos da organização atual
 * @param options.status - Filter por status ('ativo' | 'vencido' | 'renovacao')
 * @param options.sortBy - Ordem ('data_criacao' | 'data_vencimento')
 * @returns Promise<Contract[]>
 * @example
 * const contratos = await getContratos({ status: 'vencido' });
 */
export async function getContratos(options?: GetContratosOptions): Promise<Contract[]> {
  // ...
}
```

**Arquivos a criar:**
- Adicionar JSDoc em funções/hooks principais
- `docs/API.md` gerado do JSDoc

**Tempo:** 1h

---

## 🎯 Executar em Ordem

```
1. P1.1 — Type-safe Supabase (1h)
2. P1.2 — React Query hooks (2h)
3. P1.3 — Error boundaries (1h)
4. P2.1 — Lazy loading (30min)
5. P2.2 — Image optimization (30min)
6. P3.1 — Testes (2h)
7. P4.1 — Documentação (1h)

Total: 8-10 horas
```

---

## 📊 Impacto Esperado

| P | Área | Ganho | ROI |
|---|------|-------|-----|
| P0 | Code Structure | 72% menos linhas, type-safe | ✅ FEITO |
| P1.1 | Data Fetching | Zero runtime errors, autocomplete | ALTO |
| P1.2 | State Mgmt | Offline resilience, cache | ALTO |
| P1.3 | Reliability | App não quebra, error tracking | ALTO |
| P2 | Performance | -30% LCP, faster FCP | MÉDIO |
| P3 | Confidence | Regression detection | MÉDIO |
| P4 | DX | Menos Slack questions | BAIXO |

---

## ✅ Checklist Final

Depois de tudo:
- [ ] npm run lint → 0 erros
- [ ] npm run typecheck → 0 erros
- [ ] npm test → testes rodam
- [ ] npm run dev → sem warnings
- [ ] Visual no browser é idêntico
- [ ] GitHub tem novo commit com P1-P4

---

## 🚀 Começar?

Responder com `sim` para ativar @dev em P1-P4
