---
epicId: EPIC-2
title: "Test Coverage Improvement (< 5% → 70%)"
status: Draft
created: 2026-03-15
author: Claude Code (audit finding)
target_completion: Q2 2026 (end)
priority: HIGH
---

## Executive Summary

Lexflow atualmente possui **< 5% test coverage** (10 testes em 236 arquivos TypeScript/React), criando risco crítico de regressões silenciosas em produção, especialmente em componentes de segurança e compliance.

**Goal**: Aumentar cobertura de **< 5%** → **70%** em **3 sprints**, focando em componentes críticos de negócio.

**Blocker**: Refactoring futuro é impossível sem cobertura de testes adequada.

---

## Business Value

| Benefício | Impact | KPI |
|-----------|--------|-----|
| **Confiança em deploy** | Reduz regressões silenciosas | 0 bugs por regressão em prod |
| **Velocidade de refactor** | Permite modernizar código legado | Refactor 30% do codebase sem fear |
| **Onboarding** | Testes documentam comportamento esperado | Onboarding 50% mais rápido |
| **Compliance** | Auditoria de código crítico | 100% de path coverage em auth/compliance |

---

## Componentes Críticos SEM Cobertura

### 🔴 RISCO CRÍTICO (Priority 1)

#### 1. **Auth.tsx** (19.4KB, ~800 linhas)
**Risco**: Falha silenciosa em 2FA, OAuth, session management
- [ ] Login flow (OAuth2)
- [ ] 2FA/TOTP validation
- [ ] Password validation
- [ ] Session management
- [ ] Logout flow
- [ ] Error handling (wrong credentials, MFA failure, etc)

**Target**: 85% coverage

#### 2. **Dashboard.tsx** (25KB, ~1000 linhas)
**Risco**: KPI calculations incorretas não detectadas até produção
- [ ] KPI calculation (NCG, DIO, DSO, DPO)
- [ ] State management
- [ ] Realtime updates
- [ ] Filter/sort logic
- [ ] Chart rendering

**Target**: 80% coverage

#### 3. **ContratoDetalhes.tsx** (1191 linhas)
**Risco**: Form validation bugs, workflow inconsistencies
- [ ] Form submission
- [ ] Validation rules
- [ ] Workflow state transitions
- [ ] Approval process
- [ ] Error handling

**Target**: 75% coverage

### 🟠 RISCO ALTO (Priority 2)

#### 4. **Requisições.tsx** (approval workflow)
**Risco**: Approval chain breaks silently
- [ ] Approval routing
- [ ] Status transitions
- [ ] Notification triggering
- [ ] Budget checks

**Target**: 70% coverage

#### 5. **ComplianceLGPD.tsx** (compliance-critical)
**Risco**: Legal compliance gaps undetected
- [ ] LGPD data export
- [ ] Data retention policies
- [ ] User deletion flows
- [ ] Consent management

**Target**: 80% coverage

---

## Testing Stack

### Frameworks (Already installed)
- **Vitest** 3.2.4 — Unit testing engine
- **React Testing Library** — Component testing (best practices)
- **Playwright** — E2E testing (optional, for critical flows)

### Testing Patterns

```typescript
// Pattern: Arrange-Act-Assert
describe('Auth.tsx', () => {
  it('should validate TOTP token', () => {
    // ARRANGE
    const mockSupabase = { auth: { verifyOtp: jest.fn() } };

    // ACT
    const result = await verifyTOTP('123456', mockSupabase);

    // ASSERT
    expect(result).toBe(true);
  });
});
```

### Coverage Requirements

```javascript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
    }
  }
}
```

---

## Epic Stories

Cada story abaixo focará em UM componente crítico.

### STORY-2.1: Add Tests para Auth.tsx
**Estimation**: 13 pontos
**Priority**: CRITICAL (auth is security-critical)
**Acceptance Criteria**:
- [ ] 85% line coverage para Auth.tsx
- [ ] Tests para: login, 2FA, logout, error handling
- [ ] Mocks de Supabase auth configurados
- [ ] Tests passando em CI/CD

**Assignee**: @dev
**Timeline**: Sprint 1 (Week 1-2)

---

### STORY-2.2: Add Tests para Dashboard.tsx
**Estimation**: 13 pontos
**Priority**: HIGH (KPI calculations impact business decisions)
**Acceptance Criteria**:
- [ ] 80% line coverage para Dashboard.tsx
- [ ] Tests para: KPI calculation, state, filters, sorting
- [ ] Mock de TanStack React Query
- [ ] Performance: test execution < 5 segundos

