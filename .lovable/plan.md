## Escopo (rodada de 2 módulos, ordem #11 → #13)

Implementação fiel à **master spec v2** (arquivo carregado), aproveitando o que já existe (`approval_workflows`, `contract_approvals`, `contract_obligations`, `audit_logs`, `notifications`) e adicionando só o que falta para o padrão enterprise descrito.

Invariantes do bloco de continuidade respeitadas: `organization_id` em toda tabela, RLS em todas, aprovação obrigatória antes da assinatura, `.select().maybeSingle()` em UPDATEs, segredos só em edge functions, atualização do `PROGRESS.md` ao final.

---

## Módulo #11 — Aprovação e checklist pré-assinatura

### Gaps vs. spec
- Sem fila dedicada do aprovador (hoje a aprovação vive só dentro de `ContratoDetalhes`).
- `contract_approvals` é flat — não suporta **série / paralelo / passos** (a spec pede `approval_steps` + `approval_decisions` + `workflow_tasks`).
- Não há **checklist pré-assinatura** nem **edge function de validação**.
- Sem SLA banner na fila, sem motivo obrigatório de rejeição, sem histórico consolidado de decisões.

### Migração (schema)

```text
approval_steps
  id, organization_id, contrato_id, workflow_id, ordem, modo ('serie'|'paralelo'),
  minimo_aprovacoes int, status ('pendente'|'aprovado'|'rejeitado'|'cancelado'),
  due_at timestamptz, created_at, updated_at

approval_step_approvers
  id, organization_id, step_id, aprovador_id, status, decided_at

approval_decisions
  id, organization_id, step_id, aprovador_id,
  decisao ('aprovado'|'rejeitado'|'ajuste'), motivo text, created_at

contract_checklist
  id, organization_id, contrato_id, criterio text, satisfeito boolean,
  validado_por uuid, validado_em timestamptz, observacao text
  UNIQUE (contrato_id, criterio)

workflow_tasks
  id, organization_id, contrato_id, step_id, titulo, status, due_at,
  assignee_id, created_at
```

- RLS multi-tenant padrão (`organization_id = current_user_org()`); UPDATE restrito ao `aprovador_id` ou `administrador`.
- Mantém `contract_approvals` antigo (compatibilidade do dashboard) — novo fluxo grava também ali para não quebrar KPIs.
- Auditoria automática via `audit_trigger_func`.

### Edge Function

- `validar-checklist-pre-assinatura` (verify_jwt=true) — input `{ contrato_id }`.
- Verifica: documento final, campos obrigatórios, aprovações concluídas, anexos obrigatórios, contraparte (fornecedor com CNPJ verificado).
- Sempre **HTTP 200** com `{ ok: boolean, pendencias: [...] }`.

### Frontend novo

```text
src/pages/MinhasAprovacoes.tsx                  rota /aprovacoes
src/components/Aprovacoes/
  AprovacaoQueue.tsx          tabela com SLA + badge serie/paralelo
  AprovacaoCard.tsx           detalhe com passos
  AprovacaoDecisionDialog.tsx Aprovar | Rejeitar (motivo obrigatório) | Solicitar ajuste
  ChecklistPanel.tsx          5 itens da spec, status visual
  SlaAlertBanner.tsx          em risco / vencido
  HistoricoDecisoes.tsx       lê approval_decisions
src/hooks/useAprovacoes.ts    React Query + realtime nos canais
                              approval_steps, approval_decisions, contract_approvals
```

- Sidebar: novo item **Aprovações** com badge contador.
- `ContratoDetalhes`: CTA "Enviar para assinatura" bloqueado enquanto edge function retornar pendências.
- Telemetria: `trackEvent('aprovacao_decidida', { decisao, contrato_id, sla_h })`.

---

## Módulo #13 — Obrigações, renovação, reajuste e alertas

### Gaps vs. spec
- `Obrigacoes.tsx` lista bem mas não exige **evidência** na conclusão.
- Tipos não cobrem os 6 da spec (faltam **aviso_previo**, **compliance**, **reajuste** dedicado).
- Sem **renovação** nem **reajuste** estruturados.
- Calendário existe (`Calendario.tsx`) mas não cruzado com obrigações.
- Jobs de alerta hoje são plpgsql avulsos sem `pg_cron` agendado — a spec exige cron + idempotência diária.

### Migração (schema)

```text
contract_obligations  (ALTER)
  + evidencia_url text
  + concluido_por uuid
  + observacao_conclusao text
  + responsavel_juridico_id uuid
  Tipos: pagamento | entrega | renovacao | reajuste | aviso_previo | compliance

contract_reajustes  (nova)
  id, organization_id, contrato_id, indice text, percentual numeric,
  valor_anterior numeric, valor_novo numeric, vigencia_inicio date,
  observacao text, created_by, created_at

contract_renovacoes  (nova)
  id, organization_id, contrato_id_origem, contrato_id_novo uuid null,
  status ('iniciada'|'em_negociacao'|'concluida'|'cancelada'),
  requisicao_id uuid null, created_by, created_at
```

- Bucket Storage **`obligation-evidences`** (privado) com path `{organization_id}/{obligation_id}/{filename}` e RLS por prefixo.
- RLS padrão multi-tenant nas novas tabelas.

### pg_cron jobs (extensão pg_cron + pg_net)

```text
alertas_obrigacoes    08:00 diário  — obrigações vencendo em 7d ou vencidas
alertas_renovacao     08:00 diário  — contratos com data_fim em 60d (normal) e 30d (crítico)
sla_aprovacoes        a cada 1h     — approval_steps pendentes com due_at < now()+4h
```

