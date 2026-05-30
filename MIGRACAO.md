# Plano de Migração — Lovable Cloud → Supabase próprio

> **Objetivo:** tornar o LexFlowAI independente da Lovable, rodando em um projeto
> Supabase controlado por você, com frontend publicado em hospedagem própria
> (homologação + produção).
>
> **Decisões já tomadas:**
> - Banco **começa do zero** (sem migrar dados existentes — só o schema).
> - Conta própria no **supabase.com** já existe.
> - Módulos em uso: **IA de contratos**, **WhatsApp (Evolution)**, **Sistema de compras**.
> - **Não** usam assinatura eletrônica (ZapSign) → funções ZapSign ficam desativadas.

---

## Visão geral: o que é "Lovable Cloud"

O Lovable Cloud **não é um banco próprio** — é uma camada de gestão **em cima do
Supabase**. O app hoje conecta em `https://dxllojjazxizuylbmezc.supabase.co`
(projeto Supabase real, gerido pela Lovable). Migrar = recriar esse backend em um
projeto Supabase **seu**, e apontar o app para ele.

O que já está versionado no repositório (ótimo para a migração):
- **146 migrations SQL** em `supabase/migrations/` → recriam o banco inteiro do zero.
- **58 Edge Functions** em `supabase/functions/` → deploy no projeto novo.
- **`supabase/config.toml`** → configuração de verify_jwt por função.

O que **não** está no repo (e por isso "começar do zero" simplifica): os **dados
reais** (contratos, usuários, fornecedores) vivem só no banco do Lovable.

---

## Fase 1 — Subir o esqueleto (banco vazio + app local)

**Meta:** app rodando localmente, login por e-mail/senha funcionando, telas abrindo,
apontando para o Supabase novo.

1. **Criar projeto novo** em supabase.com → anotar:
   - Project URL (`https://<novo-ref>.supabase.co`)
   - `anon`/`publishable key` (Settings → API)
2. **Instalar a Supabase CLI** (na máquina de vocês): `npm i -g supabase`
3. **Linkar e aplicar o schema** (recria todas as tabelas/RLS do zero):
   ```bash
   supabase login
   supabase link --project-ref <novo-ref>
   supabase db push        # aplica as 146 migrations
   ```
4. **Trocar o `.env`** do frontend para o projeto novo:
   ```
   VITE_SUPABASE_URL="https://<novo-ref>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="<anon key do projeto novo>"
   VITE_SUPABASE_PROJECT_ID="<novo-ref>"
   ```
5. **Rodar:** `npm run dev` → criar uma conta por e-mail/senha → validar que
   dashboard e telas principais abrem.

> ⚠️ Como o banco está vazio, será preciso criar a primeira organização e o primeiro
> usuário super-admin. Verificar se há uma migration/seed que cria isso, ou criar
> manualmente via SQL (a definir na execução da fase).

**Resultado da Fase 1:** app funcional no básico, **sem** IA e integrações ainda.

---

## Fase 2 — Google OAuth (no Supabase novo)

Só depois que o projeto novo está de pé. Passo a passo:

1. **Google Cloud Console** → APIs e Serviços → Credenciais → ID do cliente OAuth
   (Aplicativo da Web). Em "URIs de redirecionamento autorizados", usar a URL do
   **projeto novo**:
   ```
   https://<novo-ref>.supabase.co/auth/v1/callback
   ```
   Copiar **Client ID** e **Client Secret** (o secret começa com `GOCSPX-...`).
2. **Supabase (projeto novo)** → Authentication → Providers → Google → ativar e
   colar Client ID + Secret.
3. **Supabase** → Authentication → URL Configuration → Redirect URLs → adicionar:
   ```
   http://localhost:8080/auth/callback
   https://<dominio-homologacao>/auth/callback
   https://<dominio-producao>/auth/callback
   ```
   (O código já chama `signInWithOAuth` redirecionando para `/auth/callback` —
   implementado no commit de OAuth nativo.)

> O Client Secret nunca vai no código nem no chat — só no painel do Supabase.

---

## Fase 3 — IA e integrações (uma de cada vez)

### 3a. Eliminar a dependência da IA da Lovable ⭐ (parte central de "sair do Lovable")

A `LOVABLE_API_KEY` é usada por 5 funções, apontando para
`https://ai.gateway.lovable.dev/v1/chat/completions`. **Boa notícia:** esse endpoint
é **compatível com a API da OpenAI** (`/v1/chat/completions`), então a troca é
mecânica — mudar URL base + chave + nome do modelo.

Funções afetadas: `analisar-contrato`, `extrair-dados-pdf`, `auth-email-hook`,
`handle-email-suppression` (verificar uso real em cada uma).

