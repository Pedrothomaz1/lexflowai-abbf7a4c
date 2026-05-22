
# Auditoria de Segurança — LexFlow

## 1. Função `current_user_org()` — ✅ OK

```sql
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
    AND o.status = 'ativa'
  ORDER BY om.joined_at ASC
  LIMIT 1;
$$;
```

- Lê **exclusivamente** de `auth.uid()` (JWT assinado pelo Supabase).
- Usuário **anon não pode manipular** o retorno: `auth.uid()` é NULL para anônimos → retorna NULL → todas as RLS que comparam `organization_id = current_user_org()` falham.
- `SECURITY DEFINER` + `search_path = public` ⇒ sem risco de hijack via search_path.

---

## 2. UPDATE sem restrição de papel — ⚠️ ATENÇÃO (intencional, mas documentar)

Todas as 7 tabelas têm `UPDATE` permitido a **qualquer membro da org** (apenas `organization_id = current_user_org()`), sem checar `is_admin()` ou papel.

| Tabela | UPDATE qual | DELETE qual | INSERT with_check |
|---|---|---|---|
| `workflow_stages` | `organization_id = current_user_org()` | mesma (sem admin) | `org + ...` |
| `workflow_run_stages` | `organization_id = current_user_org()` | — | `org` |
| `workflow_runs` | `organization_id = current_user_org()` | — | `org + created_by=uid` |
| `document_templates` | `organization_id = current_user_org()` | `+ is_admin()` ✓ | `org + created_by=uid` |
| `template_versions` | `organization_id = current_user_org()` | `+ is_admin()` ✓ | idem |
| `request_forms` | `organization_id = current_user_org()` | `+ is_admin()` ✓ | idem |
| `request_form_versions` | `organization_id = current_user_org()` | `+ is_admin()` ✓ | idem |

**Diagnóstico:**
- `workflow_run_stages` precisa de UPDATE aberto (qualquer aprovador da etapa atualiza status). **Justificado.**
- `workflow_runs` é atualizado pela edge `workflow-advance` (service_role) e por aprovadores. **Justificado.**
- `workflow_stages`, `document_templates`, `template_versions`, `request_forms`, `request_form_versions` são **configurações administrativas** — qualquer analista pode hoje reescrever templates e formulários de toda a org. ⚠️ **Recomenda-se restringir a `is_admin()`** (alinhado ao DELETE que já é admin).

**Correção sugerida (item 8 abaixo).**

---

## 3. `sales_leads` — INSERT anônimo — 🔴 CRÍTICO (sem rate limiting)

- Política: `Public can insert leads` → `roles {anon,authenticated}`, `with_check = true`.
- Validação: feita **apenas dentro das edge functions** `lead-novo-plano` e `lead-enterprise` (nome/email/empresa, length, regex).
- **Mas:** o endpoint `POST /rest/v1/sales_leads` está exposto direto via PostgREST (qualquer um com a anon key faz `INSERT` ilimitado sem passar pela edge function).
- **Rate limiting: NENHUM.** A função `rate-limiter` existe mas não é chamada pelas edges de lead nem protege o endpoint PostgREST.

**Plano de correção (item 8):**
- Remover INSERT direto da política (forçar uso da edge function service_role).
- Adicionar rate limit por IP na edge `lead-novo-plano` / `lead-enterprise` usando a tabela `rate_limits` existente.

---

## 4. Políticas duplicadas — ⚠️ ATENÇÃO

### `security_alerts`
- Sem duplicatas. 4 políticas distintas (SELECT/INSERT/UPDATE/DELETE). ✅

### `uso_sistema` — **DUPLICATA**
- `mt_uso_sistema_service_insert` (INSERT — service_role OR self)
- `service_role_insert_usage` (INSERT — só service_role)

A segunda é **redundante** (já coberta pela primeira). Remover.

```sql
DROP POLICY "service_role_insert_usage" ON public.uso_sistema;
```

---

## 5. Storage — ✅ OK

| Bucket | Público | SELECT sem auth | INSERT sem papel |
|---|---|---|---|
| `contratos-documentos` | Privado | Não (exige `authenticated` + pasta = org/uid) | Não (exige auth + pasta = org/uid) |
| `obligation-evidences` | Privado | Não (exige `auth.uid()` + pasta = org) | Não (exige papel analista/consultoria/admin) |
| `final-packages` | Privado | Não (auth + pasta = org) | Não (apenas service_role) |

Nenhum bucket público, nenhuma política frouxa.

---

## 6. Edge Functions — ⚠️ revisar leads

50 funções listadas. Padrões observados:

