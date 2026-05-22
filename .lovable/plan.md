## Resultado dos testes que rodei agora (read-only)

### Suíte automatizada de regressão (`security-regression-runner`)
Executada: **25 passed / 1 failed** (mesmo resultado que está em `pre_launch_test_runs`).

**Caso vermelho identificado**: `storage: admin Org A reads own file` — `detail: {}`.

**Causa raiz**: o seed cria as orgs `SECQA Org A/B` sem `status`, então elas ficam em `pendente_aprovacao` (default). A função `current_user_org()` filtra por `o.status = 'ativa'`, retornando `NULL` para os seed users. A policy do bucket `contratos-documentos` exige `foldername = current_user_org()` → o download do próprio arquivo nega com erro vazio do storage.

**Efeito colateral grave**: vários testes "passed" estão passando **vacuamente**. Com `current_user_org()` NULL, todos os SELECTs do usuário retornam 0 linhas → "Org B sees no Org A contracts", "silent RLS on UPDATE", "non-admin cannot read audit_logs" passam **sem testar nada**. A suíte está dando falsa segurança.

### Teste 5.1 — Imutabilidade de `compliance_logs`
Validado por inspeção direta: tabela com **RLS habilitada** + policies somente `INSERT` (`mt_compliance_logs_insert`) e `SELECT` (`mt_compliance_logs_select`). Sem policy de UPDATE/DELETE → bloqueado por default para todos os roles exceto service_role. **Aprovado**.

### Teste 4.7 — Validação Zod em edge functions POST
Resultado: **1 de 40** edge functions com body POST usa Zod (`pre-launch-test-runner`). 39 funções fazem `await req.json()` sem schema Zod (algumas validam manualmente, outras não). Critério "100% das fns POST/PUT têm schema" **reprova** como está escrito.

---

## Plano de ação

### 1. Corrigir o seed da suíte de regressão (destrava 10 testes + remove falsos positivos)

Arquivo: `supabase/functions/security-regression-runner/index.ts`, função `ensureOrg`.

Mudança: ao criar a org SECQA, gravar `status: 'ativa'` e `aprovada_em: now()`. Ao reusar uma org existente em outro status, atualizar para `'ativa'`. Sem isso, `current_user_org()` continua NULL.

Depois rodar a suíte de novo e esperar **26/26 passed**.

### 2. Atualizar `pre_launch_test_runs` após a re-execução

Mover os 10 testes hoje `failed` (2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.10, 3.1, 3.2) para `passed` com a nota do novo run, e registrar na nota que os SELECTs cross-tenant agora retornam dados reais (não vacuamente).

### 3. Validar 5.1 no painel pré-venda

Mudar de `skipped` para `passed` com nota "RLS habilitada; policies só INSERT/SELECT; UPDATE/DELETE bloqueados por default — verificado via `pg_policies`".

### 4. Decidir 4.7 (sem refazer 40 edge functions agora)

Duas opções para o teste de Zod, na ordem de menor esforço:

- **a)** Marcar 4.7 como `passed` redefinindo critério: "fns sensíveis (auth, billing, super-admin, gdpr, signature-webhook) têm validação manual de tipo + tratamento de erro; cobertura Zod 100% fica como hardening pós-venda". Registrar a lista no doc.
- **b)** Adicionar Zod incrementalmente nas 5–8 funções mais sensíveis (`registrar-aceite-lgpd`, `gdpr-handler`, `super-admin-*`, `criar-portal-contraparte`, `zapsign-webhook`, `signature-webhook`) e marcar 4.7 como `passed` parcial.

Recomendo **(b)** porque webhook/gdpr/super-admin merecem schema explícito, mas dá pra fazer (a) e mover (b) para backlog pós-venda — sua decisão.

### 5. Sem mudança nos demais `skipped`

4.5, 5.2, 5.6, 6.1–6.6, 7.2 permanecem `skipped` com a justificativa "pós-venda" já registrada. Não cabem ao agente: dependem de pentest externo, DAST/SAST em CI próprio, drill de backup com ambiente isolado, doc jurídico sob NDA, etc.

---

## Detalhes técnicos

- **Tabela afetada pelo seed**: `organizations` (campos `status`, `aprovada_em`).
- **Policies relevantes do storage** (não mudam): `storage_org_select`/`update`/`delete` exigem `(storage.foldername(name))[1] = current_user_org()::text OR auth.uid()::text`.
- **Risco da mudança 1**: nenhum — afeta apenas as orgs `SECQA Org A` e `SECQA Org B`, que são exclusivas para testes. Nenhuma org de cliente real é tocada.
- **Sem migrations**, sem mudança de RLS, sem novo segredo.

## Para virar isto em código

Preciso que você mude para modo **build**. Após o switch eu aplico a mudança em `ensureOrg`, rerode a suíte, atualizo `pre_launch_test_runs` (2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.10, 3.1, 3.2 → `passed`; 5.1 → `passed`) e te pergunto qual caminho seguir no 4.7 (a ou b).
