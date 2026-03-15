---
title: Phase A Action Plan — Fix Critical Blocking Issues
date: 2026-03-15
target: Production Readiness
status: READY_FOR_EXECUTION
owner: @dev (Dex)
---

# ⚡ Phase A: Critical Blocking Issues (2-3 Days)

**Goal:** Make the project production-ready for Phase B (feature implementation)

**Scope:** 5 critical tasks to fix before starting EPIC-2 stories

---

## Task A1: Add Test Script to package.json (0.5 hours)

### Objective
Configure npm scripts for testing so CI/CD and developers can run tests

### Current State
```bash
$ npm run test
# Error: Missing script: "test"
```

### Steps

**Step 1: Update package.json**

Find the `"scripts"` section in package.json and add:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 2: Verify**

```bash
npm run test
# Should output: "Test Files  [X passed] ([X] files)"
npm run test:watch
# Should start watch mode
```

### Acceptance Criteria
- [ ] `npm run test` runs all tests without error
- [ ] `npm run test:watch` starts watch mode
- [ ] Tests are discoverable and count correct

### Est. Effort
0.5 hours | 1 person

**Blocker for:** Task A2, A3, all of Phase B

---

## Task A2: Install & Configure Coverage Tool (1 hour)

### Objective
Enable code coverage measurement to track progress toward 70% target

### Current State
```bash
$ npm run test:coverage
# Error: coverage tool not configured
```

### Steps

**Step 1: Install coverage provider**

```bash
npm install --save-dev @vitest/coverage-v8
```

**Step 2: Update vitest.config.ts**

Add coverage config:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportOnFailure: true,
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/index.ts'
      ]
    }
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Step 3: Verify**

```bash
npm run test:coverage
# Should generate:
#   - coverage/index.html (open in browser)
#   - coverage/coverage-final.json
#   - Shows coverage percentages in terminal
```

### Acceptance Criteria
- [ ] `npm run test:coverage` completes without error
- [ ] Coverage report generated (HTML + JSON)
- [ ] Can view coverage in `coverage/index.html`
- [ ] Shows line, branch, function coverage %

### Est. Effort
1 hour | 1 person

**Blocker for:** Measuring EPIC-2 progress toward 70% target

---

## Task A3: Fix 18 Failing Tests (4-6 hours)

### Objective
Get all tests passing (100% pass rate) before implementing new features

### Current State
```
Test Files:  8 failed | 8 passed
Tests:       18 failed | 150 passed (89% pass rate)
```

### Failing Tests by Category

#### Category 1: Dashboard Tests (3 failures)

**Files:** `src/__tests__/pages/Dashboard.test.tsx`

**Error:** `TypeError: localStorage.getItem is not a function`

**Root Cause:** localStorage not mocked in test environment

**Fix Steps:**

1. Open `src/test/setup.ts`
2. Add localStorage mock:

```typescript
// src/test/setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

3. Verify test passes:
```bash
npm run test -- src/__tests__/pages/Dashboard.test.tsx
# Should show: ✓ [3 tests passed]
```

#### Category 2: Card Component Tests (2 failures)

**Files:** `src/components/ui/Card.test.tsx`

**Error:** `expect(element).toHaveClass("rounded-lg border bg-card shadow-sm")`

**Root Cause:** CSS class assertion mismatch

**Fix Steps:**

1. Open the failing test
2. Check actual rendered classes vs. expected
3. Update assertion to match actual classes:

```typescript
// Example fix
expect(element).toHaveClass('rounded-lg'); // Check individual classes
expect(element).toHaveClass('border');
expect(element).toHaveClass('bg-card');
expect(element).toHaveClass('shadow-sm');
```

OR use:

```typescript
const classes = element.className;
expect(classes).toContain('rounded-lg');
expect(classes).toContain('border');
```

4. Verify:
```bash
npm run test -- src/components/ui/Card.test.tsx
# Should show: ✓ [tests passed]
```

#### Category 3: Document Validation (1 failure)

**Files:** `src/utils/documentValidation.test.ts`

**Test:** `valida outros CPFs válidos conhecidos`

**Root Cause:** Test data or validation logic edge case

**Fix Steps:**

1. Run test with verbose output:
```bash
npm run test -- src/utils/documentValidation.test.ts --reporter=verbose
```

2. Find the failing assertion and debug:
```typescript
// Check the CPF being tested
const testCPF = '12345678901'; // Example
const result = validateCPF(testCPF);
// Expected: true, Got: false
```

3. Verify validation logic or update test data
4. If validation logic is correct, update test expectation

#### Category 4: Permissions Test (1 failure)

**Files:** `src/__tests__/security/permissions.test.tsx`

**Test:** `PERM-002: has_permission() returns false for non-existing permission`

**Error:** `expected true to be false`

**Fix Steps:**

1. Review test logic:
```typescript
// In the test file, find:
expect(result.data).toBe(false);
// But actual result is true

