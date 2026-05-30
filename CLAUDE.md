# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LexFlowAI is a multi-tenant B2B SaaS for **contract management** (contratos, fornecedores, franquias) with risk analysis, LGPD compliance, approval workflows, e-signatures, requisitions, and a super-admin console. It is a **Vite + React 18 + TypeScript SPA** backed by **Supabase** (Postgres + Auth + Deno Edge Functions). It was scaffolded by Lovable and round-trips edits there. The UI and most identifiers are **Portuguese (pt-BR)** — match that when naming routes, tables, and user-facing strings.

## Commands

```bash
npm run dev            # Vite dev server (http://localhost:8080)
npm run build          # production build (esbuild drops console/debugger)
npm run lint           # ESLint (flat config: eslint.config.js)
npm run test           # Vitest run (jsdom, src/**/*.{test,spec}.{ts,tsx})
npm run test:watch     # Vitest watch
npm run test:coverage  # Vitest + v8 coverage (70% gate — CI blocks below)
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "test name"         # tests matching a name
npx playwright test                   # E2E (auto-starts its own dev server)
npx playwright test e2e/tests/x.spec.ts   # single E2E spec
```

- **No `typecheck` script exists** (despite `AGENTS.md`/`.claude/CLAUDE.md` claiming one). Use `npx tsc --noEmit`. The tsconfig is intentionally loose: `strictNullChecks`, `noImplicitAny`, and unused-var checks are all **off**.
- Three test suites live in different places and run differently: Vitest unit/component specs anywhere under `src/` matching `*.{test,spec}.tsx?`, an older `src/__tests__/` tree, and Playwright `e2e/`.

## Environment

Vite `.env` with `VITE_`-prefixed vars (see `.env.example`); the Supabase client reads them at startup:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (the anon/publishable key)

Only the **anon/publishable** key belongs in the frontend. Service-role keys live only in Edge Functions / deployment secrets. See `SECURITY.md`.

## Architecture

### Provider stack (`src/App.tsx`)
Outermost-in: `QueryClientProvider` → `TooltipProvider` → `AuthProvider` → `OrganizationProvider` → `NotificationProvider` → `ModuloProvider` → `BrowserRouter`. **Order matters**: `OrganizationContext` depends on `AuthContext`; everything tenant-scoped depends on `OrganizationContext`. The QueryClient is tuned (`staleTime` 60s, `retry` 1, no refetch-on-focus). An `AppErrorBoundary` auto-hard-reloads on chunk-load errors (stale deploy recovery).

### Routing & access control
- `react-router-dom`, all routes declared centrally in `src/App.tsx`. Pages are `lazy()`-loaded except `Index`/`Auth`.
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) is a heavy gate that enforces, in order: auth → **2FA/MFA** (TOTP; can be required per-role via `mfa_requirements`, fails *closed* on error) → org status → optional `requiredPermission` (RPC `has_permission`) → onboarding completion. Props: `requireOrg` (default `true`; pass `false` for routes reachable before an active org — `/super-admin`, `/settings/2fa`, the waiting/pending/suspended status pages) and `requiredPermission`. Org redirects derive from `orgStatus`/`hasOrganization` in `OrganizationContext`. Super-admin authorization is checked at the page level (`useSuperAdmin` → RPC `is_super_admin`), not via a route prop.
- Authenticated app pages render inside `DashboardLayout`. Path alias `@/*` → `src/*` (set in `vite.config.ts` and `vitest.config.ts`).

### Multi-tenancy is the core invariant
The current org comes from **`useOrganization()` in `src/contexts/OrganizationContext.tsx`** (returns `organization`, `membership`, `isOwner`, `isOrgAdmin`, `orgStatus`, `hasOrganization`). It loads the user's first active `organization_members` row — there is no in-app org switcher or `localStorage` org persistence. `hasOrganization` is true only when `orgStatus === 'ativa'`.

