# Workflow #7 — Export, validação e auditoria

Três entregas sobre a tela `/contratos/:id/workflow` e o editor de regras.

## 1. Exportar histórico em PDF e Excel

Na tela `ContratoWorkflow`, adicionar dois botões no cabeçalho ("Exportar PDF" e "Exportar Excel") que geram o histórico do `workflow_run` corrente — etapas, decisão, regra aplicada, responsável, horários, SLA e comentário.

- Usa libs já instaladas: `jspdf` + `jspdf-autotable` e `exceljs`.
- Resolve nomes dos responsáveis via consulta em `profiles` por `id IN (executado_por…)`.
- Arquivos: `workflow-<numero_contrato>.pdf` e `.xlsx`.

## 2. Validação no editor de regras condicionais

Estender `ConditionalRulesEditor` com função `validateRulesForStage` que detecta:

- Valor vazio ou numérico inválido (quando campo = `valor_total`).
- `jump_to_ordem` não selecionado, igual à própria etapa ou fora do intervalo `[1..N]`.
- Regras duplicadas (mesmo `campo|op|valor`).
- **Loop entre estágios** via DFS no grafo de saltos: marca como erro se ao seguir os saltos voltar a uma etapa já visitada.

Erros aparecem inline (caixa vermelha). Bloqueia "Salvar workflow" em `WorkflowBuilder` quando alguma etapa tem erro (mostrando toast). O Editor recebe `allStagesRules` (mapa `ordem → regras`) para a detecção cruzada de ciclos.

## 3. Trilha de auditoria completa

- **DB (já aplicado):** coluna `workflow_run_stages.regra_aplicada` e gatilhos `audit_trigger_func` anexados a `workflow_runs` e `workflow_run_stages` → todas as ações vão para `audit_logs` automaticamente.
- **Edge `workflow-advance`:** salva `regra_aplicada` ao criar a próxima `run_stage`.
- **Painel de histórico** em `ContratoWorkflow`: mostrar para cada etapa o nome do responsável, decisão, badge "regra aplicada", `executado_em`, SLA. Botão "Ver auditoria" abre `Dialog` com as últimas entradas de `audit_logs` filtradas por `entidade IN ('workflow_runs','workflow_run_stages')` e `entidade_id IN (run.id, runStages[].id)` — colunas: ação, usuário, timestamp, payload resumido.

## Arquivos

```text
Edge / DB
- supabase/functions/workflow-advance/index.ts  (set regra_aplicada)

Frontend
- src/utils/workflowExport.ts  (novo — PDF + XLSX)
- src/components/workflow/ConditionalRulesEditor.tsx  (validação + loop detection)
- src/pages/WorkflowBuilder.tsx  (bloqueia salvar se houver erro de regra)
- src/pages/ContratoWorkflow.tsx  (botões export + responsáveis + dialog de auditoria)
```

Sem novas dependências. Migration de DB já aplicada.
