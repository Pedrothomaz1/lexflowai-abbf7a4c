---
type: skill
name: Feature Breakdown
description: Break down features into implementable tasks
skillSlug: feature-breakdown
phases: [P]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# Feature Breakdown

## When to Use

Ativar ao receber uma feature request ou spec para quebrar em tarefas implementáveis no LexFlow.

## Instructions

1. **Entender a feature completa**:
   - Qual problema resolve?
   - Quem é o usuário (admin, analista, super admin, externo)?
   - Quais módulos existentes são impactados?

2. **Identificar camadas**:
   | Camada | Artefatos |
   |--------|-----------|
   | **Database** | Migrações SQL, tabelas, RLS policies, triggers, RPCs |
   | **Edge Functions** | Funções Deno em `supabase/functions/` |
   | **Hooks** | Custom hooks React em `src/hooks/` |
   | **Components** | Componentes React em `src/components/` |
   | **Pages** | Páginas/rotas em `src/pages/` |
   | **Tests** | Testes unitários + E2E |
   | **Docs** | Story, DOCUMENTACAO_TECNICA.md |

3. **Criar story** com formato:
   ```markdown
   # Story X.X — Título da Feature

   ## Objetivo
   [Descrição clara]

   ## Acceptance Criteria
   - [ ] Critério 1
   - [ ] Critério 2

   ## Tasks
   - [ ] DB: Criar migração para tabela X
   - [ ] DB: Adicionar RLS policies
   - [ ] Edge: Criar função Y
   - [ ] Hook: Criar useX
   - [ ] UI: Criar componente Z
   - [ ] Test: Adicionar testes unitários
   - [ ] Test: Adicionar teste E2E
   - [ ] Docs: Atualizar DOCUMENTACAO_TECNICA.md

   ## File List
   (atualizar conforme implementa)
   ```

4. **Priorizar tasks**:
   - Database primeiro (schema, RLS)
   - Edge functions
   - Hooks
   - Componentes/Páginas
   - Testes
   - Documentação

5. **Estimar complexidade**:
   - S (Small): 1-2 arquivos, mudança simples
   - M (Medium): 3-5 arquivos, lógica moderada
   - L (Large): 6+ arquivos, múltiplas camadas
   - XL: Feature cross-cutting, requer refactoring

## Examples

### Feature: Portal de Fornecedores
```
Tasks:
1. [S] DB: Tabela `supplier_portal_links` + RLS
2. [M] Edge: `criar-link-portal-fornecedor` (gerar token, expiração)
3. [S] Hook: `useSupplierPortal`
4. [M] UI: `SupplierPortalPage.tsx` (view externa)
5. [M] UI: `SupplierPortalManager.tsx` (admin gerencia links)
6. [S] Test: Testes unitários do hook
7. [M] Test: E2E do fluxo completo
8. [S] Docs: Atualizar DOCUMENTACAO_TECNICA.md seção 15
```