Opções de substituição:
- **Gemini próprio** (já usado por outras 5 funções via `GEMINI_API_KEY`) —
  consolida tudo num provedor só. Chave grátis no Google AI Studio.
- **OpenAI próprio** — troca mais direta (mesmo formato de payload).

### 3b. IA Gemini (já no padrão certo)

`GEMINI_API_KEY` é usada por `analisar-contrato-ia`, `ia-extrair-campos`,
`ia-redline-sugerir`, `ia-resumo-executivo`, `ia-sugerir-clausulas`.
→ Gerar chave no **Google AI Studio** e cadastrar como secret no Supabase novo.

### 3c. WhatsApp (Evolution API) — em uso

Função `enviar-notificacao-whatsapp`. Precisa de 3 secrets:
`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`
→ pegar do painel da instância Evolution de vocês.

### 3d. Sistema de compras — em uso

Funções `enviar-solicitacao-compras`, `testar-conexao-compras`. Secret:
`COMPRAS_API_KEY` → do fornecedor do sistema de compras.

### 3e. Secrets internos (você mesmo gera)

`CRON_SECRET`, `WEBHOOK_SECRET`, `SECQA_PASSWORD` → valores aleatórios que você
inventa (ex.: `openssl rand -hex 32`) e cadastra no Supabase novo.

### 3f. Desativar o que não se usa

ZapSign (assinatura eletrônica) não é usado → as 5 funções `zapsign-*` /
`signature-webhook` podem ser **não deployadas** ou marcadas para ignorar. Sem
precisar de `ZAPSIGN_API_TOKEN` / `ZAPSIGN_WEBHOOK_SECRET` / `WEBHOOK_SECRET`
(rever este último, compartilhado com `signature-webhook`).

### Deploy das Edge Functions

```bash
supabase functions deploy <nome-da-funcao>     # uma a uma, ou
supabase functions deploy                       # todas
# Secrets:
supabase secrets set GEMINI_API_KEY=...
supabase secrets set EVOLUTION_API_URL=... EVOLUTION_API_KEY=... EVOLUTION_INSTANCE_NAME=...
# etc.
```

---

## Fase 4 — Homologação online (staging) + Produção

1. **Publicar o frontend** em Vercel / Netlify / Cloudflare Pages (qualquer um
   aceita Vite). Build: `npm run build`, saída: `dist/`.
2. Configurar as variáveis `VITE_*` na hospedagem (apontando pro Supabase novo).
3. **Ambiente separado:** o ideal é ter **dois projetos Supabase** —
   `lexflow-homolog` e `lexflow-prod` — para não testar em cima dos dados reais.
   (Pode-se começar com um só e separar depois.)
4. Adicionar os domínios de cada ambiente nas **Redirect URLs** do Supabase
   (Fase 2, passo 3) e no Google Console.

---

## Mapa de secrets (referência rápida)

| Secret | Para quê | Em uso? | Origem |
|---|---|---|---|
| `GEMINI_API_KEY` | IA (5 funções `ia-*`) | ✅ Sim | Google AI Studio |
| `LOVABLE_API_KEY` | IA via Lovable (5 funções) | 🔁 Substituir | → Gemini/OpenAI próprio |
| `EVOLUTION_API_URL/KEY/INSTANCE_NAME` | WhatsApp | ✅ Sim | Painel Evolution |
| `COMPRAS_API_KEY` | Sistema de compras | ✅ Sim | Fornecedor de compras |
| `CRON_SECRET` | Jobs agendados (11 funções) | ✅ Sim | Você gera |
| `WEBHOOK_SECRET` | Webhooks | ⚠️ Rever | Você gera |
| `SECQA_PASSWORD` | Testes de segurança internos | ⚙️ Opcional | Você gera |
| `ZAPSIGN_API_TOKEN` / `ZAPSIGN_WEBHOOK_SECRET` | Assinatura eletrônica | ❌ Não usa | — (desativar) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Acesso interno das funções | ✅ Auto | Painel do projeto novo |

---

## Riscos e cuidados

- **Sem rollback de dados:** como começamos do zero, não há dados para perder, mas a
  primeira organização/super-admin precisa ser criada manualmente.
- **RLS:** as policies vêm nas migrations; validar que o isolamento por
  `organization_id` continua funcionando no projeto novo (testar com 2 contas).
- **Edge Functions com `verify_jwt`:** conferir `config.toml` no deploy — algumas
  funções públicas (webhooks, cron) usam `verify_jwt = false`.
- **Fazer por fases:** não deployar tudo de uma vez. Validar Fase 1 antes da 2, etc.