**Assignee**: @dev
**Timeline**: Sprint 1 (Week 2-3)

---

### STORY-2.3: Add Tests para ContratoDetalhes.tsx
**Estimation**: 13 pontos
**Priority**: HIGH (workflow correctness)
**Acceptance Criteria**:
- [ ] 75% line coverage para ContratoDetalhes.tsx
- [ ] Tests para: form validation, state transitions, approval
- [ ] Edge cases: empty fields, invalid formats, concurrent updates
- [ ] Snapshot tests para form rendering

**Assignee**: @dev
**Timeline**: Sprint 2 (Week 4-5)

---

### STORY-2.4: Add Tests para Requisições.tsx
**Estimation**: 13 pontos
**Priority**: HIGH (approval chain)
**Acceptance Criteria**:
- [ ] 70% line coverage
- [ ] Tests para: approval routing, notifications, budget checks
- [ ] Integration test: end-to-end approval flow

**Assignee**: @dev
**Timeline**: Sprint 2 (Week 5-6)

---

### STORY-2.5: Add Tests para ComplianceLGPD.tsx
**Estimation**: 13 pontos
**Priority**: CRITICAL (legal compliance)
**Acceptance Criteria**:
- [ ] 80% line coverage
- [ ] Tests para: data export, retention, deletion, consent
- [ ] Audit trail: every action logged

**Assignee**: @dev
**Timeline**: Sprint 3 (Week 7-8)

---

## Sprint Roadmap

### Sprint 1 (Week 1-3)
- **STORY-2.1**: Auth tests (CRITICAL)
- **STORY-2.2**: Dashboard tests (HIGH)
- **Objective**: Secure critical paths, establish testing culture

### Sprint 2 (Week 4-6)
- **STORY-2.3**: ContratoDetalhes tests (HIGH)
- **STORY-2.4**: Requisições tests (HIGH)
- **Objective**: Workflow correctness, business logic coverage

### Sprint 3 (Week 7-9)
- **STORY-2.5**: Compliance tests (CRITICAL)
- **Objective**: Legal compliance, meet 70% target
- **Stretch goal**: 75% coverage

---

## Success Criteria

### Quantitative
| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Line coverage | < 5% | 70% | Q2 end |
| Branch coverage | < 5% | 65% | Q2 end |
| Critical paths tested | 0% | 100% | Sprint 3 |
| Test execution time | N/A | < 30s | Sprint 1 |
| CI/CD success rate | N/A | > 95% | Ongoing |

### Qualitative
- [ ] Developers confident refactoring code
- [ ] New contributors understand system via tests
- [ ] Bug discovery via tests (not production)
- [ ] Testing culture established (all new code has tests)

---

## Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Refactoring existing code takes longer | MÉDIA | MÉDIO | Allocate 20% sprint time to test refactor |
| Mock complexity grows | ALTA | BAIXO | Use factory patterns, shared fixtures |
| False positives em testes | MÉDIA | MÉDIO | Code review of tests by @qa |
| Coverage% vs actual quality gap | MÉDIA | MÉDIO | Focus on critical paths, not percentages |

---

## Exit Criteria (Epic Done)

- [ ] 70% line coverage achieved
- [ ] All 5 stories (2.1-2.5) PASSED QA gate
- [ ] CI/CD enforces coverage > 70% for new code
- [ ] Documentation: `docs/testing/TEST_STRATEGY.md`
- [ ] Team trained on testing patterns
- [ ] Next epic: "Refactoring Confidence" can start

---

## Links & References

- **Testing Setup**: `vitest.config.ts`, `src/test/setup.ts`
- **Existing Tests**: `src/__tests__/` (10 tests baseline)
- **Supabase Testing Guide**: https://supabase.com/docs/guides/testing
- **React Testing Library Docs**: https://testing-library.com/docs/react-testing-library/intro/

---

## Change Log

| Data | Autor | Ação | Observação |
|------|-------|------|-----------|
| 2026-03-15 | Claude Code | Criado | Epic a partir de audit finding (< 5% coverage) |
| 2026-03-15 | - | Status: Draft | Aguardando GO de @pm ou refinamento |

---

## Notes for @pm

**Recomendação de Go-to-Market**:
1. Confirmar prioridade (CRITICAL vs HIGH)
2. Alocar 5-6 sprints para este epic (15 pontos/sprint)
3. Considerar pair programming para acelerar
4. Integrar testing culture + code review rigoroso

**Post-Epic**: Considerar epic "Refactoring Confidence" para modernizar código legacy (Auth 2.0, Dashboard v2, etc) com tests como "proof of quality"
