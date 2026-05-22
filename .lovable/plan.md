# Auditoria Go/No-Go — LexFlow

## Veredito provisório: 🟡 **No-Go condicional**

Produto está funcionalmente pronto, mas há **4 gaps mensuráveis** entre o que o `PROGRESS.md` declara e o que o banco/painel atestam. Nenhum é bloqueio profundo — todos fecham em uma sessão.

---

## Gaps encontrados

### G1 · Cobertura de testes pré-venda incompleta (alto)
- **Spec oficial** (`docs/PRE_LAUNCH_TEST_SPEC.md`): **48 testes** em 6 frentes.
- **Registrado em `pre_launch_test_runs`**: 17 entradas → **15 passed + 2 skipped**.
- **Lacuna**: ~31 testes nunca rodaram nem foram marcados como N/A.
- Frentes praticamente vazias: 3 (apenas 2 passed), 4 (1 skipped), 6 (0 entradas).
- O `PROGRESS.md` diz "13/13 passed · 0 failed · 2 N/A" — está medindo o subconjunto automático, não a spec completa.

### G2 · Security Regression Suite nunca executada em produção (alto)
- Tabela `security_regression_runs` criada na Sprint 2 desta sessão.
- **0 execuções persistidas** até agora.
- A suite Deno (26 testes) já passa localmente, mas não há histórico no painel para auditoria.

### G3 · Testes manuais críticos pendentes (médio)
- `PROGRESS.md` cita **10 testes manuais críticos** na aba `/security` → Pré-Venda.
- Esses são QA visual / fluxo end-to-end (login, reset, MFA, signed URL, etc.) que `vitest` não cobre.
- Status atual: pendentes.

### G4 · Linter Supabase: 38 warnings com justificativa não congelada (baixo)
- `mem://security/linter-hardening-decisions` documenta as decisões.
- Não há um snapshot datado anexado ao `SECURITY_REPORT.md` provando "38 é o piso aceito hoje".
- Sem isso, próxima auditoria externa vai re-questionar cada warning.

---

## O que **não** é gap (verificado)

- ✅ Backend 18/18 blocos — todas as tabelas, RPCs, triggers, edge functions existem
- ✅ 3 crons ativos (vencimentos diário 08h, alertas 09h e 17h)
- ✅ Bucket privado + signed URLs + RLS multi-tenant
- ✅ 4 UIs visuais (Workflow Builder, Form Builder, Templates v2, Revisão IA)
- ✅ Scanners de segurança (`supabase_lov`, `supabase`, `agent_security`, `connector_security_scan`): **0 findings**
- ✅ Secrets configurados (14 itens incluindo `COMPRAS_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`)
- ✅ Sem TODOs bloqueantes no código (apenas 2 arquivos com comentários informativos)

---

## Plano de fechamento (1 sessão)

### Etapa 1 — Executar Security Regression Suite (fecha G2)
- Abrir `/security` → aba **Regressão** → clicar **Executar suíte**.
- Persiste em `security_regression_runs`.
- Anexar JSON de saída em `docs/test-evidence/security-regression-go-live.json`.

### Etapa 2 — Marcar testes automáticos restantes (fecha parte de G1)
- Rodar `bunx vitest run` localmente; para cada teste verde da spec, marcar `passed` no painel via Pré-Venda.
- Para testes claramente não aplicáveis ao MVP (ex.: SSO SAML se ainda não vendido), marcar `skipped` com `notes`.
- Meta: 0 entradas `pending` para os ~31 ausentes.

### Etapa 3 — Rodar os 10 manuais críticos (fecha G3)
- Executar a checklist da aba Pré-Venda (~30-45 min).
- Registrar evidência (screenshot) em `docs/test-evidence/<id>-<slug>.png` e clicar **Registrar**.

### Etapa 4 — Congelar relatório de segurança (fecha G4)
- Anexar ao `docs/SECURITY_REPORT.md`:
  - Data do snapshot
  - Output do `supabase--linter` (38 warnings)
  - Tabela 38× com `id`, `categoria`, `justificativa` (ref. `mem://security/linter-hardening-decisions`)
- Assinar com hash do commit.

---

## Critério Go/No-Go final

Após as 4 etapas:
- 🟢 **Go** se: `pre_launch_test_runs` sem `pending`, ≥1 run em `security_regression_runs` com 26/26 passed, 10 manuais `passed`, `SECURITY_REPORT.md` com snapshot do linter assinado.
- 🔴 **No-Go** se qualquer um falhar — abrir ticket de correção antes de publicar.

---

## Decisão para o usuário

Posso executar **Etapa 1 + Etapa 2** agora (são as únicas que dependem só de tooling, não de QA visual humana). As Etapas 3 e 4 exigem ação manual sua (clicar pelos fluxos) e curadoria do relatório.

Sigo com Etapas 1 e 2?
