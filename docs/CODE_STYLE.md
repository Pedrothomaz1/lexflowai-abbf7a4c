# Code Style Guide

Padrões de codificação para Lexflow AI. Aplicar em todos os arquivos TypeScript/React.

---

## Naming Conventions

### Files and Directories

```typescript
// Components: PascalCase
src/components/LandingHeader.tsx
src/components/landing/HeroSection.tsx

// Hooks: camelCase with 'use' prefix
src/hooks/useContratos.ts
src/hooks/useFornecedores.ts

// Utilities/Lib: camelCase
src/lib/supabase-client.ts
src/utils/formatDate.ts

// Types: PascalCase with .ts extension
src/types/database.ts

// Tests: {ComponentName}.test.tsx or {hookName}.test.ts
src/__tests__/components/landing/HeroSection.test.tsx
src/__tests__/hooks/useContratos.test.ts
```

### Variables and Functions

```typescript
// Constants: UPPER_SNAKE_CASE
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// Functions: camelCase
function formatDate(date: Date): string { }
async function fetchContratos(orgId: string) { }

// Variables: camelCase
const userName = "Pedro";
let isLoading = false;

// React Components: PascalCase
function Dashboard() { }
const ErrorBoundary = () => { }

// Type/Interface names: PascalCase
interface ContratoRow { }
type Status = 'ativo' | 'vencido';
```

---

## Type Safety

### Always use TypeScript types

```typescript
// Good: Type-safe
function fetchData(orgId: string): Promise<Contract[]> {
  // ...
}

// Bad: Any is dangerous
function fetchData(orgId: any): any {
  // ...
}

// Good: Import types from database
import type { Database } from '@/types/database';
type ContratoRow = Database['public']['Tables']['contratos']['Row'];

// Good: Use discriminated unions for status
type Status = 'ativo' | 'vencido' | 'renovacao';
```

### Generic Types

```typescript
// Good: Explicit generics
const useQuery = <T>(key: string, fn: () => Promise<T>) => {
  // ...
};

// Good: Constrained generics
function map<T extends { id: string }>(items: T[]): T[] {
  return items;
}
```

---

## Error Handling

### Always handle errors

```typescript
// Good: Explicit error handling
try {
  const { data, error } = await supabaseClient
    .from('contratos')
    .select('*');
  
  if (error) {
    console.error('[useContratos] Query failed:', error);
    throw new Error(`Failed to fetch: ${error.message}`);
  }
  return data;
} catch (err) {
  console.error('[Function] Caught error:', err);
  // Handle or re-throw
}

// Good: Error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Dashboard />
</ErrorBoundary>
```

### Error Logging Pattern

```typescript
// Include context in error logs
console.error('[Component/Hook Name] What happened:', error);
console.error('[Component/Hook Name] Debug info:', { orgId, userId });

// Example:
console.error('[useContratos] Query failed:', error);
```

---

## React Patterns

### Component Structure

```typescript
/**
 * Brief description of component
 * 
 * @example
 * ```tsx
 * <HeroSection />
 * ```
 */
export function HeroSection() {
  const [state, setState] = useState(false);
  
  const handleClick = () => {
    setState(!state);
  };
  
  return (
    <section>
      <h1>Title</h1>
      <button onClick={handleClick}>Click</button>
    </section>
  );
}
```

### Hooks Pattern

```typescript
/**
 * Fetch contracts with caching
 * 
 * @param orgId - Organization ID
 * @returns useQuery result with data, loading, error
 * @example
 * ```tsx
 * const { data, isLoading, error } = useContratos(orgId);
 * ```
 */
export function useContratos(orgId: string) {
  return useQuery({
    queryKey: ['contratos', orgId],
    queryFn: async () => {
      // Fetch logic
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!orgId,
  });
}
```

### Props Pattern

```typescript
interface DashboardProps {
  orgId: string;
  isAdmin?: boolean;
  onNavigate?: (path: string) => void;
}

function Dashboard({ orgId, isAdmin = false, onNavigate }: DashboardProps) {
  // ...
}
```

---

## React Query Pattern

All data fetching hooks follow this pattern:

```typescript
/**
 * Fetch {resource} for organization
 * 
 * - 5-minute stale time (cache)
 * - Retry 2x on failure
 * - Disabled when id is empty
 */
export const use{Resource} = (orgId: string) => {
  return useQuery({
    queryKey: ['{resource}', orgId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('{resource}')
        .select('*')
        .eq('organization_id', orgId);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    enabled: !!orgId,
  });
};
```

---

## JSDoc Documentation

### Function JSDoc

```typescript
/**
 * Fetches contracts and applies status filters
 *
 * @param orgId - Organization ID (required)
 * @param status - Filter by status (optional)
 * @returns Promise<Contract[]> - Filtered contracts
 * @throws Error if query fails
 * @example
 * ```typescript
 * const contratos = await getContratos('org-123', 'ativo');
 * ```
 */
export async function getContratos(
  orgId: string,
  status?: 'ativo' | 'vencido'
): Promise<Contract[]> {
  // ...
}
```

### Component JSDoc

```typescript
/**
 * Error Boundary Component
 *
 * Catches React errors and displays fallback UI.
 * Logs errors for monitoring.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component {
  // ...
}
```

### Hook JSDoc

```typescript
/**
 * React Query hook for fetching suppliers
 *
 * Features:
 * - Type-safe with Supabase types
 * - 5-minute stale time
 * - Automatic retry (2x)
 *
 * @param orgId - Organization ID
 * @returns useQuery result with suppliers
 * @example
 * ```tsx
 * const { data: suppliers } = useFornecedores(orgId);
 * ```
 */
export function useFornecedores(orgId: string) {
  // ...
}
```

---

## Imports and Exports

### Import Order

```typescript
// 1. React and external libraries
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules
import { supabaseClient } from '@/lib/supabase-client';
import { useContratos } from '@/hooks';

// 3. Types
import type { Database } from '@/types/database';

// 4. Styles (if applicable)
import styles from './Component.module.css';
```

### Named vs Default Exports

```typescript
// Prefer named exports
export function HeroSection() { }
export const useContratos = () => { }

// Default only for:
// - Lazy-loaded components
// - Page components (if using file-based routing)
const ExportModal = lazy(() => import('@/components/ExportModal'));
export default ExportModal;
```

---

## Performance & Best Practices

### Memoization

```typescript
// Use memo for expensive components
export const HeroSection = React.memo(function HeroSection() {
  return <section>Content</section>;
});

// Use useMemo for expensive calculations
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### Lazy Loading

```typescript
// Lazy load heavy components
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Use with Suspense
<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>

// Dynamic imports for on-demand libraries
const handleExport = async () => {
  const jsPDF = (await import('jspdf')).jsPDF;
  // Use jsPDF
};
```

---

## Testing

### Test File Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Component } from "@/components/Component";

describe("Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<Component />);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("handles user interactions", () => {
    render(<Component />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});
```

---

## Commit Messages

Follow Conventional Commits:

```
feat: add P1-P4 code quality improvements
fix: resolve useContratos query caching
refactor: optimize ErrorBoundary performance
docs: update CODE_STYLE.md
test: add LandingHeader unit tests
chore: update dependencies
```

---

## Tools & Validation

### ESLint

```bash
npm run lint
```

### TypeScript Check

```bash
npm run typecheck
```

### Testing

```bash
npm test
npm test -- --coverage
```

### Build

```bash
npm run dev      # Development
npm run build    # Production
```

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Conventional Commits](https://www.conventionalcommits.org/)
