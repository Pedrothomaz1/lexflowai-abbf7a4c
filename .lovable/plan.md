
# LexFlow Advanced UX Enhancements Plan

## Overview

This plan implements enterprise-grade UX improvements across four key areas: Onboarding Tour, KPI Microcopy, Design Token refinements, and an Executive Dashboard variant. All changes are purely UX/UI-focused with no modifications to business logic or architecture.

---

## 1. Onboarding Tour (3-Step Guided Introduction)

### Goal
Create a non-intrusive, progressive onboarding experience that guides new users through the core features of LexFlow.

### Implementation

**New Files:**
- `src/components/Onboarding/OnboardingTour.tsx` - Main tour component
- `src/components/Onboarding/TourStep.tsx` - Individual step spotlight component
- `src/components/Onboarding/TourProgress.tsx` - Progress indicator (3 dots)
- `src/hooks/useOnboardingTour.ts` - Tour state management with localStorage persistence

**Tour Steps Configuration:**

| Step | Focus | Message | CTA |
|------|-------|---------|-----|
| 1 | Dashboard geral | "Bem-vindo ao LexFlow! Aqui voce acompanha todos os indicadores da sua gestao de contratos em tempo real." | Proximo |
| 2 | Criacao de contratos ou servicos | "Crie novos contratos ou servicos com poucos cliques. Use os templates prontos para agilizar o processo." | Proximo |
| 3 | Alertas e indicadores | "Receba alertas automaticos sobre vencimentos, riscos e aprovacoes pendentes. Nunca perca um prazo importante." | Finalizar |

**Behavior:**
- Shows only on first visit (stored in localStorage: `lexflow_onboarding_completed`)
- Can be skipped at any moment via X button
- Spotlight effect with overlay on target element
- Smooth transitions between steps using framer-motion
- Mobile-responsive positioning

**Integration Points:**
- Inject `<OnboardingTour />` in `DashboardLayout.tsx`
- Target elements:
  - Step 1: Dashboard KPI grid area
  - Step 2: "Novo Contrato" button or sidebar menu
  - Step 3: Alert banner or Sidebar "Alertas" menu item

---

## 2. KPI Microcopy Refinement

### Goal
Make all KPI help texts decision-oriented, clear, and accessible to non-technical users.

### Style Guidelines
- Explain what the KPI measures
- Explain business impact
- Avoid technical jargon
- Use short, direct sentences

### Changes to `src/lib/help-texts.ts`

**Dashboard KPIs (revised):**

```text
contratosAtivos: 
  "Contratos em vigor que geram obrigacoes e custos. 
   Monitore para controlar exposicao financeira."

valorTotal: 
  "Valor acumulado de todos os contratos ativos. 
   Ajuda a dimensionar o impacto no orcamento."

vencendo30Dias: 
  "Contratos proximos do vencimento. 
   Acao recomendada: revisar e decidir sobre renovacao."

riscosAltos: 
  "Contratos com clausulas de alto risco identificadas por IA. 
   Priorize a revisao juridica destes itens."

fornecedores: 
  "Total de parceiros comerciais cadastrados. 
   Base para analises de concentracao de fornecimento."

valorMedio: 
  "Valor medio por contrato ativo. 
   Indica o porte tipico das negociacoes."

aprovacoesPendentes: 
  "Contratos aguardando decisao. 
   Atrasos podem impactar prazos de projetos."

tempoMedioAprovacao: 
  "Dias para aprovar um contrato. 
   Meta: ate 5 dias. Acima disso, revise o fluxo de aprovacao."
```

**Additional KPIs to add:**
- `conformidadeGeral`: "Percentual de contratos em conformidade com politicas internas. Abaixo de 90% requer atencao."

---

## 3. Design Tokens Adjustments

### Goal
Fine-tune visual states (hover, active, disabled) for better clarity and WCAG AA contrast compliance.

### Changes to `src/index.css`

**Interactive States Enhancement:**

