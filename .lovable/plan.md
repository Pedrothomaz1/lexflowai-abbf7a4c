# Plano: Painel Super Admin redesenhado + Onboarding por e-mail (7 dias)

Duas entregas conectadas: você passa a **enxergar e operar todos os clientes em um painel executivo** (MRR, status, ativação em 1 clique) e os novos clientes recebem uma **sequência automática de e-mails nos primeiros 7 dias** para acelerar adoção e reduzir churn no trial.

---

## Parte 1 — Painel Super Admin (redesign executivo)

Hoje existe `/super-admin` com 4 abas funcionais mas visualmente cruas. Vamos transformar a aba principal em um **dashboard de comando** com cards de KPI grandes, gráfico de crescimento, tabela densa de clientes e ações instantâneas.

### KPIs no topo (cards visuais)

```text
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   MRR       │  Clientes   │   Trial     │   Churn 30d │
│ R$ 12.450   │   24 ativos │   5 expir.  │     2       │
│ ▲ +18%      │   ▲ +3 mês  │   em 7 dias │   1.2%      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- **MRR** = soma de `preço do plano × organizações ativas`. Tabela de preços nova: `plan_pricing` (plano → valor mensal). Você edita os preços direto na UI.
- **Clientes ativos** com delta vs mês anterior.
- **Trial expirando** = orgs com `trial_ends_at` nos próximos 7 dias.
- **Churn 30d** = % de orgs suspensas/canceladas no período.

### Tabela "Clientes" (visão única)

Substitui a aba Organizações atual por uma tabela mais informativa:

| Cliente | Plano | MRR | Status | Membros | Último login | Ações |
|---|---|---|---|---|---|---|
| Empresa X | Pro | R$ 497 | 🟢 Ativa | 8/10 | 2h atrás | ⋯ |

Ações em 1 clique no menu `⋯` ou inline:
- **Ativar** (se pendente)
- **Suspender** (abre dialog com motivo)
- **Reativar** (se suspensa)
- **Trocar plano** (dropdown inline)
- **Ver detalhes** (drawer lateral com tudo da org)
- **Acessar como** (impersonation — abre sessão da org em nova aba) — *opcional, marca como TODO se quiser revisar segurança antes*

Filtros no topo: busca, status, plano. Ordenação por MRR / data / nome.

### Gráfico de crescimento

Linha simples (recharts) com novos clientes / MRR ao longo dos últimos 6 meses. Coloca contexto visual no que a tabela mostra.

### Drawer de detalhes do cliente

Ao clicar em um cliente, abre painel lateral com:
- Dados da empresa (nome, CNPJ, plano, status, datas)
- Lista de membros e roles
- Métricas de uso (nº contratos, fornecedores, último login)
- Histórico de mudanças (ativações, suspensões, trocas de plano)
- Botão "Enviar e-mail para o admin" (manual)

---

## Parte 2 — Onboarding por e-mail (7 dias)

Sequência automática que dispara quando uma organização é criada. Todos os e-mails são personalizados com nome do admin + nome da empresa + link contextual.

### Cronograma da sequência

| Dia | E-mail | Objetivo |
|---|---|---|
| **0** (na hora) | "Bem-vindo ao LexFlow, {nome}" | Confirmar acesso + 3 primeiros passos (cadastrar 1ª empresa, 1º fornecedor, 1º contrato). CTA: entrar. |
| **1** | "Cadastre seu primeiro contrato em 3 minutos" | Tutorial curto com vídeo/print + link direto. |
| **3** | "Dica: receba alertas antes do vencimento" | Mostrar o módulo de alertas + WhatsApp + sino. |
| **5** | "Como sua equipe aproveita melhor o LexFlow" | Convidar membros + permissões + papéis. |
| **7** | "Como está sendo até aqui?" | Pedido de feedback + link para falar com suporte / agendar call. |

### Como funciona por baixo

- Tabela nova `onboarding_email_log` (organization_id, user_id, email, step 0–7, sent_at, status). Garante idempotência — cada passo só vai 1 vez por org.
- Cron diário novo `cron-onboarding-emails` roda 09:00 BRT, varre orgs ativas criadas nos últimos 7 dias, e para cada uma envia o e-mail correspondente ao dia (D+0, D+1, D+3, D+5, D+7) que ainda não foi enviado.
- Templates HTML branded LexFlow (paleta verde/mostarda, mesma do app, fundo branco). Cada e-mail tem rodapé com link de descadastro do onboarding (não desliga alertas operacionais).
- E-mail D+0 é disparado **na hora** ao criar a org (via `super-admin-create-client-org` que já existe), os demais ficam por conta do cron.
- Usa o `RESEND_API_KEY` já configurado (mesma infra dos outros e-mails).

### Controle do dono da plataforma (você)

Na aba "Onboarding" do Super Admin:
- Ver quem está em qual passo da sequência.
- Pré-visualizar cada template.
- Pausar/reativar a sequência inteira (kill switch).
- Reenviar manualmente um passo específico para um cliente.

---

## Detalhes técnicos

### Banco de dados

- **`plan_pricing`** — `plano` (PK), `nome_exibicao`, `preco_mensal_centavos`, `ativo`. Seed: free=0, pro=49700, enterprise=149700. RLS: leitura para autenticados, escrita só super admin.
- **`onboarding_email_log`** — `id`, `organization_id`, `user_id`, `email`, `step` (0,1,3,5,7), `sent_at`, `status`, `error_message`. Unique em (org, step). RLS: super admin only.
- **`onboarding_settings`** — single-row config: `enabled` (kill switch global). RLS: super admin only.
- Função `calculate_mrr()` retorna soma de preço × orgs ativas por plano.

### Edge functions

- **`cron-onboarding-emails`** (nova) — roda 09:00 BRT diário. Para cada org elegível, monta e envia template via Resend e grava log.
- **`super-admin-create-client-org`** (existente) — adicionar dispatch do e-mail D+0 ao final.
- **`super-admin-toggle-org-status`** (nova) — wrap das ações ativar/suspender/reativar com auditoria.

### Frontend

- `src/pages/SuperAdmin/DashboardTab.tsx` — nova aba "Dashboard" como default, com KPIs + gráfico + tabela compacta de top clientes.
- `src/pages/SuperAdmin/ClientesTab.tsx` — substitui `OrganizacoesTab` (tabela densa + filtros + drawer de detalhes + ações 1-clique).
- `src/pages/SuperAdmin/OnboardingTab.tsx` — nova aba com lista de orgs × progresso da sequência + preview de templates + kill switch.
- `src/pages/SuperAdmin/PrecosTab.tsx` — nova aba para editar `plan_pricing` (você ajusta preços e o MRR recalcula).
- `src/components/SuperAdmin/ClientDrawer.tsx` — drawer lateral com detalhes do cliente.
- `src/components/SuperAdmin/KpiCard.tsx` — card de KPI reutilizável com delta e ícone.
- `src/components/SuperAdmin/MrrChart.tsx` — gráfico recharts de evolução.

### Estética (skill frontend-design aplicada)

- Layout: dashboard estilo "comando" — KPIs grandes em grid 4-col no desktop, 2-col no mobile.
- Tipografia: heading Sora/Manrope (já no design system), números MRR em destaque tabular (`font-variant-numeric: tabular-nums`).
- Cor: verde primário LexFlow para "saudável" (ativa, crescendo), mostarda para "atenção" (trial expirando, pendente), vermelho para "ação urgente" (suspensa, churn).
- Microinteração: cards de KPI com hover sutil (shadow lift), badges de status com bolinha pulsante para "ativa".
- Densidade: tabela com linhas de 56px, zebra leve, ações inline aparecem no hover da linha (não poluem o estado padrão).
- Drawer: slide-in da direita com 480px de largura, conteúdo organizado em seções colapsáveis.

### Fora de escopo

- Cobrança real / Stripe / Paddle — MRR é **calculado** a partir do plano configurado, não vem de gateway. Quando ativar pagamento, o valor vira fonte de verdade.
- Página pública de planos — continua fora.
- Impersonation ("acessar como cliente") — listado como TODO, implementamos só se você quiser depois (precisa revisão de segurança).