- **Públicas por design (sem JWT):** `lead-novo-plano`, `lead-enterprise`, `portal-externo-publico`, `signature-webhook`, `zapsign-webhook`, `criar-portal-contraparte` — todas usam `WEBHOOK_SECRET` ou são endpoints de lead. ⚠️ **Falta rate limit nas duas de lead** (item 3).
- **Webhooks** (`zapsign-webhook`, `signature-webhook`): validam signature/secret. ✅
- **CRON** (`cron-*`, `security-regression-runner`, `pre-launch-test-runner`): validam `CRON_SECRET`. ✅
- **service_role** é usado dentro das edges (correto). **Nunca aparece no frontend** — `rg` em `src/` só achou referência em string descritiva de teste. ✅
- Edges autenticadas (super-admin, gdpr-handler, totp-auth, etc.) chamam `getUser()`/`getClaims()` antes da lógica.

---

## 7. Variáveis de ambiente — ✅ OK

Segredos no projeto: `CRON_SECRET`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `WEBHOOK_SECRET`, `SUPABASE_*` (URL/anon/service_role/jwks), `COMPRAS_API_KEY`, `SECQA_PASSWORD`.

Verificação no frontend (`src/**`):
- **Nenhum uso de `SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `COMPRAS_API_KEY`, `WEBHOOK_SECRET`, `CRON_SECRET`.** ✅
- Frontend usa apenas `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (anon, OK).

---

## Resumo

| Item | Status |
|---|---|
| 1. `current_user_org()` | ✅ OK |
| 2. UPDATE sem papel (workflow/templates/forms) | ⚠️ ATENÇÃO — restringir templates/forms a admin |
| 3. `sales_leads` INSERT anônimo sem rate limit | 🔴 CRÍTICO |
| 4. Política duplicada em `uso_sistema` | ⚠️ ATENÇÃO |
| 5. Storage buckets | ✅ OK |
| 6. Edge functions | ⚠️ Falta rate limit nas edges de lead |
| 7. Variáveis de ambiente | ✅ OK |

---

## 8. Plano de correção (a aplicar se aprovado)

### 8.1 — Migration SQL

```sql
-- (4) Remover política duplicada em uso_sistema
DROP POLICY IF EXISTS "service_role_insert_usage" ON public.uso_sistema;

-- (3) Bloquear INSERT direto de anon em sales_leads
-- (forçar uso das edges com service_role + rate limit)
DROP POLICY IF EXISTS "Public can insert leads" ON public.sales_leads;

-- (2) Restringir UPDATE/INSERT de templates e forms a admin
DROP POLICY IF EXISTS doc_templates_update ON public.document_templates;
CREATE POLICY doc_templates_update ON public.document_templates
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS template_versions_update ON public.template_versions;
CREATE POLICY template_versions_update ON public.template_versions
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS request_forms_update ON public.request_forms;
CREATE POLICY request_forms_update ON public.request_forms
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS request_form_versions_update ON public.request_form_versions;
CREATE POLICY request_form_versions_update ON public.request_form_versions
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin());

-- workflow_stages: configuração estrutural → só admin pode alterar
DROP POLICY IF EXISTS wf_stages_update ON public.workflow_stages;
CREATE POLICY wf_stages_update ON public.workflow_stages
  FOR UPDATE USING (organization_id = current_user_org() AND is_admin());

DROP POLICY IF EXISTS wf_stages_delete ON public.workflow_stages;
CREATE POLICY wf_stages_delete ON public.workflow_stages
  FOR DELETE USING (organization_id = current_user_org() AND is_admin());

-- workflow_runs / workflow_run_stages: mantém aberto a membros (execução)
```

### 8.2 — Rate limit nas edges `lead-novo-plano` e `lead-enterprise`

Helper a ser adicionado (usa a tabela `rate_limits` existente):

```ts
async function checkRateLimit(supabase, ip: string, key: string, max = 5, windowSec = 600) {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { count } = await supabase
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', ip)
    .eq('action', key)
    .gte('window_start', since);
  if ((count ?? 0) >= max) return false;
  await supabase.from('rate_limits').insert({
    identifier: ip, action: key, window_start: new Date().toISOString(),
  });
  return true;
}

const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
if (!(await checkRateLimit(supabase, ip, 'lead-submit', 5, 600))) {
  return json({ ok: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, 200);
}
```

Aplicado em `lead-novo-plano/index.ts` e `lead-enterprise/index.ts` logo após instanciar o client `service_role`, antes do `INSERT`.

### 8.3 — Validar que o frontend ainda envia leads via edge

Buscar usos de `.from('sales_leads').insert(...)` no `src/` — se houver, refatorar para `supabase.functions.invoke('lead-novo-plano', ...)`.

---

**Aprovar este plano** para que eu aplique a migration + edits nas 2 edges. Itens ⚠️ menores (políticas de workflow stages/templates restritas a admin) podem ser separados se preferir manter UPDATE aberto.
