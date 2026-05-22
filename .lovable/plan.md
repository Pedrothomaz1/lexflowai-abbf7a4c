# Workflow Builder #7 — Kanban + Regras Condicionais + Edge de Avanço

Implementação completa do módulo **Workflow Builder** com configuração por contrato, Kanban drag-and-drop, regras condicionais e edge function que orquestra avanço, registro e notificações.

---

## 1. Schema — Migration SQL

Três tabelas novas multi-tenant (RLS via `current_user_org()`):

### `workflow_definitions`
Define um fluxo reutilizável (ex.: "Aprovação Comercial", "Compliance Jurídico").
- `nome`, `descricao`, `tipo_contrato` (filtro de aplicabilidade, nullable = todos)
- `is_default` (boolean) — workflow padrão da organização
- `ativo` (boolean)
- `organization_id`, `created_by`, timestamps

### `workflow_stages`
Etapas (colunas do Kanban) de uma definition.
- `definition_id` → FK
- `nome`, `descricao`, `ordem` (int)
- `cor` (hex para badge da coluna)
- `tipo` ('inicio' | 'intermediario' | 'aprovacao' | 'final')
- `responsavel_role` (app_role nullable) ou `responsavel_id` (uuid nullable)
- `sla_dias` (int nullable)
- `regras_condicionais` (jsonb) — array de regras com `{campo, operador, valor, proximo_stage_id}`. Campos suportados: `valor_total`, `tipo_contrato`, `area`. Operadores: `gt|gte|lt|lte|eq|in`.
- `organization_id`

### `workflow_runs`
Instância ativa: um contrato percorrendo um workflow.
- `contrato_id` (FK), `definition_id` (FK)
- `current_stage_id` (FK)
- `status` ('em_andamento' | 'concluido' | 'cancelado')
- `historico` (jsonb array) — cada entrada: `{stage_id, stage_nome, entrou_em, saiu_em, responsavel_id, decisao, comentario, regra_aplicada}`
- `iniciado_em`, `concluido_em`, `organization_id`, `created_by`

**Índices:** `(organization_id, contrato_id)`, `(organization_id, current_stage_id)`, `(definition_id, ordem)`.

**RLS:** padrão multi-tenant + admin write. Triggers: `update_updated_at_column`, `audit_trigger_func` em `workflow_runs`.

---

## 2. Edge Function — `workflow-advance`

`POST /workflow-advance`

**Body:**
```json
{ "run_id": "uuid", "decisao": "aprovado|rejeitado|ajuste", "comentario": "string", "force_stage_id": "uuid?" }
```

**Lógica:**
1. Autenticar (JWT), validar org match e que user é responsável do `current_stage` (role ou direto).
2. Buscar `run`, `current_stage`, contrato (valor, tipo, area).
3. Decidir próximo stage:
   - Se `force_stage_id` → usa direto.
   - Senão avalia `regras_condicionais` em ordem; primeira que casar define `proximo_stage_id`.
   - Fallback: próximo stage por `ordem` ascendente.
   - Se for último stage → `status = concluido`, `concluido_em = now()`.
4. Atualiza `current_stage_id`, fecha entrada anterior do histórico (`saiu_em`, `decisao`, `comentario`, `regra_aplicada`) e abre nova entrada.
5. Atualiza `contratos.status` quando stage `tipo = 'final'` (assinado) ou `'aprovacao'` aprovado.
6. Chama `notify_org_members` para nova etapa + responsável.
7. Retorna `{ ok, run, proximo_stage }`. Validações de negócio retornam HTTP 200 com `{ ok:false, error }` (padrão do projeto).

`verify_jwt = false` no `config.toml` + validação manual (padrão Lovable).

---

## 3. UI — Frontend

### Rotas
- `/workflows` — lista de definitions, criar/editar.
- `/workflows/:id` — Workflow Builder (stages drag-and-drop, regras condicionais por stage).
- `/contratos/:id/workflow` — Kanban do run desse contrato + histórico.

### Componentes

**`WorkflowDefinitionsList.tsx`** — tabela das definitions, badge default, toggle ativo, botão "Novo workflow".

