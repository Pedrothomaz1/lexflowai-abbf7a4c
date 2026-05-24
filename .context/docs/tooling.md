---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Tooling & Productivity Guide

- **Vite 5** — Build tool e dev server
- **Bun** — Package manager
- **ESLint** — Linting
- **TypeScript 5** — Type safety
- **Vitest** — Unit testing
- **Playwright** — E2E testing
- **PostCSS** — CSS processing
- **Tailwind CSS v3** — Utility CSS

## Required Tooling

| Ferramenta | Versão | Propósito |
|------------|--------|-----------|
| Node.js | 18+ | Runtime |
| Bun | latest | Package manager, scripts |
| Git | latest | Version control |
| GitHub CLI | latest | PR, auth, API |
| Vite | 5.x | Build + dev server |
| TypeScript | 5.x | Type checking |

## Recommended Automation

### Pre-commit

```bash
# Validação antes de commitar
npm run lint && npm run typecheck && npm test
```

### Watch mode durante desenvolvimento

```bash
# Testes em watch
npm test -- --watch

# Dev server (já tem HMR)
npm run dev
```

### Scripts úteis do package.json

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `vite` | Dev server com HMR |
| `build` | `tsc && vite build` | Build de produção |
| `lint` | `eslint src/` | Linting |
| `test` | `vitest` | Testes unitários |
| `typecheck` | `tsc --noEmit` | Verificação de tipos |

### Supabase CLI (opcional)

```bash
# Gerar types do banco
supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts

# Listar edge functions
supabase functions list

# Deploy edge function
supabase functions deploy <function-name>
```

## IDE / Editor Setup

### VS Code (recomendado)

**Extensões essenciais:**
- ESLint — Linting inline
- TypeScript Importer — Auto-imports
- Tailwind CSS IntelliSense — Autocomplete de classes
- Prettier — Formatação
- Vite — Integração com dev server
- Supabase — Snippets e helpers

**Settings recomendadas** (`settings.json`):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Design System Reference

- **Cores**: HSL tokens em `src/index.css` e `tailwind.config.ts`
- **Tipografia**: Inter (Google Fonts)
- **Grid**: 8pt spacing system
- **Border radius**: 20px padrão
- **Cores da marca**: Verde (contratos/serviços) + Mostarda (franquias)
- **Ícone da marca**: `Scale` (lucide-react)

## Productivity Tips

### Atalhos de navegação

- Buscar componentes: `src/components/`
- Buscar hooks: `src/hooks/`
- Buscar páginas: `src/pages/`
- Buscar types Supabase: `src/integrations/supabase/types.ts`
- Buscar edge functions: `supabase/functions/`

### Debug mode AIOX

```bash
export AIOX_DEBUG=true
tail -f .aiox/logs/agent.log
```

### Supabase Dashboard

- Acessível via Lovable Cloud panel
- Útil para: inspecionar RLS policies, ver logs de edge functions, debug de auth

## Related Resources

- [development-workflow.md](./development-workflow.md)
