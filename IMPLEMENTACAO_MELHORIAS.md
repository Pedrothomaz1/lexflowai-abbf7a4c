# Implementação de Melhorias de Código

**Data:** 2026-05-23  
**Status:** Estrutura criada, pronto para implementação  
**Estimativa:** 4-6 horas de trabalho (pode ser feito em sprints)

---

## 📋 Sumário das Mudanças

| # | Ação | Arquivos | Impacto | Tempo |
|---|------|----------|--------|-------|
| 1 | Extract constantes de routing | `src/constants/routes.ts` | Type-safe routing, sem typos | 15min |
| 2 | Centralizar config de landing | `src/constants/landing.ts` | i18n-ready, feature flags, hotfix | 30min |
| 3 | Decomposição de Index.tsx | 5 componentes em `src/components/landing/` | Testável, reutilizável, manutenível | 2h |
| 4 | Adicionar testes unitários | `src/__tests__/components/landing/*.test.tsx` | Zero regression, confidence | 1h |
| 5 | Validar Supabase typing | `src/types/database.ts` (gerado) | Zero runtime errors | 20min |

---

## 🎯 Passo a Passo

### Passo 1: Usar constantes de routing (15 min)

Todos os arquivos que fazem `navigate("/planos")` devem usar:

```typescript
import { ROUTES } from '@/constants/routes';

// ANTES
navigate("/planos")
navigate("/auth")

// DEPOIS
navigate(ROUTES.PLANS)
navigate(ROUTES.AUTH)
```

**Arquivos para atualizar:**
- `Index.tsx` (já temos `Index.refactored.tsx` como referência)
- Qualquer componente com `navigate()`
- Links/redirects em páginas

**Validação:** Rodar `npm run lint` — TypeScript deve não achar erros de string literal.

---

### Passo 2: Usar constantes de landing (30 min)

Qualquer valor hardcoded em `Index.tsx` vem de `src/constants/landing.ts`:

```typescript
import { LANDING_FEATURES, HERO_HIGHLIGHTS, VALUE_PROPOSITION } from '@/constants/landing';

// ANTES (em Index.tsx)
const features = [
  { icon: Bell, title: "Antecipe...", description: "..." },
  // ...
];

// DEPOIS (em landing.ts)
// const features = LANDING_FEATURES;
// // Estrutura: id + icon + title + description
```

**Benefícios:**
- Feature flags futura: `if (featureFlags.includes('anticipate-deadlines'))`
- i18n: mudar `title` para `titleKey` depois
- Hotfix: muda valor sem rebuild (se carregar dinamicamente)

**Validação:** Todas as features ainda renderizam visualmente igual.

---

### Passo 3: Decompor Index.tsx (2 horas)

**Estrutura criada:**
```
src/components/landing/
├── LandingHeader.tsx        ← navbar + logo
├── HeroSection.tsx          ← headline + highlights + CTAs
├── FeaturesGrid.tsx         ← 4 feature cards
├── ValueProposition.tsx      ← "O tempo certo" callout
├── LandingFooter.tsx        ← footer com ano dinâmico
└── index.ts                 ← barrel export
```

**Como implementar:**

1. Copiar `Index.refactored.tsx` para `Index.tsx`
2. Verificar que imports estão corretos:
   ```typescript
   import { LandingHeader, HeroSection, ... } from '@/components/landing';
   ```
3. Deletar o código antigo de `Index.tsx` (165 linhas → 30 linhas)
4. Rodar `npm run dev` — landing deve ficar visualmente idêntica

**Checklist:**
- [ ] Header renderiza (logo + nav buttons)
- [ ] Hero section renderiza (headline + 3 highlights + 2 CTAs)
- [ ] Features grid renderiza (4 cards)
- [ ] Value proposition renderiza (callout)
- [ ] Footer renderiza (copyright year é dinâmico)
- [ ] Clicks em botões funcionam
- [ ] Estilo visual idêntico ao original

---

### Passo 4: Adicionar testes (1 hora)

Template criado: `src/__tests__/components/landing/HeroSection.test.tsx`

Padrão para outros componentes:

