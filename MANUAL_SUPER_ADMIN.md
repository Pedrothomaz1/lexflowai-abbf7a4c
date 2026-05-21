# Manual do Super Admin — LexFlow

> Versão 1.0 — Maio/2026
> Público: equipe operacional/founders da LexFlow

O Super Admin é o papel global da plataforma (acima das organizações). Ele libera novos clientes, gerencia planos, suspende organizações inadimplentes e roda rotinas de manutenção.

---

## 1. Quem é Super Admin

- Identificados na tabela `super_admins` (não confundir com `administrador` de uma organização).
- Hoje: `pedrothomaz1@gmail.com` (founder).
- A função `is_super_admin(user_id)` é a fonte de verdade. RLS específicas dão acesso global a `organizations`, `super_admins`, métricas SaaS, etc.

---

## 2. Acessar o painel

1. Faça login normalmente em `https://lexflowai.com.br`.
2. Como super admin, você verá no menu lateral a entrada **"Super Admin"** (rota `/super-admin`).
3. As abas disponíveis: **Organizações**, **Métricas**, **Auditoria global**, **Configurações da plataforma**.

---

## 3. Liberar um novo cliente (fluxo manual atual)

Enquanto o checkout automático Stripe não está ativo, a liberação é manual:

1. Receber confirmação de pagamento (PIX/boleto/transferência).
2. Em **Super Admin → Organizações → Criar organização**:
   - Informar **nome**, **CNPJ**, **plano** (free / pro / business / enterprise).
   - Informar o **e-mail do primeiro administrador** (owner) do cliente.
3. O sistema dispara um **convite por e-mail** para o owner.
4. O owner cria a conta e é vinculado automaticamente à organização com o papel `owner` + `administrador`.
5. O plano define o `max_usuarios`:
   - `free`: 1 / `pro`: 5 / `business`: 30 / `enterprise`: ilimitado.

> Edge function relevante: `super-admin-create-client-org`.

---

## 4. Gerir organizações

### 4.1 Aprovar organização
- Use `approve_organization(org_id)` ou o botão na lista. Muda status para `ativa`.

### 4.2 Suspender (inadimplência, abuso)
- Use `suspend_organization(org_id, motivo)`.
- Membros ficam impedidos de logar; dados permanecem intactos.

### 4.3 Reativar
- Aprovação novamente via botão ou RPC.

### 4.4 Mudar plano
- Edição direta do campo `plano` na tabela `organizations`. O trigger `sync_org_max_usuarios` atualiza `max_usuarios` automaticamente.

---

## 5. Gerir Super Admins

- `promote_super_admin_by_email(email)` — promove um usuário existente.
- `revoke_super_admin_by_email(email)` — remove (você não pode se auto-remover).
- `list_super_admins()` — lista todos.

> Mantenha sempre ao menos **2 super admins** ativos para evitar lockout.

---

## 6. Monitoramento e auditoria

- **Auditoria global**: tabela `audit_logs`. Filtro por organização, usuário, ação, nível de risco.
- **Métricas SaaS**: MRR, churn, contagem de orgs ativas por plano (em construção — depende de Stripe).
- **Login attempts**: tabela `login_attempts` — útil para investigar bloqueios.
- **Edge function logs**: acessíveis pelo painel do backend (Lovable Cloud).

---

## 7. Rotinas operacionais

| Frequência | Ação |
|---|---|
| Diária (cron) | `job_notificar_vencimentos` — gera alertas de contratos vencendo em até 30 dias. |
| Diária (cron) | `cleanup_old_rate_limits` — limpa entradas > 24h. |
| Semanal | `pre-launch-test-runner` (GitHub Actions) — registra resultado em `pre_launch_test_runs`. |
| Sob demanda | `security-regression-runner` — executa suite de regressão de segurança com usuários SECQA. |
| Mensal | Revisar `docs/SECURITY_REPORT.md` e `docs/security-checklist.md`. |

---

## 8. Backup, incidente e LGPD

Consulte `docs/runbook-operacional.md` para procedimentos detalhados de:
- Restauração de backup do banco.
- Resposta a incidente de segurança (P0/P1/P2).
- Atendimento a solicitações LGPD (exportação, exclusão, retificação) — use `gdpr_delete_user(user_id)` para anonimização.

---

## 9. Boas práticas

- Nunca compartilhe a `SUPABASE_SERVICE_ROLE_KEY`. Ela só vive em edge functions.
- Toda criação manual de organização deve ter contrato assinado e NF emitida.
- Registre decisões de suspensão/reativação no campo `motivo_suspensao` e em ata interna.