// Root cause: likely permission check logic is inverted or mock not correct
```

2. Fix either:
   - Test expectation (if logic is correct)
   - Mock setup (if mock is wrong)
   - Code logic (if code is wrong)

3. Verify:
```bash
npm run test -- src/__tests__/security/permissions.test.tsx
```

#### Category 5: Component Tests (11 other failures)

**Process for each:**

```bash
# 1. Run tests to see exact failure
npm run test -- {failing-test-file}

# 2. Read error message carefully
# 3. Fix one of: assertion, mock, component behavior
# 4. Re-run to verify
# 5. Repeat for next failing test
```

### Acceptance Criteria
- [ ] All 18 tests fixed and passing
- [ ] `npm run test` shows 100% pass rate
- [ ] No skipped tests (all run and pass)
- [ ] No console warnings/errors during tests

### Est. Effort
4-6 hours | 1 person

**Command to Verify:**
```bash
npm run test
# Expected output:
# ✓ Test Files  16 passed (16)
# ✓ Tests      168 passed (168)
```

**Blocker for:** Phase B, production deployment

---

## Task A4: Add CI/CD Test Pipeline (1-2 hours)

### Objective
Automate testing on every commit/PR to prevent regressions

### Current State
- No GitHub Actions workflow configured for tests
- No CI/CD testing happening

### Steps

**Step 1: Check GitHub Actions**

```bash
ls -la .github/workflows/
# Look for: test.yml, ci.yml, or similar
```

**Step 2: Create or update test workflow**

If `.github/workflows/` doesn't exist:

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint
      run: npm run lint

    - name: Tests
      run: npm run test

    - name: Coverage
      run: npm run test:coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
        flags: unittests
        name: codecov-umbrella
```

**Step 3: Commit and verify**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test pipeline"
git push origin feature/add-tests
# Create PR on GitHub - should trigger workflow
```

### Acceptance Criteria
- [ ] `.github/workflows/test.yml` exists
- [ ] PR triggers test workflow automatically
- [ ] Test results show in PR status checks
- [ ] Coverage report uploaded (if Codecov configured)

### Est. Effort
1-2 hours | 1 person

**Blocker for:** Production CI/CD automation

---

## Task A5: Create Production Environment Config (0.5 hours)

### Objective
Document environment variables needed for production deployment

### Steps

**Step 1: Create .env.production.example**

```bash
# Create file
touch .env.production.example

# Add content:
```

`.env.production.example`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Authentication
VITE_AUTH_REDIRECT_URL=https://lexflow.yourcompany.com
VITE_SESSION_TIMEOUT_MINUTES=1440

# API
VITE_API_BASE_URL=https://api.lexflow.yourcompany.com
VITE_API_TIMEOUT_MS=30000

# Features
VITE_ENABLE_MFA=true
VITE_ENABLE_EXPORT=true
VITE_ENABLE_COMPLIANCE=true

# Analytics
VITE_ANALYTICS_ID=your_analytics_id
VITE_SENTRY_DSN=your_sentry_dsn

# Build
VITE_APP_VERSION=0.1.0
VITE_BUILD_DATE=2026-03-15
```

