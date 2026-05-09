# Plano: Transformar LexFlow em SaaS vendável

Entrega completa dos 4 gaps. Vou separar em **4 fases** para você poder validar cada uma antes de seguir.

---

## Fase 1 — Onboarding "Criar minha empresa" (wizard com plano)

A página `/onboarding` já existe, mas pede só nome+slug. Vamos transformá-la em **wizard de 3 passos** e adicionar CNPJ + escolha de plano.

**Passos do wizard:**
1. **Empresa** — Nome, CNPJ (com validação Receita via edge function existente), telefone, cidade/estado.
2. **Seu papel** — Cargo, departamento (opcional, vai pra `profiles`).
3. **Plano** — 4 cards lado a lado:
   - **Free** — 1 usuário · R$ 0 · trial 14 dias dos recursos Pro
   - **Pro** — 5 usuários · (preço definido depois no Stripe)
   - **Business** — 30 usuários · (preço definido depois)
   - **Enterprise** — ilimitado · "Falar com vendas" (abre modal com formulário que dispara email via Resend)

Após confirmar:
- Cria `organizations` (com `plano`, `max_usuarios`, `cnpj`)
- Vincula como `owner` em `organization_members`
- Atribui role `administrador` em `user_roles`
- Se plano pago → redireciona para checkout Stripe (Fase 3)
- Se Free → redireciona direto para `/dashboard`

**Mudanças extras:**
- `App.tsx`: novo usuário sem org → forçar `/onboarding` (não mais `/waiting-for-invite`).
- `WaitingForInvite` vira tela secundária acessada apenas via link de convite pendente.

---

## Fase 2 — Painel Super-Admin LexFlow

**Modelo:** nova role `super_admin` em `app_role`. Diferente das outras roles, ela é **global** (sem `organization_id`) e dá bypass do `current_user_org()` nas rotas `/admin/*`.

### Mudanças de banco
- Adicionar `'super_admin'` ao enum `app_role`.
- Função `is_super_admin(_user_id)` SECURITY DEFINER.
- Nova policy em `organizations`, `organization_members`, `audit_logs`, `profiles`: super_admin pode SELECT global (sem filtro de org).
- Tabela `platform_metrics` (snapshot diário de uso por org: contratos criados, usuários ativos, storage usado).
- Tabela `organization_status` (`active`, `suspended`, `trial`, `cancelled`) + coluna `trial_ends_at`, `suspended_at`, `suspended_reason` em `organizations`.

### Novas páginas (rotas `/admin/*`, protegidas por `requireSuperAdmin`)
- `/admin` — dashboard com KPIs (clientes ativos, MRR estimado, novos signups 30d, churn).
- `/admin/clientes` — listagem de todas as organizations com filtros (plano, status, MRR), busca por nome/CNPJ. Ações: ver detalhes, suspender, reativar, mudar plano manualmente, impersonate (gera token temporário pra você logar como admin daquela org pra suporte).
- `/admin/clientes/:id` — detalhe da org: dados, membros, métricas de uso (gráfico 30d), histórico de pagamentos, audit logs daquela org.
- `/admin/financeiro` — receita por mês, lista de invoices Stripe, churn, LTV.
- `/admin/leads` — formulários "Falar com vendas" do plano Enterprise.

### Layout
- Layout `AdminLayout` separado do `DashboardLayout` (header preto/dourado pra diferenciar visualmente: "você está no modo plataforma").
- Item "Painel LexFlow" no dropdown do usuário só aparece se `super_admin`.

---

## Fase 3 — Billing Stripe (built-in Lovable)

### Setup
- Habilitar Stripe payments via tool `enable_stripe_payments` (você preenche email/business no formulário).
- Criar 3 produtos via `batch_create_product` após habilitar:
  - Pro mensal/anual
  - Business mensal/anual
  - (Enterprise é manual, sem produto)

### Banco
- Tabela `subscriptions` (organization_id, stripe_customer_id, stripe_subscription_id, plano, status, current_period_end, cancel_at_period_end).
- Tabela `invoices` (subscription_id, stripe_invoice_id, valor, status, paid_at, hosted_invoice_url).
- Trigger: ao criar `subscription` com plano X → atualizar `organizations.plano` e `max_usuarios`.

