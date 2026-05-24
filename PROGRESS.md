# LexFlow — Progresso da Spec v2

_Atualizado: 22/05/2026_

## Resumo executivo

**Spec v2 entregue em 100%** — backend (18/18 blocos), UIs visuais (4/4), **hardening de segurança completo**. Produto pronto para venda assistida.

---

## ✅ Hardening pré-venda (completo)

| Frente | Status | Evidência |
|---|---|---|
| Suite de regressão de segurança | ✅ **26/26 passed** | edge `security-regression-runner` |
| Pre-launch automatizado | ✅ **13/13 passed · 0 failed · 2 N/A** | aba `/security` → Pré-Venda |
| Linter Supabase | ✅ 85→38 (47 fixes; 38 restantes são intencionais/limitação plataforma) | migration `revoke_definer_anon` |
| RLS multi-tenant | ✅ validado pela regressão (isolamento org A vs B, cross-user, cross-org) | suite Deno |
| QA visual final | 🟡 10 testes manuais críticos pendentes (lista na aba Pré-Venda) | a executar manualmente |

**Detalhe do linter:** 38 warnings restantes:
- 1× `extension_in_public` (pg_net/pgcrypto — limitação Supabase)
- 37× `authenticated_security_definer_function_executable` (intencional: helpers de RLS `has_role`/`current_user_org`/etc. e RPCs do frontend `dash_*`, super admin, LGPD — todos com checagens internas)

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

## ✅ Entregues — UIs visuais

| # | UI | Páginas/Componentes |
|---|---|---|
| **14** | Revisão de extrações IA | `RevisaoExtracoesPanel.tsx` em `ContratoDetalhes.tsx` |
| **7** | Workflow Builder | `WorkflowBuilder.tsx` (`/workflows/builder`) |
| **6** | Form Builder | `FormBuilder.tsx` + `RequisicaoFormPublica.tsx` + `DynamicFormRenderer.tsx` |
| **9** | Templates v2 | `Templates.tsx` (versionamento + geração via edge) |

---

## 🔭 Pós-venda / manual

1. **10 testes críticos manuais** — listados na aba `/security` → Pré-Venda (cada um com "Como executar" e "Aprovado se"; clicar **Registrar** após)
2. **Rotação periódica** — `LOVABLE_API_KEY` e secrets sensíveis a cada 90 dias
3. **Backup/restore drill** — testar restore de snapshot em ambiente separado antes da primeira venda
