

## Design System Foundation - LexFlow

Refatoracao completa dos tokens e componentes core para estabelecer uma base visual consistente antes de qualquer nova tela.

---

### 1. Tokens Globais (index.css)

**Espacamento 8pt grid**
- Atualizar `--radius` de `0.5rem` para `1.25rem` (20px) como raio padrao
- Adicionar tokens de espacamento no CSS: `--space-1: 0.25rem` (4px) ate `--space-16: 8rem` (128px), todos multiplos de 8px

**Escala tipografica**
- Padronizar 5 niveis com line-height e letter-spacing definidos:
  - `xs`: 0.75rem / 1rem
  - `sm`: 0.875rem / 1.25rem
  - `base`: 1rem / 1.5rem
  - `lg`: 1.125rem / 1.75rem
  - `xl`: 1.25rem / 1.75rem
- Atualizar regras de h1-h4 no `@layer base` com a nova escala

---

### 2. Tailwind Config (tailwind.config.ts)

- Atualizar `--radius` base para `1.25rem` (20px), tornando `rounded-lg` = 20px, `rounded-md` = 18px, `rounded-sm` = 16px
- Adicionar espacamentos alinhados ao 8pt grid: `4.5rem`, `5rem`, `5.5rem`, etc.
- Garantir que fontSize customizado use a escala xs/sm/base/lg/xl com line-heights corretos

---

### 3. Componentes Core

#### 3.1 Button (`button.tsx`)
- Alterar `rounded-md` para `rounded-xl` (herda 20px do token)
- Ajustar alturas para 8pt: `h-8` (sm), `h-10` (default), `h-12` (lg)
- Adicionar `transition-all duration-200` e sutil `active:scale-[0.98]` para microinteracao tatil
- Adicionar variante `cta` usando as cores amarelo/mostarda do LexFlow

#### 3.2 Card (`card.tsx`)
- Alterar `rounded-lg` para `rounded-2xl` (20px)
- Atualizar padding de `p-6` para `p-5` (mais alinhado ao 8pt grid: 20px)
- Adicionar `transition-shadow duration-200` no componente base

#### 3.3 Input (`input.tsx`)
- Alterar `rounded-md` para `rounded-xl`
- Garantir `h-10` (40px) consistente
- Adicionar `transition-colors duration-200`

#### 3.4 Textarea (`textarea.tsx`)
- Alterar `rounded-md` para `rounded-xl`
- Manter `min-h-[80px]` mas com padding 8pt

#### 3.5 Select (`select.tsx`)
- Trigger: `rounded-md` para `rounded-xl`
- Content: `rounded-md` para `rounded-xl`
- Items: `rounded-sm` para `rounded-lg`

#### 3.6 Dialog/Modal (`dialog.tsx`)
- Content: `sm:rounded-lg` para `sm:rounded-2xl`
- Adicionar `backdrop-blur-sm` no overlay para efeito glass moderno

#### 3.7 Skeleton (`skeleton.tsx` e `skeleton-loaders.tsx`)
- `rounded-md` para `rounded-xl` no skeleton base
- Skeletons de cards herdam `rounded-2xl`

#### 3.8 AnimatedCard (`animated-card.tsx`)
- `rounded-lg` para `rounded-2xl`

#### 3.9 AnimatedButton (`animated-button.tsx`)
- `rounded-md` para `rounded-xl`
- Mesmas variantes de tamanho do Button padrao

---

### 4. CSS Utilitarios (index.css - @layer components)

- `.card-elevated`: `rounded-xl` para `rounded-2xl`
- `.stat-card`: `rounded-xl` para `rounded-2xl`, padding `p-5` (20px = 8pt grid)
- Garantir que `.badge-*` use `rounded-xl`
- `.btn-cta`: `rounded-xl` + microinteracao

---

### 5. Layout Responsivo

- Confirmar que o container usa padding `1.5rem` (24px, 3x8pt)
- Padronizar gaps de grid para `gap-4` (16px) e `gap-6` (24px) -- ambos multiplos de 8pt
- Abordagem: **desktop-first** com breakpoints `lg > md > sm` (ja e o padrao atual)

---

### 6. Linguagem Visual

- Todas as transicoes: `duration-200` com `ease-out` como padrao
- Microinteracoes em botoes: `active:scale-[0.98]` e `hover:translate-y-[-1px]`
- Cards interativos: `hover:shadow-md hover:border-primary/20` + `transition-all duration-200`
- Modais: backdrop blur + entrada com `zoom-in-95`

---

### Resumo de Arquivos Modificados

| Arquivo | Mudanca Principal |
|---|---|
| `src/index.css` | Radius 20px, escala tipografica, utilitarios card/badge/btn |
| `tailwind.config.ts` | Radius tokens, espacamento 8pt |
| `src/components/ui/button.tsx` | rounded-xl, alturas 8pt, variante cta, microinteracao |
| `src/components/ui/card.tsx` | rounded-2xl, padding 20px |
| `src/components/ui/input.tsx` | rounded-xl, transicao |
| `src/components/ui/textarea.tsx` | rounded-xl |
| `src/components/ui/select.tsx` | rounded-xl trigger/content |
| `src/components/ui/dialog.tsx` | rounded-2xl, backdrop blur |
| `src/components/ui/skeleton.tsx` | rounded-xl |
| `src/components/ui/skeleton-loaders.tsx` | rounded-2xl nos cards |
| `src/components/ui/animated-card.tsx` | rounded-2xl |
| `src/components/ui/animated-button.tsx` | rounded-xl, alturas 8pt |

Nenhuma tela ou pagina sera alterada -- apenas os tokens e componentes base, para que todas as telas existentes herdem a nova linguagem visual automaticamente.

