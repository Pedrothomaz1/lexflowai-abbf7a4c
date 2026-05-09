# Security Regression Suite

Suite Deno que valida, contra o backend real, as proteções de RLS de
`realtime.messages`, isolamento de Storage por organização/role e a
autenticação das edge functions sensíveis.

## Como rodar

A suíte é executada pelo runner do Lovable (`test_edge_functions`) ou,
internamente, por Deno:

```
deno test --allow-net --allow-env supabase/functions/_security_tests
```

## Pré-requisitos (já configurados como secrets)

| Variável                    | Origem                |
|-----------------------------|-----------------------|
| `SUPABASE_URL`              | injetada pelo runner  |
| `SUPABASE_ANON_KEY`         | injetada pelo runner  |
| `SUPABASE_SERVICE_ROLE_KEY` | injetada pelo runner  |
| `SECQA_PASSWORD`            | secret do projeto     |

## Dados criados pelo bootstrap

- `SECQA Org A` e `SECQA Org B` em `organizations`
- 3 usuários `secqa+...@lexflowai.com.br` com a senha `SECQA_PASSWORD`
- `user_roles` apropriadas em cada organização
- 1 contrato + 1 fornecedor + 1 arquivo de Storage por org

Tudo é idempotente; rodar a suíte várias vezes não duplica nada.

## Cobertura

| Arquivo                 | Finding original                                                          |
|-------------------------|---------------------------------------------------------------------------|
| `rls_realtime.test.ts`  | `realtime_messages_no_policies`                                           |
| `rls_storage.test.ts`   | `storage_role_without_org_scope`, `storage_avatars_public_anon`           |
| `rls_tables.test.ts`    | regressão geral de RLS multi-tenant                                       |
| `edge_auth.test.ts`     | `no_auth_rate_limiter`, `no_auth_alert_handler`, `unverified_token_whatsapp`, `bypassable_anomaly_auth`, `cross_tenant_signed_urls`, `cnpj_error_string_leak` |
