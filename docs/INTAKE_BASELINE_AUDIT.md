# LexFlow — Intake Baseline Audit (pré-Fase A)

> Auditoria do que já existe **antes** de aplicar a migração do intake.  
> Regra do adendo: preservar o existente, adicionar o mínimo viável.

## Classificação por item da spec

| Item da spec | Status | Observações / decisão |
|---|---|---|
| Criação rascunho do contrato | ✅ Alinhado | `contratos.status='rascunho'` default + RLS já permite analista criar |
| Upload de arquivo original | ✅ Alinhado | `contratos.arquivo_url` + bucket privado `contratos-documentos` |
| Hash do arquivo original | 🟡 Parcial | Campo `contratos.arquivo_hash` existe mas **não há trigger** garantindo preenchimento nem imutabilidade |
| Extração AI de campos | ✅ Alinhado | Edge fns `extrair-dados-pdf` + `ia-extrair-campos` + componente `PDFDataExtractor` |
| Revisão humana da extração | ✅ Alinhado | `RevisaoExtracoesPanel` já existe |
| Agrupamento de campos (Identificação/Partes/Datas/Financeiro/Classificação/Compliance) | 🟡 Parcial | Form atual (`ContratoFormDialog`) tem identificação, datas, partes e arquivo. **Falta:** bloco Financeiro detalhado, Classificação/Risco discreto, Compliance |
| Análise de risco | ✅ Alinhado (corrigida na Fase B) | `contract_analysis.score_risco` + `analisar-contrato-ia` |
| Nível de risco discreto manual | ❌ Ausente | Precisa coluna `nivel_risco` (manual prevalece sobre derivado) |
| Compliance checklist | ❌ Ausente | Não há tabela nem UI |
| Due diligence status | ❌ Ausente | Sem campos |
| Gate 1 (completude) | ❌ Ausente | Sem função SQL nem UI |
| Gate 2 (revisão legal por risco) | ❌ Ausente | Sem matriz nem registro de pareceres |
| `intake_status` paralelo ao `status` | ❌ Ausente | Adicionar coluna nova (decisão: opção A) |
| Workflow engine de aprovação | ✅ Alinhado — **NÃO MEXER** | `workflow_definitions/stages/runs/run_stages` + `bootstrap_workflow_run_for_contrato` + `evaluate_stage_rules` já em produção, com Kanban |
| Routing imutável | ✅ Alinhado | `workflow_runs` + `workflow_run_stages` já são append-only via triggers de status |
| Event/history append-only | ✅ Alinhado | `contract_history` + `audit_logs` + trigger `audit_trigger_func` |
| Versionamento de contrato | ✅ Alinhado | `contract_versions` + trigger `create_contract_version` |
| Anexos múltiplos | ✅ Existe | `contract_attachments` já presente |
| `contract_attachments.sha256` / `is_original` / `versao` | ❌ Ausente | Adicionar 3 colunas + trigger bloqueio 2º original |
| Bloco financeiro (forma/condição/parcelas/dia venc/reajuste/multa/juros/dados bancários) | ❌ Ausente | Todas as colunas a adicionar em `contratos` |
| `organizations.email_financeiro` | ❌ Ausente | Adicionar texto único (decisão confirmada) |
| Notificação financeira ao assinar | 🟡 Parcial | Existem `enviar-notificacao-financeiro` e `enviar-valores-contrato` (verificar reuso antes de criar nova) |
| Sanction check | ❌ Ausente | Só campo manual `sanction_check_status` nesta fase |
| Aviso de não renovação | 🟡 Parcial | `renovacao_automatica` existe, falta `dias_aviso_nao_renovacao` + validação |
| Imutabilidade pós-congelamento | ✅ Alinhado | Trigger `enforce_contrato_imutavel` já protege |

## O que NÃO mexer (zona vermelha do adendo)

- Enum `contract_status` (não substituir — `intake_status` convive em paralelo).
- Motor de workflow (`workflow_*`, `bootstrap_workflow_run_for_contrato`, `evaluate_stage_rules`).
- Triggers existentes (`enforce_contrato_imutavel`, `create_contract_version`, `audit_trigger_func`).
- RLS de `contratos` e `contract_attachments`.
- `ContratoFormDialog` atual (estender com nova tab, não recriar).
- `ContratoDetalhes` (adicionar tab "Intake", não reorganizar).
- Edge functions de assinatura, redline, portal externo e workflow.

## Reaproveitamento confirmado para evitar duplicação

| Em vez de criar | Reusar |
|---|---|
| Nova edge function de notificação financeira | Avaliar `enviar-notificacao-financeiro` / `enviar-valores-contrato` primeiro |
| Nova tabela de anexos | Estender `contract_attachments` (3 colunas) |
| Nova engine de roteamento | `workflow_definitions/stages/runs` (apenas seed de definição padrão por nível de risco) |
| Nova máquina de estados | `intake_status` aditivo; `status` muda para `em_aprovacao` ao liberar |
| Novo histórico | `contract_history` + `audit_logs` |

## Próximos passos (revisados pós-auditoria)

1. **Fase A — Migração** (aditiva): novas colunas em `contratos`, 3 colunas em `contract_attachments`, `email_financeiro` em `organizations`, `compliance_checklists`/`compliance_items`/`intake_legal_reviews`, triggers de hash imutável e bloqueio de 2º original. Sem mexer em enums nem em estruturas existentes.
2. **Fase C — Funções de gates**: `evaluate_intake_gate_1`, `evaluate_intake_gate_2`, `release_intake_to_approval`, `seed_compliance_checklist`. Roteamento delegado ao `workflow_*` existente (sem nova engine).
3. **Fase D — UI Intake** (aditiva): nova tab "Intake" em `ContratoDetalhes` com `IntakeStepper`, `BlocoFinanceiroForm`, `ContractChecklistPanel`. `ContratoFormDialog` ganha apenas atalho para abrir intake. Nada removido.
4. **Fase E — Notificação financeira**: reusar edge function existente se compatível; caso contrário, criar `notify-financial-on-signature` mínima. Trigger só dispara quando `status → assinado` e `email_financeiro_notificado_em IS NULL`.
5. **Checkpoint de consistência** ao final de cada fase (template do adendo §7).
