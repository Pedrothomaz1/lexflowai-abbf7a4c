# Documentação Técnica — LexFlow

> Versão 2.0 — Maio/2026
> Substitui versões anteriores (fev/2026 e anteriores).

LexFlow é um SaaS B2B de **gestão preventiva de contratos, fornecedores, obrigações e franquias**, voltado a gestores executivos (não-jurídicos). Este documento descreve a arquitetura técnica, modelo multi-tenant, segurança e principais fluxos de backend.

---

## 1. Stack

- **Frontend**: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + Framer Motion.
- **Backend**: Lovable Cloud (Supabase gerenciado) — PostgreSQL + Auth + Storage + Edge Functions (Deno).
- **IA**: Lovable AI Gateway (Gemini 2.5 / GPT-5 family).
- **E-mail**: Resend (`RESEND_API_KEY`).
- **Hosting**: Lovable (preview, staging e produção em `lexflowai.com.br`).
- **CI/Testes**: Vitest + Testing Library + GitHub Actions (suite de pre-launch).

Detalhes em `docs/framework/tech-stack.md`, `docs/framework/coding-standards.md`, `docs/framework/source-tree.md`.

---

## 2. Modelo multi-tenant

Multi-tenancy **estrito** baseado em `organization_id` + Row-Level Security.

### 2.1 Entidades-chave

| Tabela | Função |
|---|---|
| `organizations` | Tenant. Campos: `nome`, `cnpj`, `plano` (free/pro/business/enterprise), `status` (ativa/suspensa), `max_usuarios`. |
| `organization_members` | Vínculo `user_id ↔ organization_id` com `role_in_org` (owner/admin/membro/consultoria). |
| `organization_invites` | Convites por e-mail com `token` e `expires_at`. |
| `user_roles` | Papel de aplicação (`app_role`) por usuário e organização — usado pelas RLS. |
| `super_admins` | Usuários globais da plataforma (operação LexFlow). |
| `profiles` | Dados de perfil; criado via trigger `handle_new_user` no signup. |

### 2.2 Funções SECURITY DEFINER

- `current_user_org()` — retorna a organização ativa do usuário autenticado (a mais antiga ativa).
- `has_role(user_id, role)` — checa papel dentro da org atual.
- `has_permission(user_id, permission)` — via `role_permissions`.
- `is_admin()`, `is_org_admin(user, org)`, `is_org_owner(user, org)`, `belongs_to_org(user, org)`.
- `is_super_admin(user_id)` — global.
- `accept_organization_invite(token)`, `check_pending_invite_for_user()`.
- `approve_organization(org_id)`, `suspend_organization(org_id, motivo)`.
- `promote_super_admin_by_email(email)`, `revoke_super_admin_by_email(email)`, `list_super_admins()`.

### 2.3 RLS — padrão

Todas as tabelas de domínio (contratos, fornecedores, serviços, franquias, obrigações, notifications, audit_logs, etc.):

```sql
USING (organization_id = current_user_org())
```

Para edge functions com service role, padrão de bypass:

```sql
USING (
  organization_id = current_user_org()
  OR auth.jwt() ->> 'role' = 'service_role'
)
```

### 2.4 Triggers críticas

- `handle_new_user` (auth.users → profiles) — criação automática de profile no signup.
- `audit_trigger_func` — popula `audit_logs` com risk_level e event_category.
- `create_contract_version` — versionamento automático de contratos em UPDATE.
- `trg_novo_contrato_fn`, `trg_contrato_status_change_fn`, `trg_nova_obrigacao_fn` — notificações.
- `sync_org_max_usuarios` — sincroniza limite de usuários ao mudar plano.
- `generate_contract_request_number` — numeração `REQ-YYYY-NNNNNN`.

---

## 3. Autenticação

- **Apenas e-mail + senha** (sem social login). Senha mínima 12 caracteres.
- Sessão em `localStorage` (constraint conhecida do projeto).
- Convites validados **no servidor** (`accept_organization_invite`) — token nunca decide vinculação no cliente.
- 2FA opcional (`user_2fa_settings`); papéis com `mfa_requirements.is_required = true` são obrigados.
- Rate-limit de tentativas em `login_attempts` + `is_login_blocked()`.
- Reset de senha: tela detecta sessão de recuperação no mount.

