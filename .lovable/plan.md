## Objetivo

Garantir que as correções de segurança recentes (RLS em `realtime.messages`, Storage por organização, autenticação das edge functions) não regridam, e produzir um relatório de prontidão para venda cobrindo LGPD/OWASP/RBAC.

## Entregáveis

1. **Seed de teste reproduzível** — usuários e organizações isolados, criados via script.
2. **Suite Deno de integração** rodando contra o backend real, executada pelo runner de edge functions já disponível.
3. **Checklist de prontidão para venda** (`docs/security-readiness.md`) e **relatório executivo** (`docs/SECURITY_REPORT.md`) gerado após a suíte.
4. **Script npm** `test:security` que orquestra tudo localmente e em CI.

## Arquitetura da suíte

```text
supabase/functions/_security_tests/
├── _bootstrap.ts          seed/teardown idempotente via service role
├── _clients.ts            helpers: signInAs(orgA_admin), anonClient(), serviceClient()
├── rls_realtime.test.ts   subscribe + postgres_changes cross-org
├── rls_storage.test.ts    upload/download/signed URL cross-org + cross-role
├── rls_tables.test.ts     contratos / fornecedores / audit_logs / notifications
├── edge_auth.test.ts      rate-limiter, security-alert-handler, whatsapp,
│                          anomaly-detector, analisar-contrato, extrair-dados-pdf
└── README.md              como rodar e interpretar resultados
```

### Seed (`_bootstrap.ts`)

Usa `SUPABASE_SERVICE_ROLE_KEY` (já existe como secret) para:

- Criar/recuperar orgs `Org Test A` e `Org Test B` (idempotente por nome).
- Criar usuários via Admin API (`auth.admin.createUser`, `email_confirm: true`):
  - `secqa+admin-a@lexflowai.com.br` — admin da Org A
  - `secqa+analista-a@lexflowai.com.br` — analista da Org A
  - `secqa+admin-b@lexflowai.com.br` — admin da Org B
- Linkar em `organization_members` + `user_roles` com a role correta.
- Cria 1 contrato e 1 fornecedor em cada org para os testes cross-org.
- Faz upload de 1 arquivo dummy em `<orgA_id>/seed.pdf` e `<orgB_id>/seed.pdf`.
- Senha gerada uma vez e gravada em secrets `SECQA_PASSWORD` (você confirma, eu peço via add_secret).
- Função `teardown()` limpa apenas dados marcados com tag `secqa_seed=true`.

### Casos de teste cobertos

**rls_realtime.test.ts**
- Anônimo não consegue subscrever em `realtime:public:notifications` (RLS recém-adicionada).
- Admin Org A inserindo `notifications` com `organization_id=A` → analista Org A recebe payload em ≤2s.
- Admin Org B subscrito ao mesmo canal **não** recebe a notificação da Org A (filtragem por RLS na tabela origem).
- Idem para `contract_comments` e `contract_signatures`.

**rls_storage.test.ts**
- Admin Org A faz upload em `<orgA>/file.pdf` ✅; em `<orgB>/file.pdf` ❌ (403).
- Admin Org B (`administrador`!) NÃO consegue `list`/`download`/`createSignedUrl` para `<orgA>/seed.pdf` (regressão da finding `storage_role_without_org_scope`).
- Pasta `avatars/` antiga não é mais pública: anon `getPublicUrl` ou `download` em `avatars/x.png` retorna erro (regressão de `storage_avatars_public_anon`).
- Analista Org A consegue download do próprio arquivo de org; usuário sem role nenhuma é negado.

**rls_tables.test.ts**
- Admin Org B fazendo `select` em `contratos` retorna 0 contratos da Org A.
- Tentativa de `insert` em `contratos` com `organization_id` da outra org → erro RLS.
- `audit_logs`: analista (não-admin) recebe 0 linhas; admin da própria org recebe ≥1.
- `update` com role insuficiente é bloqueado e o helper `.select().maybeSingle()` retorna `null` (memory: rls-silent-failure-handling).

**edge_auth.test.ts** (regressões das findings recém-corrigidas)
- `rate-limiter` sem token → 401; com token mas sem `endpoint` → 400; com token analista pedindo `userRole: 'administrador'` no body é ignorado (multiplier do papel real).
- `security-alert-handler` sem token → 401; analista (não-admin) → 403; admin de outra org sobre alert da Org A → 403.
- `enviar-notificacao-whatsapp` com `Bearer fake` → 401.
- `anomaly-detector` sem header → 401; sem `CRON_SECRET` configurado → 500.
- `analisar-contrato` / `extrair-dados-pdf` com `fileUrl` apontando para `<orgB>/...` chamado por user da Org A → 403.
- `consultar-cnpj` em erro forçado retorna mensagem genérica (sem stack).

## Checklist de prontidão para venda

Arquivo `docs/security-readiness.md` cobrindo:

- **LGPD**: base legal, retenção, anonimização (`gdpr_delete_user` já existe), DPO contact, consentimento.
- **OWASP Top 10 2021** mapeado → controle implementado + teste cobrindo.
- **Multi-tenant**: RLS por tabela, storage por pasta, realtime gated, edge functions org-scoped.
- **RBAC**: papéis em `user_roles`, `has_role`/`has_any_role`/`has_permission`, MFA opcional.
- **Auditoria**: `audit_logs` + `compliance_logs` + `security_alerts` + playbooks.
- **Segredos**: anon vs service role, rotação documentada, CSP/headers, robots.
- **Backup/DR**: gerenciado pelo Lovable Cloud.

Cada item linka para o teste que o cobre.

## Relatório executivo

`docs/SECURITY_REPORT.md` é gerado a cada execução com:

- Data, commit, ambiente.
- Lista de testes (verde/vermelho) agrupados por categoria.
- Findings ativos do scanner Lovable (puxados via `security--get_scan_results` em modo build).
- Status do checklist (PASS/PENDING).
- Próximos passos.

## Passos de implementação

1. Adicionar dependência de teste Deno (nada a instalar — já temos runner).
2. Escrever `_bootstrap.ts` + `_clients.ts` (idempotente, usa service role).
3. Escrever as 4 suítes acima.
4. Criar `docs/security-readiness.md` (checklist).
5. Criar `scripts/run-security-suite.ts` que invoca o runner e materializa `docs/SECURITY_REPORT.md`.
6. Adicionar memory note `mem://security/regression-suite` apontando para a suíte.

## Detalhes técnicos

- **Runner**: `supabase--test_edge_functions` (Deno test). Os arquivos vivem em `supabase/functions/_security_tests/*.test.ts`.
- **Credenciais**: senha única em secret runtime `SECQA_PASSWORD` (peço com `add_secret` ao implementar). Service role já existe.
- **Isolamento**: tudo é prefixado `secqa_` e tem campo `metadata.secqa_seed=true` para teardown seguro.
- **CI**: o runner pode ser invocado a cada PR via tooling Lovable; localmente o usuário não roda — instruções no README apenas para referência.
- **Sem rate limiting**: respeitamos a diretriz de não introduzir backend rate limiting; só **testamos** o que existe.

## Fora de escopo

- Pentest manual / fuzzing externo (recomendado em prod por terceiro especializado — documentado no relatório).
- Cron real do `anomaly-detector` (apenas teste de auth).
- Carga / DDoS.
