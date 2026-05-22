# Plano: Painel do Dono do SaaS + Onboarding por E-mail

Você quer operar como dono de um SaaS multi-tenant: enxergar todos os clientes em um lugar, ativar/cortar acesso rápido, e dar boas-vindas automáticas pra cada cliente novo. Hoje já existe um Painel Super Admin básico (`/super-admin`) e funções de aprovar/suspender. Esta entrega completa o que falta.

## O que será entregue

### 1. Painel Super Admin reforçado (`/super-admin`)
Aprimorar as abas existentes (Organizações, Usuários, Métricas):

- **Métricas executivas (nova versão da aba)**: cards com Total de clientes, Ativos, Em trial, Suspensos, Receita mensal estimada (MRR baseada no plano de cada org), Usuários totais, Novas nos últimos 7/30 dias, Clientes inativos (sem login há 30+ dias).
- **Breakdown por plano**: quantos clientes em Free, Pro, Business, Enterprise — com receita estimada por faixa.
- **Aba "Saúde dos clientes"** (nova): tabela ordenável com último login do admin, nº de contratos cadastrados nos últimos 30 dias, status (engajado / em risco / inativo). Pra você bater na porta antes do cliente cancelar.
- **Aba Organizações melhorada**: filtros por plano e status, busca por nome/CNPJ, ações em 1 clique (aprovar, suspender, reativar, mudar plano), e botão "Reenviar convite" caso o admin não tenha aceitado ainda.

### 2. Fluxo de boas-vindas automatizado por e-mail
Quando uma organização passa para status `ativa`, o sistema dispara automaticamente:

- **E-mail 1 — Boas-vindas (imediato)**: confirma ativação, link de login, credenciais do primeiro admin, prazos do plano contratado.
- **E-mail 2 — Primeiros passos (D+1)**: tutorial de 5 passos (cadastrar fornecedor, criar primeiro contrato, convidar equipe, configurar workflow, ver alertas).
- **E-mail 3 — Check-in (D+7)**: pergunta como está sendo a experiência, link pra suporte.

Disparado por trigger de banco + cron diário (já temos `cron-lexflow-diario`), tudo via Resend (já configurado).

### 3. Logs de envio + reenvio manual
- Tabela `onboarding_emails_log` com status (enviado/falhou) por organização.
- Botão "Reenviar e-mail de boas-vindas" na aba Organizações pra você forçar reenvio se o cliente não recebeu.

## Como vai funcionar na sua rotina (linguagem leiga)

1. **Cliente paga** (você confirma manualmente o pagamento por enquanto).
2. **Você abre `/super-admin` → Organizações** → encontra a organização (ou cria via "+ Nova Organização Cliente" que já existe) → clica **Aprovar**.
3. **Sistema dispara automaticamente**: e-mail de boas-vindas pro admin do cliente, com link e instruções.
4. **Nos dias seguintes**, sistema manda os e-mails de tutorial e check-in sem você fazer nada.
5. **Toda semana**, você abre o painel **Métricas** pra ver MRR, novos clientes, quem está inativo.
6. **Se um cliente atrasar pagamento**: 1 clique em **Suspender** corta o acesso. 1 clique em **Reativar** devolve.

## Detalhes técnicos

### Banco de dados (1 migration)
- `onboarding_emails_log`: registra cada e-mail enviado (org_id, tipo, status, sent_at, error_msg).
- Trigger `on_organization_activated` na tabela `organizations`: quando `status` muda para `ativa` e o e-mail de boas-vindas ainda não foi enviado, agenda o envio.
- View `super_admin_health_view`: agrega último login por org (via `auth.users.last_sign_in_at` do admin principal) + contagem de contratos recentes.

### Edge functions (3 novas)
- `enviar-email-boas-vindas`: envia o e-mail #1 (imediato após ativação). Chamada via trigger HTTP do banco.
- `processar-onboarding-followup`: roda dentro do `cron-lexflow-diario` (já existe). Busca orgs com 1 dia e 7 dias de ativação e dispara e-mails #2 e #3.
- Aproveitar `super-admin-create-client-org` já existente — sem mudanças.

### Frontend
- Reescrever `MetricasTab.tsx` com MRR e breakdown por plano.
- Nova aba `SaudeClientesTab.tsx`.
- Adicionar filtros + ações extras em `OrganizacoesTab.tsx`.
- Templates de e-mail em HTML inline dentro das edge functions (sem dependência externa).

### Segurança
- Toda RPC e edge function exige `is_super_admin(auth.uid())`.
- `onboarding_emails_log` com RLS: só super admin lê.
- E-mails enviados via Resend com domínio `lexflowai.com.br` (já configurado).

## Fora de escopo desta entrega
- Cobrança automática (Stripe/Paddle).
- Página pública de planos (`/precos`).
- Trial automático (hoje você ativa manualmente; trial vira evolução futura).
- Página de status pública / SLA dashboard.

## Estimativa
~1 sessão de implementação. Entregue em 3 commits: migration, edge functions, frontend.
