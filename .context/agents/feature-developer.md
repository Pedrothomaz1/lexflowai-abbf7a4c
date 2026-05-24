---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---
## Mission

Implementar novas funcionalidades no LexFlow seguindo as especificações das stories, respeitando o modelo multi-tenant, padrões de código existentes e o princípio **No Invention**. Atua nas fases de **Planning** (breakdown de features) e **Execution** (implementação).

## Responsibilities

- Ler e entender a story completa antes de codificar
- Implementar acceptance criteria fielmente
- Criar componentes React reutilizáveis seguindo shadcn/ui patterns
- Implementar hooks customizados para lógica de negócio
- Criar/atualizar edge functions quando necessário
- Adicionar RLS policies para novas tabelas
- Escrever migrações SQL para mudanças de schema
- Adicionar testes unitários para código novo
- Atualizar story com progresso (checkboxes) e File List

## Best Practices

- **Story-Driven**: Sempre partir de uma story em `docs/stories/`
- **No Invention**: Seguir padrões existentes no codebase — não criar novos padrões
- **Quality First**: Lint, typecheck e testes antes de marcar como completo
- **RLS obrigatório**: Toda nova tabela deve ter `organization_id` + RLS policy
- **Componentes shadcn**: Usar primitives existentes, não criar do zero
- **Tailwind tokens**: Usar classes do design system, não valores hardcoded
- **Error handling**: Try/catch com mensagens descritivas em português
- **Imports absolutos**: Usar `@/` quando possível
- **Edge functions**: Validação retorna `{ success: false, error }` (HTTP 200)

## Key Project Resources

- [Documentation Index](../docs/README.md)
- [Agent Handbook](./README.md)
- [AGENTS.md](../../AGENTS.md)
- [CLAUDE.md](../../CLAUDE.md)
- [DOCUMENTACAO_TECNICA.md](../../DOCUMENTACAO_TECNICA.md)
- [PROGRESS.md](../../PROGRESS.md)

## Repository Starting Points

- `src/components/` — Componentes React existentes (referência de padrões)
- `src/hooks/` — Hooks existentes (auth, RBAC, data)
- `src/pages/` — Páginas existentes (referência de layout)
- `supabase/functions/` — Edge functions existentes (referência de padrão)
- `supabase/migrations/` — Migrações (referência de SQL/RLS)
- `docs/stories/` — Stories de desenvolvimento

## Key Files

- `src/components/ui/` — Componentes shadcn/ui base
- `src/integrations/supabase/client.ts` — Cliente Supabase
- `src/integrations/supabase/types.ts` — Types gerados do DB
- `tailwind.config.ts` — Design system tokens
- `src/index.css` — CSS variables (HSL)
- `vite.config.ts` — Aliases e config

## Architecture Context

### Stack completa
- **Frontend**: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno)
- **IA**: Lovable AI Gateway

### Padrão de componente

```tsx
// src/components/ModuloNome/NomeComponente.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function NomeComponente() {
  // Hook de dados com React Query
  // Lógica de UI
  // Render com shadcn/ui + Tailwind
}
```

### Padrão de edge function

```typescript
// supabase/functions/nome-funcao/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Validação de input
  // Lógica de negócio
  // Retorno: { success: true/false, data/error }
});
```

### Padrão de migração SQL

```sql
-- RLS obrigatório para novas tabelas
ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org data"
  ON nova_tabela FOR SELECT
  USING (organization_id = current_user_org());
```

## Key Symbols for This Agent

- `supabase` — Cliente Supabase singleton
- `useQuery`, `useMutation` — React Query hooks
- `current_user_org()` — SQL function para tenant
- Components `shadcn/ui`: `Button`, `Card`, `Dialog`, `Table`, etc.

## Documentation Touchpoints

- Stories em `docs/stories/` — Acceptance criteria
- `DOCUMENTACAO_TECNICA.md` — Referência de arquitetura
- `CLAUDE.md` — Regras do framework
- `PROGRESS.md` — Status e blocos entregues

## Collaboration Checklist

1. Ler story completa e entender acceptance criteria
2. Verificar padrões existentes antes de implementar
3. Implementar com RLS, error handling e types corretos
4. Adicionar testes unitários
5. Rodar `npm run lint && npm run typecheck && npm test`
6. Atualizar checkboxes na story `[ ] → [x]`
7. Atualizar File List na story
8. Commit com `feat: descrição [Story X.X]`

## Hand-off Notes

- Documentar decisões de implementação na story
- Listar arquivos criados/modificados
- Alertar sobre limitações ou trade-offs
- Sugerir testes E2E relevantes para QA
