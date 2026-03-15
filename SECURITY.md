# Security Notes

This project relies on environment variables and Supabase RLS for data protection. **Do not commit real secrets** to the repository.

## Key practices

- Keep `.env` files local only; they are intentionally ignored by Git.
- Use **Supabase anon keys** on the frontend only. Never expose service-role keys in client code.
- Rotate any keys that may have been exposed and update your deployment secrets.
- Ensure Row Level Security (RLS) policies remain enabled for all tenant-scoped tables.

## Reporting

If you find a potential security issue, rotate affected keys immediately and review audit logs.
# LexFlowAI - Guia de Segurança

Este documento descreve as práticas de segurança obrigatórias para desenvolvedores trabalhando no projeto LexFlowAI.

---

## Gestão de Segredos

### Regra #1: Nunca commitar .env

O arquivo `.env` contém valores sensíveis e **NUNCA** deve ser commitado no repositório.

- ✅ O arquivo `.env` já está no `.gitignore`
- ⚠️ **NUNCA** remova `.env` do `.gitignore`
- 📋 Use `.env.example` como referência para as variáveis necessárias

### Regra #2: Usar apenas anon key no frontend

A `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) é **segura** para uso no frontend.

```typescript
// ✅ CORRETO - anon key no frontend
import { supabase } from "@/integrations/supabase/client";
```

### Regra #3: SERVICE_ROLE_KEY apenas no backend

A `SUPABASE_SERVICE_ROLE_KEY` tem acesso total ao banco de dados e **NUNCA** deve ser exposta no client.

```typescript
// ❌ ERRADO - nunca fazer isso no frontend
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORRETO - usar apenas em Edge Functions
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

### Regra #4: Rotação de chaves em caso de exposição

Se uma chave for acidentalmente exposta (commit, log, screenshot):

1. **Imediatamente** acesse Lovable Cloud > Secrets
2. Rotacione a chave comprometida
3. Atualize todos os ambientes que usam a chave
4. Revise logs de acesso para atividade suspeita
5. Documente o incidente no canal de segurança

### Regra #5: RLS obrigatório em tabelas sensíveis

Todas as tabelas com dados sensíveis **DEVEM** ter Row Level Security (RLS) habilitado.

---

## Variáveis de Ambiente

### Chaves Públicas (Frontend)

Podem ser usadas no código client-side:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (pública) |
| `VITE_SUPABASE_URL` | URL do projeto |

### Chaves Privadas (Backend)

**APENAS** em Edge Functions via Lovable Cloud > Secrets:

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso total ao banco |
| `RESEND_API_KEY` | Envio de emails |
| `WEBHOOK_SECRET` | Validação de webhooks |
| `CRON_SECRET` | Autenticação de jobs agendados |

---

## Row Level Security (RLS)

### Tabelas que exigem RLS

O sistema usa isolamento multi-tenant via `organization_id`:

| Tabela | Tipo de Dados |
|--------|---------------|
| `contratos` | Contratos e documentos |
| `fornecedores` | Dados de fornecedores |
| `franquias` | Informações de franquias |
| `profiles` | Dados de usuários |
| `audit_logs` | Logs de auditoria |
| `contract_attachments` | Anexos sensíveis |
| `organization_members` | Membros da organização |

### Verificação de políticas

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Listar políticas existentes
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

---

## Checklist de Segurança

Antes de cada deploy, verifique:

- [ ] `.env` não está no commit
- [ ] Nenhuma chave privada no código frontend
- [ ] RLS habilitado em novas tabelas
- [ ] Políticas RLS testadas
- [ ] Edge Functions usando secrets do Lovable Cloud
- [ ] Logs não expõem dados sensíveis
- [ ] Inputs sanitizados (DOMPurify)

---

## Reportando Vulnerabilidades

Se você identificar uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Documente o problema com detalhes
3. Contate o responsável de segurança da equipe
4. Aguarde confirmação antes de qualquer divulgação

---

*Última atualização: 2026-02-04*