**Step 2: Create deployment guide**

Create `docs/DEPLOYMENT.md`:

```markdown
# Deployment Guide

## Environment Variables

Copy `.env.production.example` to `.env.production`:

```bash
cp .env.production.example .env.production
```

Fill in actual values:
- SUPABASE_URL: From Supabase project settings
- SUPABASE_ANON_KEY: From Supabase API keys
- AUTH_REDIRECT_URL: Your production domain
- Other values: As configured for production

## Deployment Steps

1. Build: `npm run build`
2. Test: `npm run test`
3. Deploy: Via your deployment platform (Vercel, Netlify, etc.)
4. Verify: Smoke test all critical paths

See PRODUCTION_READINESS_ANALYSIS.md for full deployment checklist.
```

**Step 3: Add to .gitignore**

```bash
echo ".env.production" >> .gitignore
echo ".env.local" >> .gitignore
```

### Acceptance Criteria
- [ ] `.env.production.example` exists with all required vars
- [ ] `DEPLOYMENT.md` documents deployment process
- [ ] All sensitive files in .gitignore
- [ ] Development can follow guide to setup production

### Est. Effort
0.5 hours | 1 person

**Blocker for:** Production deployment

---

## Phase A Execution Order

### Day 1 (4 hours)
1. **Morning (1 hour):** Task A1 + A2 (Add test script + coverage)
2. **Verification (0.5 hours):** `npm run test` works, coverage reports generate
3. **Afternoon (2.5 hours):** Start Task A3 (Fix failing tests)

### Day 2 (5 hours)
1. **All day:** Continue Task A3 (fix all 18 tests)
2. **End of day:** `npm run test` shows 100% pass rate

### Day 3 (3 hours)
1. **Morning (2 hours):** Task A4 (Add CI/CD pipeline)
2. **Afternoon (1 hour):** Task A5 (Production config)

### Phase A Total
- **8 hours actual work**
- **2-3 days calendar time** (depending on parallelization)
- **1 person (Dex/@dev)**

---

## Verification Checklist

After completing Phase A, verify:

```bash
# 1. Tests pass
npm run test
# ✓ Should show: Test Files  16 passed (16)
#                Tests      168 passed (168)

# 2. Coverage works
npm run test:coverage
# ✓ Should show: coverage/index.html generated
# ✓ Should show: Coverage percentages in terminal

# 3. Build passes
npm run build
# ✓ Should show: dist/ folder created

# 4. Linting passes
npm run lint
# ✓ Should show: No eslint errors

# 5. CI/CD configured
ls .github/workflows/test.yml
# ✓ Should exist

# 6. Production config documented
ls .env.production.example docs/DEPLOYMENT.md
# ✓ Both should exist
```

---

## Blockers & Escalation

If you get stuck:

1. **Test failures won't fix:** Escalate to @qa (Quinn) with:
   - Error message
   - Test file location
   - What you've tried

2. **CI/CD issues:** Escalate to @devops (Gage) with:
   - Workflow file attempted
   - Error output
   - GitHub Actions logs

3. **Coverage configuration issues:** Check:
   - Vitest docs: https://vitest.dev/guide/coverage
   - @vitest/coverage-v8 docs

---

## Success Criteria

Phase A is complete when:

✅ All 5 tasks finished
✅ All tests passing (100% pass rate)
✅ Coverage reporting working
✅ CI/CD pipeline active
✅ Production config documented
✅ Ready to start Phase B (EPIC-2 implementation)

---

**Owner:** @dev (Dex)
**Status:** Ready for execution
**Priority:** CRITICAL (blocking Phase B)
**Timeline:** 2-3 days (1 developer)

Next action: Start Task A1 today