```css
/* Enhanced hover states - more visible feedback */
.stat-card:hover {
  box-shadow: var(--shadow-md);
  border-color: hsl(var(--primary) / 0.3);
  transform: translateY(-2px);
}

/* Active/pressed state - clear feedback */
.stat-card:active,
.card-interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
  border-color: hsl(var(--primary) / 0.5);
}

/* Disabled state - distinct but not invisible */
.stat-card-disabled,
[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

/* Focus visible for keyboard navigation */
.stat-card:focus-visible,
.card-interactive:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

**Contrast Improvements:**
- Ensure `--muted-foreground` has minimum 4.5:1 ratio against backgrounds
- Adjust `--lexflow-verde-claro` for better readability on dark sidebar

**New CSS utility classes:**
```css
.state-hover-visible { /* Applied to interactive elements */ }
.state-active-clear { /* For pressed/selected states */ }
.state-disabled-distinct { /* For disabled elements */ }
```

---

## 4. Executive Dashboard Variant

### Goal
Create a high-level, scannable dashboard optimized for C-Level executives with minimal visual noise.

### Metrics Displayed
1. Contratos ativos (count + trend)
2. Valor total (formatted compactly)
3. Riscos altos (count with critical badge)
4. Vencimentos proximos (30 days)
5. Conformidade geral (percentage with progress ring)

### Layout: One-Screen, High-Level, Scannable

**New/Modified Files:**
- `src/components/Dashboard/ExecutiveSummary.tsx` - Compact KPI row component
- `src/components/Dashboard/ComplianceRing.tsx` - Circular progress for compliance %
- `src/pages/Dashboard.tsx` - Add toggle for Executive View vs Detailed View

**Visual Style:**
- Minimalist design with generous whitespace
- Insight-oriented: Each metric shows trend arrow and brief insight
- Low visual noise: Remove decorative elements in exec mode
- Large, scannable numbers with compact formatting

**Structure:**

```text
+--------------------------------------------------+
|  EXECUTIVE SUMMARY                    [Toggle]   |
+--------------------------------------------------+
|  [42]        [R$ 12.5M]     [5]      [8]    [92%]|
|  Ativos      Valor Total   Riscos  Vence   Conf. |
|  +12%        +8% vs mes    Critico  30d    OK    |
+--------------------------------------------------+
|                                                   |
|  [Quick Insight Card]                            |
|  "5 contratos com risco alto requerem revisao    |
|   juridica. 8 vencem em 30 dias."                |
|                                                   |
+--------------------------------------------------+
```

**Toggle Behavior:**
- Default: Shows current detailed dashboard
- Executive: Compact summary mode
- Persisted in localStorage: `lexflow_dashboard_mode`

---

## Technical Implementation Details

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/Onboarding/OnboardingTour.tsx` | CREATE | Main tour overlay component |
| `src/components/Onboarding/TourStep.tsx` | CREATE | Individual step with spotlight |
| `src/components/Onboarding/TourProgress.tsx` | CREATE | 3-dot progress indicator |
| `src/components/Onboarding/index.ts` | CREATE | Export barrel |
| `src/hooks/useOnboardingTour.ts` | CREATE | Tour state management hook |
| `src/components/Dashboard/ExecutiveSummary.tsx` | CREATE | Exec dashboard summary row |
| `src/components/Dashboard/ComplianceRing.tsx` | CREATE | Circular compliance meter |
| `src/lib/help-texts.ts` | MODIFY | Update all KPI microcopy |
| `src/index.css` | MODIFY | Add state classes for hover/active/disabled |
| `src/pages/Dashboard.tsx` | MODIFY | Add exec mode toggle and ExecutiveSummary |
| `src/components/DashboardLayout.tsx` | MODIFY | Inject OnboardingTour component |
| `src/components/ui/stat-card.tsx` | MODIFY | Add focus-visible and state classes |

### Dependencies
- All existing dependencies (framer-motion, lucide-react, etc.)
- No new npm packages required

### Accessibility Considerations
- All tour elements are keyboard navigable
- Focus trap within tour steps
- aria-labels for all interactive elements
- Reduced motion option respected via `prefers-reduced-motion`
- Contrast ratios verified for WCAG AA compliance

### Mobile Responsiveness
- Tour adapts to smaller screens with bottom-positioned tooltips
- Executive summary stacks vertically on mobile
- Touch-friendly tap targets (min 44x44px)

---

## Execution Order

1. **Phase 1: Design Tokens** - CSS state improvements
2. **Phase 2: KPI Microcopy** - Update help-texts.ts
3. **Phase 3: Executive Dashboard** - New components + toggle
4. **Phase 4: Onboarding Tour** - Full tour implementation
5. **Phase 5: Integration** - Connect all pieces in DashboardLayout

Each phase is independently testable and can be reviewed separately.
