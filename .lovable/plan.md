## Monitoramento Automático de organization_members

Implementar detecção diária de inserções suspeitas em `organization_members`, com log em auditoria, notificação ao admin e view para consulta manual.

### Observação importante sobre o schema atual

O schema do projeto difere ligeiramente da spec enviada — vou adaptar mantendo a intenção:

- `organizations.name` → na verdade é `organizations.nome`
- `audit_logs` não tem colunas `action` / `description` / `severity`. Vou mapear para o schema real:
  - `acao` = `'org_member_monitor'`
  - `entidade` = `'organization_members'`
  - `event_category` = `'auth'`
  - `risk_level` = `'low'` (≤3 novos) ou `'medium'` (>3 novos) — mapeia o conceito de info/warning para os valores aceitos pela tabela
  - `metadata` (jsonb) = `{ description, severity: 'info'|'warning', count, members: [...] }`

### 1. Edge Function: `monitor-org-members`

Arquivo: `supabase/functions/monitor-org-members/index.ts`

- Validação de chamador: aceita Bearer com `SUPABASE_SERVICE_ROLE_KEY` **ou** header `x-cron-secret` = `CRON_SECRET` (defesa em profundidade para chamadas externas).
- Cria client com service role (bypass RLS).
- Para cada organização com novos membros nas últimas 24h:
  - Busca `organization_members` joined com `profiles.email` e `organizations.nome` (usando `auth.users` via service role para email fallback).
  - Agrupa por `organization_id`.
  - Insere 1 linha em `audit_logs` por organização com `metadata` contendo a lista.
  - Se `count > 3` (warning): insere notificações via SQL direto para todos os membros admin/owner da org (`organization_members.role_in_org IN ('owner','admin') AND is_active = true`), com `tipo='security'`, `titulo='Alerta: muitos novos membros na organização'`, `mensagem` com count + emails.
- Retorna `{ ok: true, organizations_checked, warnings, total_new_members }`.
- CORS padrão e tratamento de erro com status 200 + payload de erro (para não quebrar cron).
- `verify_jwt = false` (default Lovable) — autenticação é feita no código.

### 2. Migration SQL

- Habilita `pg_cron` e `pg_net` (se ainda não habilitados).
- Cria a view `vw_org_members_recent`:
  - Adapta `o.name` → `o.nome AS org_name`
  - Faz JOIN com `profiles` (em vez de `auth.users`, para respeitar boundary do schema público)
  - Mantém a coluna `periodo` (hoje / esta semana / este mês)
  - Define como `security_invoker = true` para herdar RLS do chamador
- Agenda cron job `monitor-org-members-daily` às `0 11 * * *` (08:00 BRT):
  - Usa `net.http_post` para `https://dxllojjazxizuylbmezc.supabase.co/functions/v1/monitor-org-members`
  - Envia header `Authorization: Bearer <SERVICE_ROLE_KEY>` e `x-cron-secret: <CRON_SECRET>`
  - **Nota:** os valores literais ficam no SQL agendado (necessário porque `cron.schedule` não tem acesso a `Deno.env`). É padrão Supabase para cron→edge.

### 3. Validação pós-deploy

Após a migration e deploy automático:

1. `curl` manual à edge function com header `x-cron-secret` → espera 200.
2. `SELECT * FROM cron.job WHERE jobname = 'monitor-org-members-daily'` → confirma agendamento.
3. `SELECT * FROM vw_org_members_recent LIMIT 5` → confirma que retorna dados.
4. Verificar `audit_logs WHERE acao = 'org_member_monitor'` para confirmar o registro da execução manual.
5. Simular cenário warning (se houver org com >3 novos membros nas últimas 24h) e checar `notifications`.

### Arquivos a criar/editar

```text
supabase/functions/monitor-org-members/index.ts   (novo)
supabase/migrations/<timestamp>_monitor_org_members.sql   (novo)
  - CREATE EXTENSION IF NOT EXISTS pg_cron, pg_net
  - CREATE OR REPLACE VIEW vw_org_members_recent (security_invoker)
  - GRANT SELECT na view para authenticated
  - cron.schedule(...) com unschedule prévio idempotente
```

### Pontos de decisão

1. **Severity threshold**: spec diz `> 3` para warning. Confirmo manter exatamente isso.
2. **Destinatário da notificação warning**: spec diz "administrador da organização". Vou notificar **todos** os membros com `role_in_org IN ('owner','admin')` da org afetada. OK?
3. **Janela**: 24h fixas conforme spec; o cron roda 1x/dia então não há sobreposição/duplicação significativa, mas posso adicionar dedupe via `audit_logs` (não criar 2 warnings idênticos no mesmo dia) — recomendo incluir.