Every tenant-scoped query **must** filter by `organization.id`:
```ts
const { organization } = useOrganization();
// reads:  .eq('organization_id', organization.id)
// writes: insert({ ...fields, organization_id: organization.id })
```
Supabase RLS enforces isolation server-side, but the client filter is still required for correctness and caching. Roles are stored in `membership.role_in_org` (`owner` / `admin` / member).

> Note: there is also a standalone `src/hooks/useOrganization.ts` that **duplicates** part of the context and exists only for super-admin org listing. For current-org state always use the context hook, not the standalone one.

### Data access (important — no single repository layer)
Data fetching is **not** funneled through a repository or hook layer. **Nearly every page imports the `supabase` client directly** and queries with `useState`/`useEffect` (see `src/pages/Contratos.tsx`). Only a few domains have dedicated react-query hooks (`useAprovacoes`, `useNegociacoes`, `useDashboardKPIs`, `useSavedViews`, `useRoles`, `useDashboardRealtime`). When adding a feature, follow the surrounding code: extend an existing react-query hook if one exists for that domain, otherwise the direct-`supabase`-in-component pattern is the established norm. Always scope by `organization.id`, surface errors with a toast (`useToast`), and route Supabase errors through `handleDbError` (`src/utils/dbErrorHandler.ts`).

### Supabase integration
- Client singleton: `src/integrations/supabase/client.ts` (custom 10s fetch timeout, realtime heartbeat config). The generated `Database` type is currently **not** wired into the client (import is commented out), so queries are loosely typed.
- `src/integrations/supabase/types.ts` is **generated** (~190KB) — never hand-edit; regenerate after migrations.
- Schema + RLS policies live in `supabase/migrations/` (large numbered SQL history).

### Backend: Edge Functions (`supabase/functions/`, Deno)
Privileged / server-only logic. Naming is Portuguese: contract AI (`analisar-contrato`, `analisar-contrato-ia`, `ia-extrair-campos`, `ia-redline-sugerir`, `ia-resumo-executivo`, `ia-sugerir-clausulas`), CNPJ lookup (`consultar-cnpj`), org/onboarding (`create-organization-onboarding`, `enviar-convite-organizacao`), notifications (`enviar-notificacao-email`/`-whatsapp`/`-financeiro`), e-sign (`enviar-zapsign`), LGPD (`gdpr-handler`, `registrar-aceite-lgpd`), and several `cron-*` jobs. **JWT verification is per-function** in `supabase/config.toml` (`verify_jwt = true/false`) — check it before assuming a function is authenticated.

### UI conventions
- shadcn/ui (Radix) primitives in `src/components/ui/` — don't edit these directly; build feature components in the domain folders under `src/components/` (e.g. `Fornecedores/`, `compliance/`, `workflow/`, `SuperAdmin/`).
- Styling: Tailwind (`tailwind.config.ts`) + `cn()` from `src/lib/utils.ts`.
- Toasts: two coexist — Radix `useToast` (`src/hooks/use-toast.ts`) and `sonner`; both `<Toaster/>`s are mounted in `App.tsx`. Forms: `react-hook-form` + `zod`. Icons: `lucide-react`. Charts: `recharts`. Kanban DnD: `@dnd-kit`. PDF/Excel export: `jspdf` / `exceljs` (helpers in `src/utils/`).
- **Logging:** use `logger` from `@/utils/logger` (`src/utils/logger.ts`). Raw `console.*` is stripped from production builds by esbuild, so it's unreliable for diagnostics — prefer the logger.
- Shared domain constants: `src/lib/lexflow-constants.ts` and `src/constants/`.

## Gotchas

- **Two checked-in agent-framework configs do not describe this app:** `AGENTS.md` (Codex / "Synkra AIOX") and `.claude/CLAUDE.md` describe a separate CLI/agent meta-framework (`bin/`, `packages/`, `npm run typecheck`, agent personas). None of that exists in this repo — treat them as unrelated external tooling and trust *this* file for the codebase.
- Dev server runs on port **8080**, but Playwright's `baseURL` is **5173** (it starts its own server) — don't assume a single shared port.
- Lovable may commit changes back to this repo; structure follows Lovable conventions.