### Edge functions
- `create-checkout-session` — cria Stripe Customer (se não existir) + checkout session, retorna URL.
- `create-portal-session` — abre Stripe Billing Portal (cliente gerencia cartão, cancela, baixa invoice).
- `stripe-webhook` — processa eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Atualiza `subscriptions` + `organizations.plano`.

### UI
- `/organization/billing` — plano atual, próximo vencimento, botão "Gerenciar assinatura" (abre portal Stripe), histórico de invoices, botão "Mudar plano" (upgrade/downgrade).
- Ao atingir `max_usuarios` → bloquear convites + CTA "Faça upgrade".
- Banner global se `subscription.status = past_due` ou `trial_ends_at` < 3 dias.

### Tax handling Stripe (decisão necessária)
Recomendo **opção 2 (Tax calculation only)** para LexFlow: Stripe calcula ICMS/ISS no checkout, você emite NF e faz a apuração. +0.5% por transação. Confirma na hora de habilitar.

---

## Fase 4 — Subdomínio por cliente (white-label)

**Modelo:** `empresaA.lexflowai.com.br` resolve para a mesma app, mas força contexto da org A no login.

### Pré-requisitos manuais (você faz)
1. No registrador (Lovable ou outro): criar **wildcard DNS** `*.lexflowai.com.br` → `185.158.133.1`.
2. Em Project Settings → Domains: adicionar wildcard como custom domain (Lovable provisiona SSL wildcard).

### Banco
- Coluna `subdomain` em `organizations` (única, `[a-z0-9-]+`, valida no onboarding).

### Frontend
- Hook `useSubdomain()` lê `window.location.hostname` e extrai o subdomínio.
- Se acessar `empresaA.lexflowai.com.br` → no `/auth`, força que o email logado pertença à org com `subdomain='empresa-a'`. Se não pertence → erro "Esta conta não tem acesso a esta empresa".
- Tela de login "personalizada": logo da org no topo, cores da org (campo `cor_primaria` em `organizations`).
- Domínio raiz `lexflowai.com.br` continua funcionando como hoje (landing + login genérico).

### Backend
- Edge function `validate-subdomain-access` chamada no login: confirma se `user.id` pertence à org do subdomínio.

**Limitação importante:** wildcard SSL em domínio `.com.br` exige validação DNS específica — pode levar 24h para Lovable provisionar. Se der problema, alternativa é usar `*.lexflowai.lovable.app` (subdomínio Lovable, não custom).

---

## Ordem de execução recomendada

```text
Fase 1 (Onboarding)          ────►  ~1 sessão de chat
   │
Fase 2 (Super-Admin)          ────►  ~2 sessões  (mais código)
   │
Fase 3 (Billing Stripe)       ────►  ~2 sessões  (precisa habilitar Stripe primeiro)
   │
Fase 4 (Subdomínio)           ────►  ~1 sessão + DNS manual
```

Cada fase termina **funcional e testada** — você pode parar entre fases sem deixar nada quebrado.

---

## Detalhes técnicos (referência)

**Tabelas novas:** `subscriptions`, `invoices`, `platform_metrics`, `organization_status` (ou colunas em `organizations`), `enterprise_leads`.

**Colunas novas em `organizations`:** `subdomain`, `cor_primaria`, `logo_url` (já existe), `trial_ends_at`, `suspended_at`, `suspended_reason`, `stripe_customer_id`.

**Enum:** `app_role` ganha `'super_admin'`.

**Edge functions novas:** `create-checkout-session`, `create-portal-session`, `stripe-webhook`, `impersonate-organization`, `validate-subdomain-access`, `enterprise-lead-notification`.

**RLS:** todas as tabelas novas com `organization_id` seguem o padrão multi-tenant. `subscriptions` e `invoices` têm policy adicional permitindo `super_admin` ver tudo.

**Secrets necessários:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (vêm automaticamente ao habilitar Stripe built-in).

---

## Confirmação antes de implementar

Vou começar pela **Fase 1**. Confirma e eu implemento o wizard de onboarding com os 4 planos (Free 1 / Pro 5 / Business 30 / Enterprise sob consulta). As fases 2, 3 e 4 viram tarefas separadas depois.