```typescript
// HeroSection.test.tsx
describe("HeroSection", () => {
  it("renders headline", () => {
    render(<BrowserRouter><HeroSection /></BrowserRouter>);
    expect(screen.getByText(/Contratos sob controle/)).toBeInTheDocument();
  });

  it("primary CTA navigates to auth", () => {
    // Mock navigate, click button, verify called with ROUTES.AUTH
  });

  it("secondary CTA scrolls to features", () => {
    // Mock getElementById, click button, verify scrollIntoView called
  });
});

// LandingHeader.test.tsx
describe("LandingHeader", () => {
  it("renders logo", () => { ... });
  it("Plan button navigates to /planos", () => { ... });
  it("Login button navigates to /auth", () => { ... });
});

// FeaturesGrid.test.tsx
describe("FeaturesGrid", () => {
  it("renders all features from config", () => {
    render(<FeaturesGrid />);
    expect(screen.getByText(/Antecipe vencimentos/)).toBeInTheDocument();
    // ... 3 more features
  });

  it("each feature has testid for analytics", () => {
    // Verify feature-card-{id} testids exist
  });
});
```

**Rodar:**
```bash
npm test -- HeroSection.test.tsx --watch
# Deve passar: 6 testes
```

---

### Passo 5: Validar Supabase typing (20 min)

**Verificar** que supabase client é tipado:

```bash
# 1. Gerar tipos do banco
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# 2. Em qualquer arquivo que usa Supabase:
import type { Database } from '@/types/database';
const supabase = createClient<Database>(url, key);

// Agora isto tem autocomplete:
supabase.from('contratos')
  .select('*')
  .eq('organization_id', orgId)
  // ^ contratos, organization_id são sugeridos automaticamente
```

**Validação:**
- Nenhum erro de tipo em `npm run typecheck`
- Autocomplete funciona em VS Code

---

## 📊 Antes vs Depois

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **Linhas Index.tsx** | 165 | 30 | -82% (modular) |
| **Componentes menores** | 0 | 5 | testáveis |
| **Magic strings** | ~20 | 0 | type-safe |
| **Testabilidade** | baixa | alta | confidence |
| **Tempo refactor landing** | ∞ | 5 min | hotfix ready |

---

## ⚠️ Possíveis Quebras

Se seguir este guia, NÃO quebra nada:

1. **Visual** — layouts são idênticos (mesmos Tailwind classes)
2. **Routing** — ROUTES é drop-in replacement de strings
3. **Config** — LANDING_FEATURES tem mesma estrutura que array anterior
4. **SEO** — index.html, meta tags não mudam

Se quebrar algo:
- Check se imports estão corretos (`@/components/landing`)
- Rodar `npm run lint` — erros de import aparecerão
- Rodar `npm run dev` — visual bugs são óbvios

---

## 🚀 Próximas Melhorias (P1-P2)

Depois de terminar isso, continue com:

1. **Extract React Query patterns** (`src/hooks/useContratos.ts` com staleTime, retry)
2. **Add error boundaries** em Dashboard, Contratos, etc
3. **Lazy load chunks grandes** — validar recharts, dnd-kit carregam só quando needed
4. **Image optimization** — se houver imagens, converter para webp com Vite

---

## 📝 Checklist Final

- [ ] `src/constants/routes.ts` criado ✅
- [ ] `src/constants/landing.ts` criado ✅
- [ ] 5 componentes em `src/components/landing/` criados ✅
- [ ] `Index.refactored.tsx` como template ✅
- [ ] `HeroSection.test.tsx` como template ✅
- [ ] Testes rodam (`npm test`)
- [ ] Linting passa (`npm run lint`)
- [ ] Visual idêntico ao original
- [ ] Routing é type-safe (ROUTES.*)

---

## 🤝 Dúvidas?

Referência rápida:
- **Routing:** Veja `src/constants/routes.ts` para padrão
- **Config:** Veja `src/constants/landing.ts` para estrutura Feature/Highlight
- **Componentes:** Copie padrão de `LandingHeader.tsx` para novos
- **Testes:** Copie padrão de `HeroSection.test.tsx`

**Tempo estimado total:** 4-6 horas (pode ser feito em sprints de 1-2h)
