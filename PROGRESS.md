# LexFlow — Progresso da Spec v2

_Atualizado: 22/05/2026_

## Resumo executivo

**Spec v2 entregue em 100%** — backend dos 18 blocos + UIs visuais dos 4 módulos pendentes (#6, #7, #9, #14). Produto está funcional ponta a ponta com interfaces de configuração completas. Restam apenas atividades de **hardening pré-venda** (suite de regressão de segurança + testes pré-lançamento).

---

## ✅ Entregues — Backend (18/18)

| # | Bloco | Status |
|---|---|---|
| 1 | Fundação React + design system + sidebar | ✅ |
| 2 | Shell autenticado + RBAC | ✅ |
| 3 | Multi-tenant + RLS + `audit_logs` | ✅ |
| 4 | Dashboard executivo (RPCs `dash_kpi_*`, `dash_pipeline_*`) | ✅ |
| 5 | Requisições contratuais (`contract_requests`) | ✅ |
| 6 | Form Builder — `request_forms`, `request_form_versions` (schema JSON versionado) | ✅ |
| 7 | Workflow Builder — `workflow_definitions`, `workflow_stages`, `workflow_runs`, edge `workflow-advance` | ✅ |
| 8 | Módulo central de contratos | ✅ |
| 9 | Templates documentais — `document_templates`, `template_versions`, edge `gerar-documento` | ✅ |
| 10 | Redline + IA de redline (`ia-redline-sugerir`) | ✅ |
| 11 | Aprovações + checklist + SLA (`approval_steps`, `contract_approvals`) | ✅ |
| 12 | Pacote final imutável — bucket `final-packages`, SHA-256, trigger `enforce_contrato_imutavel` | ✅ |
| 13 | pg_cron diário — job `lexflow-cron-diario` (08h UTC) idempotente | ✅ |
| 14 | IA estruturada — `ai_extractions` + `ai_risk_reviews` + edge `ia-extrair-campos` com tool calling | ✅ |
| 15 | Portal externo (links com expiração) | ✅ |
| 16 | Fornecedores + `consultar-cnpj` (cache 24h) | ✅ |
| 17 | Super Admin (`/super-admin`, `is_super_admin`, suspender/aprovar org) | ✅ |
| 18 | Auditoria + observabilidade | ✅ |

---

## ✅ Entregues — UIs visuais desta rodada

| # | UI | Páginas/Componentes |
|---|---|---|
| **14** | Revisão de extrações IA | `src/components/IA/RevisaoExtracoesPanel.tsx` integrado em `ContratoDetalhes.tsx` — aceitar/editar/descartar campos e riscos com indicador de confiança |
| **7** | Workflow Builder | `src/pages/WorkflowBuilder.tsx` (rota `/workflows/builder`) — abas Definições (canvas vertical de etapas) e Execuções (aprovar/rejeitar/pular) |
| **6** | Form Builder | `src/pages/FormBuilder.tsx` (admin, editor 2 colunas com preview ao vivo) + `src/pages/RequisicaoFormPublica.tsx` (`/requisicao/form/:formId`) + `src/components/Requisicoes/DynamicFormRenderer.tsx` |
| **9** | Templates v2 | `src/pages/Templates.tsx` reescrito para `document_templates` + `template_versions` — detecção automática de `{{variaveis}}`, versionamento com changelog, modal de geração via edge `gerar-documento`, histórico de versões |

Migrações de sidebar/rotas: `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/components/CommandPalette.tsx`.

---

## 🔭 Próximas tasks recomendadas (hardening pré-venda)

1. **Suite de regressão de segurança** — rodar `security-regression-runner` + revisar `docs/SECURITY_REPORT.md`
2. **Pre-launch test runner** — disparar via `/security` aba Pré-Venda e validar persistência em `pre_launch_test_runs`
3. **Linter Supabase** — varrer warnings e aplicar correções
4. **Revisão de RLS** — checklist `docs/security-checklist.md` completo
5. **QA visual final** — percorrer fluxos: requisição → workflow → aprovação → template → pacote final
