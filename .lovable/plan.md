# Página pública de planos (`/planos`)

Página de vendas pública que exibe os planos vigentes (puxados de `plan_pricing`) e captura leads para liberação manual pelo Super Admin.

## Objetivo

- Ter uma URL compartilhável (`lexflowai.com.br/planos`) para enviar a prospects.
- Mostrar preços sempre atualizados (sem hardcode — fonte é `plan_pricing`).
- Capturar leads qualificados (nome, empresa, CNPJ, e-mail, telefone, plano de interesse) e notificar a equipe.
- Fechar o loop: lead chega → Super Admin cria org → e-mail D+0 dispara (fluxo de onboarding já implementado).

## Escopo

Inclui:
- Rota pública `/planos` (sem auth, indexável pelo Google).
- Tabela de comparação dos 4 planos (free, pro, business, enterprise) com preços de `plan_pricing`.
- CTA "Quero contratar" abre modal com formulário de lead.
- Tabela `sales_leads` para registrar contatos (multi-tenant não se aplica — é dado de plataforma).
- Edge function `lead-novo-plano` que insere o lead e dispara e-mail para `pedrothomaz1@gmail.com` (founder) + e-mail de confirmação para o lead.
- Aba "Leads" no Super Admin para acompanhar a fila (novo, em contato, convertido, descartado) e botão "Criar organização" que pré-preenche o formulário existente.
- Link "Ver planos" no header da landing (`/`) e no rodapé.
- SEO: title, meta description, JSON-LD `Product` para cada plano.

Fora de escopo:
- Checkout automático Stripe/Paddle (continua manual).
- Trial self-service.
- Cupons/descontos.

## Layout da página

```text
┌───────────────────────────────────────────────────────────┐
│ Header (logo + Entrar)                                    │
├───────────────────────────────────────────────────────────┤
│  Hero: "Planos pensados para quem decide"                 │
│  "Comece grátis. Evolua quando o time crescer."           │
├───────────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                  │
│  │ Free  │ │ Pro   │ │ Busi. │ │ Enter.│  (4 cards)       │
│  │ R$ 0  │ │ R$497 │ │ R$1497│ │ Sob   │                  │
│  │ 1 usr │ │ 5 usr │ │30 usr │ │medida │                  │
│  │ [CTA] │ │ [CTA] │ │ [CTA] │ │ [CTA] │                  │
│  └───────┘ └───────┘ └───────┘ └───────┘                  │
│  Card "Pro" destacado (badge "Mais escolhido")            │
├───────────────────────────────────────────────────────────┤
│  Tabela comparativa de recursos (linhas: contratos,       │
│  alertas, IA, suporte, SLA — colunas: planos)             │
├───────────────────────────────────────────────────────────┤
│  FAQ curta (4-6 perguntas) + CTA final                    │
└───────────────────────────────────────────────────────────┘
```

Modal de lead:
- Campos: nome, e-mail, telefone, empresa, CNPJ (com autofill via API que já existe), nº usuários estimados, plano de interesse (preenchido conforme card clicado), mensagem opcional.
- Submit → toast de sucesso, fecha modal, mostra mensagem "Entraremos em contato em até 1 dia útil".

## Detalhes técnicos

**Banco** (1 migration):
- Tabela `sales_leads`: `id`, `nome`, `email`, `telefone`, `empresa`, `cnpj`, `usuarios_estimados`, `plano_interesse`, `mensagem`, `status` (`novo`/`em_contato`/`convertido`/`descartado`), `assigned_to`, `converted_org_id`, `created_at`, `updated_at`, `notas`.
- RLS: insert público (anon role) permitido; select/update apenas `is_super_admin(auth.uid())`.
- Trigger `update_updated_at_column`.

**Edge functions**:
- `lead-novo-plano` (público, `verify_jwt = false`): valida payload com Zod, insere em `sales_leads` via service role, envia 2 e-mails Resend (interno + confirmação). Rate-limit por IP (5/h) usando `rate_limits`.

**Frontend**:
- `src/pages/Planos.tsx` — rota pública.
- `src/components/Planos/PlanCard.tsx`, `ComparisonTable.tsx`, `LeadDialog.tsx`.
- `src/pages/SuperAdmin/LeadsTab.tsx` — fila de leads + ação "Criar organização" (abre `ClientOrgForm` pré-preenchido) e "Marcar como convertido".
- Adicionar `<TabsTrigger value="leads">Leads</TabsTrigger>` em `SuperAdmin/index.tsx`.
- Adicionar rota pública em `App.tsx` + link no header de `Index.tsx`.
- Liberar `/planos` no `public/robots.txt` (já é `Allow: /` por padrão, só garantir que não está bloqueado).

**SEO**:
- `<title>Planos e preços | LexFlow</title>`
- Meta description com preço inicial.
- JSON-LD `Product` + `Offer` por plano.

## Critérios de aceite

1. `/planos` carrega sem auth e mostra preços de `plan_pricing` (mudar valor no banco reflete na página).
2. Submeter o formulário cria registro em `sales_leads` e dispara os 2 e-mails.
3. Super Admin vê o lead na aba "Leads" e consegue convertê-lo em organização em 1 clique.
4. Página passa em Lighthouse SEO ≥ 90.
