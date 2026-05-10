# Cadastro com aprovação manual + Painel Super-Admin

Toda nova organização nasce **bloqueada** até você aprovar. Você ganha um painel só seu para gerenciar todas as empresas do LexFlow.

---

## 1. Banco de dados

**Tabela `organizations` — novos campos:**
- `status` (`pendente_aprovacao` | `ativa` | `suspensa` | `cancelada`) — padrão: `pendente_aprovacao`
- `aprovada_em` (timestamp) e `aprovada_por` (uuid)
- `motivo_suspensao` (texto, opcional)

**Tabela nova `super_admins`:**
- Lista de e-mails/user_ids que podem acessar o painel global (só você no início).
- Função `is_super_admin(user_id)` SECURITY DEFINER para checagem.

**Função `current_user_org()` atualizada:**
- Retorna apenas organizações com `status = 'ativa'`.
- Resultado: usuário de org pendente/suspensa **não enxerga nenhum dado** (RLS bloqueia tudo automaticamente).

**Backfill:**
- As 2 orgs existentes sem dono real (PHARMALINDY, FlowGenAI) ficam `pendente_aprovacao`.
- Sua org (Empresa B) já entra como `ativa`.

---

## 2. Bloqueio no acesso

**`ProtectedRoute.tsx`:**
- Após checar sessão e MFA, busca o `status` da organização do usuário.
- Se `pendente_aprovacao` → redireciona para `/aguardando-aprovacao`.
- Se `suspensa` → redireciona para `/conta-suspensa`.
- Se `ativa` → libera normalmente.

**Páginas novas:**
- `/aguardando-aprovacao` — mensagem "Cadastro recebido, nossa equipe vai liberar seu acesso em breve" + botão de logout + dados da empresa cadastrada.
- `/conta-suspensa` — "Sua conta está suspensa. Entre em contato." + dados de contato.

---

## 3. Painel Super-Admin (`/super-admin`)

Rota protegida por `is_super_admin()`. Layout em abas:

**Aba "Organizações"** — tabela com:
- Nome, CNPJ, status (badge colorido), data de cadastro, nº de usuários, último acesso.
- Filtros: status, busca por nome/CNPJ.
- Ações por linha: **Aprovar**, **Suspender**, **Reativar**, **Excluir**, **Ver detalhes**.

**Aba "Usuários globais"** — todos os usuários de todas as orgs:
- E-mail, nome, organização, papel, último login.
- Útil para suporte ("o cliente X não consegue entrar").

**Aba "Métricas"** — cards simples:
- Total de organizações ativas, pendentes, suspensas.
- Novos cadastros nos últimos 7/30 dias.
- MRR estimado (pode ficar para depois quando tiver billing).

---

## 4. Notificações por e-mail

**Para você (super-admin):**
- Edge function dispara e-mail toda vez que uma nova organização é criada: "Nova empresa aguardando aprovação: [nome] (CNPJ X) — [link para o painel]".

**Para o cliente:**
- Quando você aprova: e-mail "Sua conta no LexFlow foi liberada — acesse aqui".
- Quando você suspende: e-mail "Sua conta foi suspensa — motivo: [...]".

Reaproveita o `RESEND_API_KEY` que já existe.

---

## 5. RLS e segurança

- Todas as policies de `organizations` ganham checagem extra: super-admin enxerga tudo, usuário comum só enxerga a própria.
- `super_admins` tem RLS estrita: só o próprio super-admin lê/edita.
- Edge function `aprovar-organizacao` valida que quem chama é super-admin antes de mudar o status.
- Audit log registra toda aprovação/suspensão (quem, quando, por quê).

---

## 6. Tratamento dos 3 usuários atuais

- **pedrothomaz1@gmail.com** (Empresa B) → mantém como super-admin + org ativa.
- **pedro.thomaz@veridianaquirino.com.br** (PHARMALINDY) → org vira `pendente_aprovacao` (você decide depois se aprova).
- **pedro@porveri.com.br** (FlowGenAI) → idem.

Os dois últimos passam a ver a tela "Aguardando aprovação" no próximo login.

---

## 7. Detalhes técnicos

```text
Backend
├── migration: add status/super_admins/is_super_admin/update current_user_org
├── edge fn: aprovar-organizacao (status → ativa, dispara e-mail)
├── edge fn: suspender-organizacao (status → suspensa, dispara e-mail)
├── edge fn: notificar-nova-organizacao (chamada após signup)
└── trigger: ao criar organização, chama notificar-nova-organizacao

Frontend
├── pages/AguardandoAprovacao.tsx
├── pages/ContaSuspensa.tsx
├── pages/SuperAdmin/
│   ├── index.tsx (layout + abas)
│   ├── OrganizacoesTab.tsx
│   ├── UsuariosTab.tsx
│   └── MetricasTab.tsx
├── hooks/useSuperAdmin.ts
├── components/ProtectedRoute.tsx (+ check de status)
└── App.tsx (+ rotas /super-admin, /aguardando-aprovacao, /conta-suspensa)
```

Caminho de migração futuro para **trial automático + Stripe**: basta acrescentar status `trial` + data de expiração; o resto da arquitetura (status + bloqueio + painel) já estará pronto.