**`WorkflowBuilder.tsx`** — editor da definition:
- Lista vertical de stages com `@dnd-kit/sortable` para reordenar.
- Cada stage: nome, cor, tipo, responsável (role/usuário), SLA.
- Botão "Adicionar regra condicional" abre `ConditionalRuleEditor` (campo, operador, valor, próximo stage).

**`ConditionalRuleEditor.tsx`** — form para construir regra (select campo → select operador → input valor → select próximo stage).

**`ContractKanban.tsx`** — em `/contratos/:id/workflow`:
- Colunas = stages da definition aplicada.
- Card único do contrato na coluna `current_stage_id`.
- Drag-and-drop entre colunas dispara modal "Avançar etapa" (decisão + comentário) → chama edge `workflow-advance` com `force_stage_id`.
- Sidebar com histórico cronológico (`historico` jsonb): timestamp, responsável, decisão, regra aplicada.
- Indicador SLA (vermelho se `entrou_em + sla_dias < now`).

**`WorkflowKanbanGlobal.tsx`** (opcional, em `/workflows/kanban`) — visão de todos os runs ativos da org como Kanban com vários cards.

### Lib
- `@dnd-kit/core` e `@dnd-kit/sortable` (instalar).
- Hook `useWorkflowRun(contratoId)` — busca run + definition + stages, realtime via Supabase channel em `workflow_runs`.
- Helper `evaluateRules(stage, contrato)` — espelho client-side da lógica do edge para preview na UI.

### Design
- Reaproveitar tokens HSL existentes (verde primary / mostarda accent).
- Colunas com header colorido (`stage.cor`), contagem de cards, badge do responsável.
- Cards: título do contrato, valor, fornecedor, tempo na etapa, avatar do responsável.
- Histórico em timeline vertical (lado direito), ícones por decisão.

---

## 4. Integração

- Quando um contrato é criado (`trg_novo_contrato_fn`), criar trigger adicional `trg_iniciar_workflow_fn` que:
  - Procura `workflow_definitions` com `is_default = true` (ou matching `tipo_contrato`).
  - Insere `workflow_runs` no primeiro stage por `ordem`.
- Atualizar `Navigation.tsx` / sidebar para incluir item **Workflows** (admin only).
- Atualizar memória do projeto com novo módulo.

---

## 5. Testes & QA

- Deno test no `workflow-advance` cobrindo: avanço linear, regra condicional matching, validação de responsável, conclusão de run.
- Smoke manual: criar definition com 3 stages + regra `valor_total > 100000 → stage Diretoria`, abrir contrato, arrastar card, validar histórico e notificação.

---

## Arquivos a criar/editar

**Backend**
- `supabase/migrations/<ts>_workflow_builder.sql`
- `supabase/functions/workflow-advance/index.ts`
- `supabase/functions/workflow-advance/index_test.ts`
- `supabase/config.toml` (bloco da função se necessário)

**Frontend**
- `src/pages/Workflows.tsx`
- `src/pages/WorkflowEditor.tsx`
- `src/pages/ContratoWorkflow.tsx`
- `src/components/workflow/WorkflowDefinitionsList.tsx`
- `src/components/workflow/WorkflowBuilder.tsx`
- `src/components/workflow/ConditionalRuleEditor.tsx`
- `src/components/workflow/ContractKanban.tsx`
- `src/components/workflow/WorkflowHistory.tsx`
- `src/hooks/useWorkflowRun.ts`
- `src/hooks/useWorkflowDefinitions.ts`
- `src/lib/workflow-rules.ts`
- `src/App.tsx` (rotas)
- `src/components/Navigation.tsx` ou equivalente (item menu)
- `package.json` (`@dnd-kit/core`, `@dnd-kit/sortable`)

---

## Confirmação antes de implementar

É bastante código (≈1.500 linhas). Posso seguir nessa ordem:
1. Migration + RLS + trigger de bootstrap do run
2. Edge `workflow-advance` + teste
3. Hooks + páginas + Kanban drag-and-drop
4. Builder + regras condicionais
5. Histórico + SLA + realtime

Aprovado para executar tudo de uma vez?
