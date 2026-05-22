
# Fechar o ciclo do contrato: devolução, comentários, versionamento e revisões

Você descreveu um fluxo end-to-end onde o **upload → extração → rascunho → workflow com devolução → aprovação → financeiro** já está quase todo no ar, **menos** três peças que faltam costurar bem:

1. **Devolução de etapa** ("voltar para o solicitante / etapa anterior")
2. **Comentários por etapa do workflow** (anotações dos envolvidos)
3. **Versionamento automático + processo de revisões**

Tudo o que segue **reaproveita** infra que já existe (`contract_versions`, `contract_comments`, `contract_redlines`, `workflow_run_stages`). Não há tabelas novas a criar — só costura.

---

## Estado atual (mapeado)

| Peça | Status | Observação |
|---|---|---|
| Wizard de upload + extração IA | ✅ pronto | `NovoContratoWizard` |
| Gates 1 e 2 + intake liberado | ✅ pronto | `check_gate1/2_completo` |
| Workflow Kanban com regras condicionais | ✅ pronto | `workflow-advance` |
| Financeiro com envio manual | ✅ pronto | `BlocoFinanceiroPanel` |
| `contract_versions` (snapshot + alterações + motivo) | ✅ tabela existe | criação é **manual** via `useVersioning` |
| `contract_comments` (threading por seção, status aberto/resolvido) | ✅ tabela existe | sem vínculo com etapa do workflow |
| `contract_redlines` (revisões de texto draft → accepted) | ✅ tabela existe | editor pronto |
| **Devolução de etapa no workflow** | ❌ falta | hoje `rejeitado` **encerra o run** |
| **Comentário amarrado à etapa** | ⚠️ parcial | `workflow_run_stages.comentario` é só 1 string da decisão |
| **Snapshot automático** ao alterar contrato relevante | ❌ falta | versão só nasce se chamarem o hook |

---

## O que vou construir

### 1. Devolução de etapa no workflow (`devolvido`)

Adicionar uma quarta decisão ao `workflow-advance`: **`devolvido`** (além de `aprovado`/`rejeitado`/`pulado`).

Comportamento:
- Marca etapa atual como `devolvido` com `motivo` obrigatório.
- **Volta o run para a etapa anterior** (ou para uma `target_stage_ordem` informada — útil para devolver direto ao solicitante).
- Reabre a etapa de destino (`status='pendente'`, novo `due_at`).
- Coloca o contrato de volta em `intake_status='em_cadastro'` quando devolução chega na etapa de origem (rascunho).
- Notifica o responsável da etapa de destino + criador do contrato.
- Registra evento `devolucao` em `contract_comments` (tipo) para virar item no histórico.

**Sem novo enum no banco** — `workflow_run_stages.status` e `decisao` são `text` livres; só validamos no edge function.

### 2. Comentários e anotações por etapa

A tabela `contract_comments` já tem `secao` e `parent_id`. Vou:
- Adicionar coluna `workflow_run_stage_id uuid NULL` (FK) — permite filtrar comentários por etapa.
- Adicionar `tipo` aceito: `comentario | anotacao | devolucao | decisao` (texto livre, só convenção).
- Criar componente `WorkflowStageDiscussion` que renderiza thread de comentários da etapa atual com botão "Adicionar anotação" e "Devolver etapa" (abre modal pedindo motivo + etapa-alvo).
- Embutir esse painel no Kanban (`ContratoWorkflow.tsx`) e no `ContratoDetalhes` (aba Workflow).

### 3. Versionamento automático

Criar trigger `trg_contrato_snapshot` em `public.contratos` que **antes de UPDATE** salva snapshot em `contract_versions` quando muda algum campo "relevante" (lista enxuta: titulo, valor_total, data_inicio, data_fim, fornecedor_id, descricao, condicoes_pagamento, intake_status, status, dados_bancarios).

- Versão = `MAX(versao)+1` por `contrato_id`.
- `alteracoes` = diff dos campos relevantes (anterior → novo).
- `motivo` = `current_setting('app.versao_motivo', true)` (opcional, setado no client antes do UPDATE).
- `created_by` = `auth.uid()`.
- Ignora se UPDATE veio do service_role (evita ruído de jobs).

Resultado: histórico nasce sozinho a cada alteração, sem depender do dev lembrar de chamar `useVersioning`.

### 4. Painel "Revisões e Versões" unificado

Hoje temos `ContractVersionHistory`, `ContractRedlineEditor` e `ContractComments` separados. Vou criar uma **aba única "Revisões"** em `ContratoDetalhes` que junta:
- **Timeline**: versões (auto e manuais) + redlines + devoluções de workflow em ordem cronológica.
- **Diff**: clicar numa versão mostra side-by-side com a anterior (campos alterados destacados).
- **Restaurar**: botão (só admin) que faz UPDATE com snapshot da versão escolhida — gera nova versão automaticamente via trigger.
- **Status de redline**: kanban mini (draft → pending → accepted/rejected) com ação inline.

---

## Detalhes técnicos

**Migrações (1 só):**
```text
ALTER TABLE contract_comments ADD COLUMN workflow_run_stage_id uuid NULL
  REFERENCES workflow_run_stages(id) ON DELETE SET NULL;
CREATE INDEX idx_contract_comments_stage ON contract_comments(workflow_run_stage_id);

CREATE OR REPLACE FUNCTION trg_contrato_snapshot() ... ; -- BEFORE UPDATE
CREATE TRIGGER trg_contrato_snapshot BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION trg_contrato_snapshot();
```

**Edge function `workflow-advance`:**
- Aceita `decisao='devolvido'` + `target_stage_ordem` (opcional, default = ordem atual − 1) + `motivo` (obrigatório, ≥10 chars).
- Reabre etapa-alvo; se chegar em ordem 1 e tipo = `solicitante`, seta `contratos.intake_status='em_cadastro'`.

**Frontend:**
- `ContratoWorkflow.tsx`: adicionar botão "Devolver" no card da etapa atual + modal.
- `WorkflowStageDiscussion.tsx` (novo): thread de comentários da etapa.
- `ContractRevisionsTab.tsx` (novo): timeline + diff + restaurar.
- `ContratoDetalhes.tsx`: nova aba "Revisões" substituindo as 3 separadas (mantém os componentes internos).

**RLS:** zero mudança — todas as tabelas já têm policies por `organization_id`.

---

## Fora de escopo (deixar para depois)

- Editor colaborativo em tempo real do texto do contrato (Yjs/CRDT).
- Comparação visual de PDFs (diff de PDFs originais).
- Aprovação paralela em uma mesma etapa (workflow atual é sequencial).
- E-assinatura.

---

## Sequência sugerida

1. Migração (FK na `contract_comments` + trigger de snapshot).
2. Edge function `workflow-advance` com decisão `devolvido`.
3. Frontend: botão e modal de devolução no Kanban + thread por etapa.
4. Aba "Revisões" unificada com timeline + diff + restaurar.
5. Smoke test manual end-to-end.

Posso entregar tudo em sequência ou faseado (1+2 primeiro, depois 3, depois 4). Sua escolha quando aprovar.
