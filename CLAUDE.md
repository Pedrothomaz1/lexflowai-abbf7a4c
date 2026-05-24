# LexFlowAI — Contract Management Platform

> **Tipo:** Production (React + Supabase)
>
> Herda de `C:\Users\Pedro\.claude\CLAUDE.md` + rules globais
>
> Foco: Gestão de contratos, validação de cláusulas críticas, detecção de riscos

---

## Contexto

**Tipo:** production
**Localização:** `/c/Users/Pedro/lexflowai/`
**Status:** Ativo (deploy contínuo)

### O que é

Sistema de gestão de contratos empresariais para análise, armazenamento e controle de risco de contratos com fornecedores, franquias e parceiros.

**Funcionalidades principais:**
- Análise de cláusulas críticas (anticorrupção, LGPD, NDA)
- Detecção automática de risco (ALTO / MÉDIO / BAIXO)
- Rastreamento de datas críticas (vencimento, reajuste)
- Gestão de fornecedores com RLS (Row-Level Security)
- Autenticação 2FA/TOTP via Supabase
- Controle de acesso por organização + roles

---

## Agentes e Responsabilidades

| Agente | Função |
|--------|--------|
| **@pm** | Orquestração de features, roadmap de contratos |
| **@architect** | Arquitetura Supabase, RLS policies, Edge Functions |
| **@dev** | Desenvolvimento React/TypeScript, componentes UI |
| **@qa** | Validação de análise de cláusulas, testes de segurança |
| **@devops** | Deploy, CI/CD, gestão de credenciais Supabase |

---

## Stack Técnico

**Frontend:**
- React 18.3 + TypeScript + Vite
- TailwindCSS + Shadcn/ui (componentes Radix)
- Context API (Auth, Organization)
- 12+ hooks customizados

**Backend:**
- Supabase (PostgreSQL 15)
- 19 Deno Edge Functions
- Row-Level Security (RLS) policies
- 40+ migrations SQL

**Autenticação:**
- Supabase Auth (Session-based)
- 2FA/TOTP (libphonenumber, TOTP)
- Magic Links (email)

**Observabilidade:**
- Logs estruturados em Supabase
- Error tracking (Sentry ou similar — TBD)

---

## Data Model

### Tabelas Core

| Tabela | Descrição |
|--------|-----------|
| `organizations` | Empresas/tenants |
| `organization_members` | Membros com roles (ADMIN, LAWYER, VIEWER) |
| `profiles` | Perfis de usuário |
| `contratos` | Contratos com análise de risco |
| `fornecedores` | Fornecedores com DPO tracking |
| `franquias` | Franquias com contatos |
| `clausulas_criticas` | Templates de cláusulas obrigatórias |
| `analise_risco` | Histórico de avaliações de risco |

### Segurança RLS

- Todas as tabelas têm RLS ativa
- Políticas por `organization_id`
- Roles: ADMIN (acesso total), LAWYER (análise), VIEWER (leitura)
- Admin pode convidar novos membros

---

## Regras de Análise de Contratos

### Extração Obrigatória

Para cada novo contrato, @dev deve:
1. Prazo de pagamento (impacta DPO)
2. Índice e periodicidade de reajuste
3. Multa rescisória e condições
4. Foro de eleição

### Detecção de Cláusulas Críticas

| Cláusula | Status Obrigatório | Risco se Ausente |
|----------|-------------------|------------------|
| Anticorrupção (LGPD) | ✅ | 🔴 ALTO |
| NDA / Confidencialidade | ✅ | 🔴 ALTO |
| Condição de Reajuste | ⚠️ | 🟡 MÉDIO |
| Multa Rescisória | ⚠️ | 🟡 MÉDIO |

### Classificação de Risco

```
🔴 ALTO
- Cláusula abusiva detectada
- Cláusula crítica ausente
- Inconsistência legal flagrada

🟡 MÉDIO
- Cláusula presente mas desfavorável
- Prazo acima do mercado

🟢 BAIXO
- Dentro do padrão de mercado
- Todas cláusulas críticas presentes
```

---

## Próximos Passos (Roadmap)

- [ ] Implementar auto-análise de riscos (ML-powered — futuro)
- [ ] Integração com e-signature (DocuSign ou similar)
- [ ] Alertas automáticos para vencimentos (cron job)
- [ ] Relatórios executivos exportáveis (PDF)
- [ ] Versionamento de contratos (git-like diff)
- [ ] Audit trail completo de modificações

---

## Regras Ativas (Herança)

- `story-lifecycle.md` — Workflow de desenvolvimento (Draft → Ready → InProgress → InReview → Done)
- `workflow-execution.md` — Orquestração de tasks
- `agent-authority.md` — Delegação @devops push, @pm epic, etc.
- `coderabbit-integration.md` — Auto-fix CRITICAL/HIGH (2 iterações dev, 3 qa)
- `financial-domain.md` — Nomenclatura NCG/DIO/DSO/DPO para análise de fornecedores

---

## Referências

- 📖 Documentação Técnica: `DOCUMENTACAO_TECNICA.md`
- 🗄️ Banco de Dados: `supabase/migrations/`
- 🔧 Edge Functions: `supabase/functions/`
- 📋 REGISTRY: `C:\Users\Pedro\.claude\projects\REGISTRY.md`