---

## 4. RBAC

Tabelas: `app_role` (enum), `user_roles`, `permissions`, `role_permissions`.

Papéis principais:
- `administrador` — gestão completa da org.
- `analista_juridico` — CRUD de contratos/fornecedores/obrigações.
- `consultoria_juridica` — leitura + pareceres.
- (visualizador via `role_permissions`).

Frontend usa hooks `useRoles` e `usePermissions`. Restrições de menu (`MainSidebar`) impedem itens admin-only para não-admins.

---

## 5. Edge Functions (resumo)

> 25+ funções. Pasta: `supabase/functions/`. Estilo: validação dentro retorna **HTTP 200** com `{ success: false, error }` para não quebrar o fluxo do cliente; somente erros realmente excepcionais retornam 4xx/5xx.

Categorias principais:

- **Organização e onboarding**: `super-admin-create-client-org`, `create-organization-invite`, `accept-organization-invite`.
- **Segurança**: `security-regression-runner`, `pre-launch-test-runner`.
- **Notificações**: `send-finance-payment-report`, e-mails de convite/welcome.
- **Integrações**: `gest10-compras-sync` (API Gest10).
- **IA**: análise de contrato (Lovable AI Gateway).
- **Cron**: `job_notificar_vencimentos` (chamada por scheduler externo com `CRON_SECRET`).

---

## 6. Storage

- Bucket **privado** `contratos-documentos`.
- Acesso via **URL assinada** de curta duração (nunca pública).
- Path convencional: `{organization_id}/{contrato_id}/{filename}`.
- Múltiplos anexos por contrato (ver memory `contract-multi-attachments`).

---

## 7. Design system

- Cores em **HSL** definidas em `src/index.css` e `tailwind.config.ts`.
- Tokens semânticos: `--primary`, `--background`, `--accent`, etc. Verde/mustard como cores principais da marca.
- Tipografia: Inter.
- Grid 8pt, radius 20px.
- Separação visual por módulo: mostarda para franquias, verde para contratos/serviços.

---

## 8. Branding e SEO

- Domínio: `lexflowai.com.br` (com `www`).
- Ícone da marca: `Scale` (lucide). Sem referências legadas a "Veridiana".
- SEO: tags Open Graph + JSON-LD em `index.html` e landing.
- `robots.txt` restringe rotas internas; CSP em `_headers`.

---

## 9. Observabilidade

- `audit_logs` — toda ação relevante (insert/update/delete) com `risk_level` e `event_category`.
- `login_attempts` — para investigação de incidentes de auth.
- `compliance_logs` — eventos LGPD.
- Edge function logs via painel Lovable Cloud.
- Status check do backend via `cloud_status`.

---

## 10. Pré-venda — automação de testes

- `pre-launch-test-runner` (edge function) + GitHub Actions semanal.
- Persiste resultado em `pre_launch_test_runs`.
- UI em `/security` → aba "Pré-Venda".
- Especificação completa em `docs/PRE_LAUNCH_TEST_SPEC.md`.

---

## 11. Segurança — referências

- `SECURITY.md` — política e responsible disclosure.
- `docs/security-checklist.md` — checklist contínuo.
- `docs/security-readiness.md` — checklist pré-produção.
- `docs/SECURITY_REPORT.md` — relatório atual.

---

## 12. Limitações conhecidas

- PostgREST OpenAPI desativado (constraint de plataforma) — clientes consomem via SDK gerado.
- Sessão em `localStorage` (não httpOnly) — mitigado por CSP e CSRF stateless.
- NF-e ainda manual (na roadmap: NFE.io / eNotas).
- Stripe/Paddle ainda não integrado — onboarding manual via Super Admin.

---

## 13. Roadmap técnico curto prazo

1. Integração Stripe + webhook `super-admin-create-client-org`.
2. Migração de e-mails para domínio `lexflowai.com.br` no Resend.
3. NF-e automática.
4. Status page pública.
5. Documentação por edge function em `docs/api-docs/`.
