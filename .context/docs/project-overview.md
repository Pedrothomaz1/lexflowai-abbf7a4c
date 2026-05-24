---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Project Overview

LexFlow AI é um **SaaS B2B de gestão preventiva de contratos, fornecedores, obrigações e franquias**, voltado a gestores executivos (não-jurídicos). O sistema é **multi-tenant estrito** com Row-Level Security baseado em `organization_id`.

Este é um projeto **TypeScript** full-stack. O frontend é uma SPA React hospedada via Vite, e o backend roda em Supabase (PostgreSQL + Auth + Storage + Edge Functions em Deno).

## Codebase Reference

> **Detailed Analysis**: For complete symbol counts, architecture layers, and dependency graphs, see [`codebase-map.json`](./codebase-map.json).

## Quick Facts

- **Root**: `C:\Users\Pedro\Meu Drive\Flow GenAI\3.0 Projetos\1.0 Lexflow\lexflowai-main`
- **Languages**: TypeScript, JavaScript
- **Framework**: React 18 + Vite 5
- **UI**: Tailwind CSS v3 + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions Deno)
- **AI**: Lovable AI Gateway (Gemini 2.5 / GPT-5)
- **Email**: Resend (`RESEND_API_KEY`)
- **Hosting**: Lovable Cloud → `lexflowai.com.br`
- **Package Manager**: Bun
- **Full analysis**: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- `index.html` — Ponto de entrada HTML da SPA
- `src/main.tsx` — Bootstrap React (render root)
- `src/App.tsx` — Componente raiz com rotas e providers
- `vite.config.ts` — Configuração de build e dev server
- `supabase/functions/` — Edge Functions (Deno runtime)

## Key Exports

- `src/integrations/supabase/client.ts` — Cliente Supabase singleton
- `src/hooks/` — Hooks customizados (`useRoles`, `usePermissions`, `useAuth`)
- `src/components/ui/` — Componentes shadcn/ui customizados
- `src/lib/utils.ts` — Utilitários compartilhados

## File Structure & Code Organization

- `src/` — Código-fonte principal (React + TypeScript)
  - `src/components/` — Componentes React (UI, layout, módulos)
  - `src/hooks/` — Custom hooks (auth, RBAC, data fetching)
  - `src/pages/` — Páginas/rotas da aplicação
  - `src/integrations/` — Integrações (Supabase client, types)
  - `src/lib/` — Utilitários e helpers
  - `src/types/` — Definições de tipos TypeScript
- `supabase/` — Backend Supabase
  - `supabase/functions/` — 25+ Edge Functions (Deno)
  - `supabase/migrations/` — Migrações SQL
- `docs/` — Documentação do projeto
  - `docs/stories/` — Stories de desenvolvimento
  - `docs/prd/` — Product Requirement Documents
- `public/` — Assets estáticos

## Technology Stack Summary

**Primary Language**: TypeScript

**Other Languages**: JavaScript, SQL (migrations), Deno/TypeScript (edge functions)

**Build Tools**: Vite 5

**Package Manager**: Bun

## Core Framework Stack

| Framework | Versão | Propósito |
|-----------|--------|-----------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool + dev server |
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | latest | Component library |
| Framer Motion | latest | Animações |
| Supabase | latest | BaaS (auth, DB, storage, functions) |

## UI & Interaction Libraries

- **shadcn/ui** — Component library baseada em Radix UI primitives
- **Tailwind CSS v3** — Styling utilitário com tokens HSL customizados
- **Framer Motion** — Animações e transições
- **Lucide React** — Ícones (ícone da marca: `Scale`)
- **Design System**: Cores HSL em `src/index.css`, tipografia Inter, grid 8pt, radius 20px
- **Tema**: Verde/mostarda como cores principais. Separação visual por módulo (mostarda para franquias, verde para contratos)

## Development Tools Overview

- **Vite** — Dev server com HMR + build de produção
- **ESLint** — Linting (`npm run lint`)
- **TypeScript** — Type checking (`npm run typecheck`)
- **Vitest** — Unit tests
- **Playwright** — E2E tests
- **Bun** — Package manager e runtime

## Getting Started Checklist

1. Instalar dependências: `bun install`
2. Configurar `.env` baseado no `.env.example` (Supabase URL, anon key, etc.)
3. Iniciar desenvolvimento: `npm run dev`
4. Rodar testes: `npm test`
5. Verificar lint: `npm run lint`
6. Verificar tipos: `npm run typecheck`
7. Revisar documentação técnica: `DOCUMENTACAO_TECNICA.md`
8. Revisar progresso atual: `PROGRESS.md`

## Next Steps

- Integração Stripe + webhook `super-admin-create-client-org`
- Migração de e-mails para domínio `lexflowai.com.br` no Resend
- NF-e automática (NFE.io / eNotas)
- Status page pública
- Documentação por edge function em `docs/api-docs/`

## Related Resources

- [development-workflow.md](./development-workflow.md)
- [testing-strategy.md](./testing-strategy.md)
- [tooling.md](./tooling.md)
- [codebase-map.json](./codebase-map.json)
