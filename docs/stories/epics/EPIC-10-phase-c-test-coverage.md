---
epicId: EPIC-10
title: "Phase C - Test Coverage Expansion (70%+ Coverage)"
status: Draft
created: 2026-03-15
priority: CRITICAL
phase: "C - Expansion"
---

## Visão

Expandir cobertura de testes de 420 para **70%+ do codebase completo**, incluindo E2E tests de workflows críticos, unit tests de componentes frontend, e integration tests de APIs. Objetivo: garantir qualidade antes de security audit (Phase D).

## Business Case

- **Risco atual:** 227 arquivos fonte, 42 páginas, muitos componentes untested
- **Impacto:** Bugs em produção = customer churn + reputação
- **ROI:** Cada 1% de cobertura = 2-3% menos bugs em produção
- **Timeline:** 10-12 sprints (2-3 semanas intensive)

## Acceptance Criteria

### AC 1: E2E Tests para Workflows Críticos ✅
- [ ] Contrato → Requisição → Aprovação → Pagamento (happy path)
- [ ] Error handling (approval rejection, invalid data, timeout)
- [ ] Multi-user flows (requisitor + approver + finance)
- **Coverage Target:** 100% de workflows críticos

### AC 2: Unit Tests para Componentes Frontend ✅
- [ ] 30+ componentes Servicos, Contratos, Requisicoes
- [ ] Form validation, state management, event handlers
- [ ] Dark mode switching, responsive behavior
- **Coverage Target:** 80%+ de componentes

### AC 3: Integration Tests para APIs ✅
- [ ] Supabase queries (select, insert, update, delete, RLS)
- [ ] Edge Functions (approval logic, notifications, exports)
- [ ] Third-party integrations (if any)
- **Coverage Target:** 85%+ de API endpoints

## Scope

### IN
- ✅ E2E tests (Playwright/Cypress)
- ✅ Unit tests (Vitest + React Testing Library)
- ✅ Integration tests (API + Database)
- ✅ Component visual regression tests (optional but recommended)
- ✅ Performance baseline tests (load times, render metrics)
- ✅ Test infrastructure (CI/CD hooks, coverage reporting)

### OUT
- ❌ Security penetration testing (→ Phase D)
- ❌ Performance optimization (→ Phase D)
- ❌ Production deployment (→ Phase E)
- ❌ Manual QA (→ Phase E)

## Stories (Breakdown)

**Wave 1: Infrastructure & Setup (Sprint 1)**
- [ ] STORY-10.1: E2E test framework setup (Playwright)
- [ ] STORY-10.2: Coverage reporting infrastructure
- [ ] STORY-10.3: CI/CD integration for test gates

**Wave 2: Critical Workflows (Sprint 2-3)**
- [ ] STORY-10.4: E2E tests - Contrato creation → Requisição → Approval flow
- [ ] STORY-10.5: E2E tests - Error handling & edge cases
- [ ] STORY-10.6: E2E tests - Multi-user approval flows

**Wave 3: Component Coverage (Sprint 4-5)**
- [ ] STORY-10.7: Unit tests - Servicos module components
- [ ] STORY-10.8: Unit tests - Contratos module components
- [ ] STORY-10.9: Unit tests - Requisicoes module components
- [ ] STORY-10.10: Unit tests - Dashboard & Settings components

**Wave 4: API & Integration (Sprint 6)**
- [ ] STORY-10.11: Integration tests - Supabase RLS queries
- [ ] STORY-10.12: Integration tests - Edge Functions workflows
- [ ] STORY-10.13: Integration tests - Data consistency checks

**Wave 5: Polish & Reporting (Sprint 7)**
- [ ] STORY-10.14: Performance baseline tests
- [ ] STORY-10.15: Coverage report + documentation
- [ ] STORY-10.16: Test optimization + cleanup

## Agentes & Skills Necessários

| Agente | Role | Sprints |
|--------|------|---------|
| @dev | Implementar testes | 1-7 |
| @qa | Design de test strategy | 1, 6 |
| @architect | Architecture review (test design) | 1 |
| @data-engineer | Database/RLS test design | 6 |

## Complexidade

| Dimensão | Score | Notas |
|----------|-------|-------|
| Scope | 4/5 | 70+ páginas/componentes para cobrir |
| Integration | 3/5 | APIs + Database + UI integration |
| Knowledge | 2/5 | Padrões já existem (Vitest, RTL) |
| Risk | 3/5 | Risk: coverage inflation (tests without substance) |
| **Total** | **3.4/5 (Medium-High)** | ~50-60 story points |

## Success Metrics

| Métrica | Meta | Baseline |
|---------|------|----------|
| Code Coverage | 70%+ | ~5% |
| Test Count | 1000+ | 420 |
| E2E Workflows | 100% | 0% |
| CI Pass Rate | 95%+ | N/A |
| Test Execution Time | <10min | N/A |

## Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Coverage inflation (low-quality tests) | ALTA | MÉDIO | Code review all tests, enforce AC strictly |
| Flaky E2E tests (timing issues) | MÉDIA | ALTO | Use proper waits, retry logic |
| Database state pollution | MÉDIA | MÉDIO | Fixtures + cleanup, isolated test databases |
| Test maintenance burden | ALTA | MÉDIO | Reusable fixtures, clear naming, documentation |

## Notes

- **Estratégia:** TDD-light - escrever testes ANTES de saber implementação (force better design)
- **Padrão:** Copiar padrões já estabelecidos (compliance.fixtures.ts, requisition tests)
- **Dependency:** Phase C BLOQUEIA Phase D (security audit requer código testável)
- **QA Gate:** @qa valida coverage quality (não quantidade) na sprint 7

---

**Próxima fase:** EPIC-11 (Security & Performance) - começa após EPIC-10 AC1 completo
