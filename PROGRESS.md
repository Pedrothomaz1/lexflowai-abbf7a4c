# LexFlow — Progresso da Spec v2

_Atualizado: 22/05/2026_

## Resumo executivo

Backend dos 18 blocos da spec v2 está **100% entregue**. Restam apenas UIs visuais (canvas/editor) para 4 módulos. O produto já é funcional ponta a ponta via APIs/edge functions; as UIs faltantes são "produtividade de configuração", não bloqueiam operação.

---

## ✅ Entregues

| # | Bloco | Status |
|---|---|---|
| 1 | Fundação React + design system + sidebar | ✅ |
| 2 | Shell autenticado + RBAC | ✅ |
| 3 | Multi-tenant + RLS + `audit_logs` | ✅ |
| 4 | Dashboard executivo (RPCs `dash_kpi_*`, `dash_pipeline_*`, etc.) | ✅ |
| 5 | Requisições contratuais (`contract_requests`) | ✅ |
| 8 | Módulo central de contratos | ✅ |
| 10 | Redline + IA de redline (`ia-redline-sugerir`) | ✅ |
| 11 | Aprovações + checklist + SLA (`approval_steps`, `contract_approvals`) | ✅ |
| 12 | **Pacote final imutável** — bucket `final-packages`, hash SHA-256, trigger `enforce_contrato_imutavel`, `PacoteFinalCard` | ✅ |
| 13 | **pg_cron diário** — job `lexflow-cron-diario` (08h UTC) + edge `cron-lexflow-diario` (obrigações 7d, renovação 30d, SLA aprovações) idempotente | ✅ |
| 14 | **IA estruturada** — `ai_extractions` + `ai_risk_reviews` + edge `ia-extrair-campos` com tool calling | ✅ |
| 15 | Portal externo (links com expiração) | ✅ |
| 16 | Fornecedores + `consultar-cnpj` (cache 24h) | ✅ |
| 17 | Super Admin (`/super-admin`, `is_super_admin`, suspender/aprovar org) | ✅ |

### Backend novo desta rodada (#6, #7, #9, #14, #12, #13)

| Bloco | Tabelas/edges criadas |
|---|---|
| **#6 Form Builder** | `request_forms`, `request_form_versions` (schema JSON, versionado) + `contract_requests.form_version_id` + `respostas` |
| **#7 Workflow Builder** | `workflow_definitions`, `workflow_stages` (ordem, SLA, regras JSON), `workflow_runs`, `workflow_run_stages` + edge `workflow-advance` |
| **#9 Templates documentais** | `document_templates`, `template_versions` (variáveis JSON) + edge `gerar-documento` (substitui `{{var}}` com validação de obrigatórias) |
| **#12 Pacote final** | colunas `pacote_final_url/_hash/_congelado_at` em `contratos`, bucket privado `final-packages`, trigger imutabilidade, `zapsign-webhook` calcula SHA-256 |
| **#13 pg_cron** | job diário idempotente com 3 verificações |
| **#14 IA estruturada** | `ai_extractions` + `ai_risk_reviews` (status pendente/aceito/editado/descartado, confiança 0-1) + edge com tool calling |

---

## ⚠️ Pendente — somente UI

| # | UI faltante | Severidade |
|---|---|---|
| 6 | Editor drag-and-drop de formulário + tela de submissão dinâmica | Média |
| 7 | Canvas visual de workflow (etapas, regras) + tela de execução | Média |
| 9 | UI de edição de template com variáveis mapeadas (atual ainda usa `contract_templates` legado) | Baixa |
| 14 | Painel de revisão "aceitar/editar/descartar" para extrações e riscos | Média |

---

## 🔭 Próximas tasks recomendadas (em ordem)

1. **UI #14** — painel de revisão de extrações IA (maior ROI, IA já gera dados)
2. **UI #7** — canvas de Workflow (pilar do produto)
3. **UI #6** — Form Builder (depende visual do #7 estar maduro)
4. **UI #9** — migrar Templates legado para `document_templates`
5. **Hardening pré-venda** — rodar suite security + pre-launch