Idempotência obrigatória em todos:
```sql
NOT EXISTS (
  SELECT 1 FROM notifications
  WHERE organization_id = ? AND tipo = ? AND referencia_id = ?
    AND DATE(created_at) = CURRENT_DATE
)
```

Reaproveita `notify_org_members` existente. Cron agendado via `supabase--insert` (não migration), pois carrega URL/anon-key.

### Edge Functions

- `iniciar-renovacao` — cria `contract_renovacoes` + `contract_requests` vinculada ao contrato origem.
- `registrar-reajuste` — insere em `contract_reajustes`, atualiza `contratos.valor_total`, registra em `audit_logs`.

### Frontend

```text
src/pages/Obrigacoes.tsx                refator (preserva DataTable atual)
src/components/Obrigacoes/
  ConcluirObrigacaoDialog.tsx           upload obrigatório p/ entrega/compliance
  EvidenciaUploader.tsx                 storage util + signed URL
  IniciarRenovacaoDialog.tsx
  RegistrarReajusteDialog.tsx
  ObrigacoesCalendar.tsx                view calendário (react-day-picker)
  ObrigacaoTimeline.tsx                 audit_logs daquele record
src/hooks/useObrigacoes.ts              React Query + realtime
```

- `lexflow-constants.ts`: adiciona `aviso_previo`, `compliance`, `reajuste`.
- Badges: `crítico` (≤30d) e `aviso` (≤60d) para renovações.

---

## Princípios transversais aos 2 módulos

- Toda mutação: `.select().maybeSingle()` + `handleDbError`.
- Toda nova tabela: RLS + `organization_id` + `created_by` + auditoria.
- Edge functions: HTTP 200 mesmo em validação reprovada.
- Realtime restrito ao `organization_id`.
- Reaproveita: `SlaBadge`, `Can`, `RoleGate`, `EmptyState`, `toast`, `handleDbError`, `lexflow-constants`.
- Não edita: `client.ts`, `types.ts`, `config.toml` (exceto blocos de função se necessário).
- `PROGRESS.md` atualizado ao final, conforme bloco de continuidade da spec.

---

## Arquivos adicionados / editados

```text
supabase/migrations/
  <ts>_aprovacao_steps_checklist.sql
  <ts>_obrigacoes_renovacao_reajuste.sql
  <ts>_storage_obligation_evidences.sql
supabase/functions/
  validar-checklist-pre-assinatura/index.ts
  iniciar-renovacao/index.ts
  registrar-reajuste/index.ts
src/pages/
  MinhasAprovacoes.tsx                  (novo, rota /aprovacoes)
  Obrigacoes.tsx                        (refator)
  ContratoDetalhes.tsx                  (bloqueia envio se checklist pendente)
src/components/Aprovacoes/*             (6 arquivos)
src/components/Obrigacoes/*             (6 arquivos)
src/hooks/
  useAprovacoes.ts
  useObrigacoes.ts
src/App.tsx                             (rota /aprovacoes)
src/components/AppSidebar.tsx           (item Aprovações)
PROGRESS.md                             (entrada nova)
```

Job `pg_cron` é agendado via `supabase--insert` (não migration) porque carrega URL/anon-key.

---

## Fora desta rodada (próximas)

- #10 Revisão colaborativa (Redline já parcial — auditar depois).
- #12 ZapSign (depende do checklist desta rodada).
- #14 IA aplicada / #15 Portal externo.

Ao final desta rodada eu pergunto se devemos seguir para o próximo grupo (provavelmente #12 → #10 → #14).

---

## Rodada concluída — Módulos #14 (IA aplicada) e #15 (Portal externo)

### #14 — IA aplicada
- Tabela `contract_ai_insights` (tipo: resumo_executivo | sugestao_clausulas | redline | risco_pontual) com RLS multi-tenant.
- Edge functions: `ia-resumo-executivo` (resumo gestor-first) e `ia-sugerir-clausulas` (recomendações de cláusulas com prioridade).
- UI `AssistenteIA` em nova aba "Assistente IA" no ContratoDetalhes — botões + histórico.

### #15 — Portal externo (contraparte)
- Tabelas `portal_externo_tokens` (token único, escopo view|comment|sign, expiração) e `portal_externo_eventos` (auditoria).
- Edge functions: `criar-portal-contraparte` (admin gera link) e `portal-externo-publico` (verify_jwt=false; view + comment validados por token).
- Comentários da contraparte gravados em `contract_negotiations` com `autor_lado='contraparte'` e metadados (nome, email, via).
- Página pública `/portal/:token` (PortalExterno.tsx) com header, dados do contrato, thread e formulário de comentário.
- Botão "Compartilhar com contraparte" na aba Negociação do ContratoDetalhes.

---

## Rodada de refinamento #11/#13

- `lexflow-constants.ts`: novo `TIPO_OBRIGACAO_OPTIONS` com os 6 tipos da spec + comunicação/relatório/notificação.
- `Obrigacoes.tsx`: filtro de tipo passa a consumir `TIPO_OBRIGACAO_OPTIONS`.
- `SlaAlertBanner.tsx`: banner em `MinhasAprovacoes` com contagem de vencidos e em risco (≤4h).
- `HistoricoDecisoes.tsx`: lê `approval_decisions` por step e exibe dentro do `AprovacaoDecisionDialog`.
