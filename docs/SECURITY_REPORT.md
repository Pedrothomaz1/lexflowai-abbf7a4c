# Relatório de regressão de segurança — LexFlow

> Gerado a partir da última execução de `security-regression-runner`.
> Para regenerar: `POST /functions/v1/security-regression-runner` (admin auth).

| Campo | Valor |
|---|---|
| Data da execução | 2026-05-09T21:11Z |
| Ambiente | Lovable Cloud (`dxllojjazxizuylbmezc`) |
| Total de checks | **19** |
| Aprovados | **19** ✅ |
| Falhas | 0 |

## Resultados por categoria

### RLS multi-tenant (4/4)
- ✅ Org B não enxerga contratos da Org A
- ✅ INSERT cross-org é rejeitado pelo RLS
- ✅ `audit_logs` invisível para não-admin
- ✅ UPDATE com role insuficiente filtra silenciosamente (0 linhas)

### Storage (`contratos-documentos`) (5/5)
- ✅ Admin lê arquivo da própria org
- ✅ Admin de outra org **não** baixa arquivos cross-org (regressão `storage_role_without_org_scope`)
- ✅ Admin de outra org não lista pasta cross-org
- ✅ Upload cross-org rejeitado
- ✅ `avatars/*` não é mais público para anônimos (regressão `storage_avatars_public_anon`)

### Realtime (2/2)
- ✅ Cliente anônimo não recebe `postgres_changes`
- ✅ Notificação inserida na Org A não vaza para subscriber da Org B (regressão `realtime_messages_no_policies`)

### Edge Functions (8/8)
- ✅ `rate-limiter` exige JWT (regressão `no_auth_rate_limiter`)
- ✅ `security-alert-handler` exige JWT (regressão `no_auth_alert_handler`)
- ✅ `security-alert-handler` nega não-admin
- ✅ `enviar-notificacao-whatsapp` rejeita bearer falso (regressão `unverified_token_whatsapp`)
- ✅ `anomaly-detector` exige `CRON_SECRET` (regressão `bypassable_anomaly_auth`)
- ✅ `analisar-contrato` bloqueia `fileUrl` cross-org (regressão `cross_tenant_signed_urls`)
- ✅ `extrair-dados-pdf` bloqueia `fileUrl` cross-org (regressão `cross_tenant_signed_urls`)
- ✅ `consultar-cnpj` retorna erro genérico (regressão `cnpj_error_string_leak`)

## Conclusão

Todas as findings de segurança das últimas auditorias têm cobertura de regressão
automática verde. O produto está pronto para uma rodada externa de pentest e
para venda condicionada à execução das ações listadas em
[`docs/security-readiness.md`](./security-readiness.md) (HIBP, revisão jurídica
de termos, SIEM externo).
