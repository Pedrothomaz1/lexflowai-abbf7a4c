# Runbook Operacional — LexFlow

> Versão 1.0 — Maio/2026
> Público: equipe de operação, suporte e segurança LexFlow

---

## 1. Contatos e papéis

| Papel | Responsável | Contato |
|---|---|---|
| Product Owner / Founder | Pedro Thomaz | pedro@lexflowai.com.br |
| Tech Lead | A definir | tech@lexflowai.com.br |
| Security Lead | A definir | security@lexflowai.com.br |
| DPO (LGPD) | A definir | dpo@lexflowai.com.br |
| Suporte ao cliente | Equipe LexFlow | suporte@lexflowai.com.br |
| On-Call (P0/P1) | Rotação | oncall@lexflowai.com.br |

---

## 2. Severidades de incidente

| Sev | Definição | SLA resposta | SLA resolução alvo |
|---|---|---|---|
| **P0** | Indisponibilidade total, vazamento de dados, perda de dados. | 15 min | 4 h |
| **P1** | Funcionalidade crítica quebrada para múltiplos tenants (login, criar contrato). | 1 h | 8 h |
| **P2** | Bug funcional grave em um módulo, sem workaround. | 4 h úteis | 2 dias úteis |
| **P3** | Bug menor, melhoria, dúvida. | 1 dia útil | Sprint |

---

## 3. Resposta a incidente (P0/P1)

1. **Detectar** — alerta automático (monitoring) ou usuário/suporte.
2. **Declarar** — abrir canal de guerra (Slack/WhatsApp), nomear comandante de incidente.
3. **Estabilizar** — rollback do deploy (Lovable: voltar para versão anterior), suspender feature flag, ou suspender organização problemática.
4. **Comunicar** — atualizar status page e e-mail para clientes afetados em até 30 min.
5. **Resolver** — aplicar fix em produção, validar com smoke tests.
6. **Postmortem** — em até 5 dias úteis, documentar causa raiz, timeline e ações corretivas em `docs/postmortems/`.

### 3.1 Vazamento de dados (LGPD)

- Notificar DPO **imediatamente**.
- Identificar escopo (tabelas, organizações, usuários afetados).
- Em até **72 horas**, comunicar à ANPD e aos titulares (LGPD Art. 48).
- Registrar em `compliance_logs`.

---

## 4. Backup e restauração

- Banco: backup automático diário pelo provedor (Lovable Cloud / Supabase), retenção de 7 dias no plano atual.
- Storage (`contratos-documentos`): replicação gerenciada pelo provedor.
- **Teste de restore**: executar **trimestralmente** restaurando para projeto staging.
- **Restore parcial**: para recuperar uma organização específica, exportar via `pg_dump --schema=public --table=...` filtrado por `organization_id`.

---

## 5. Rotinas de manutenção

| Frequência | Tarefa | Responsável |
|---|---|---|
| Diária | Verificar logs de erro de edge functions | Tech Lead |
| Diária | Conferir execução do `job_notificar_vencimentos` | Ops |
| Semanal | Rodar `pre-launch-test-runner` (automatizado) | CI |
| Semanal | Revisar `audit_logs` com `risk_level = 'critical'` | Security |
| Mensal | Revisar `docs/security-checklist.md` | Security Lead |
| Mensal | Conferir lista de Super Admins e membros ativos | Ops |
| Trimestral | Teste de restore de backup | Tech Lead |
| Trimestral | Pentest leve / scanner externo | Security |
| Anual | Revisão completa de RLS e RBAC | Security |

---

## 6. LGPD — atendimento a titulares

| Direito | Procedimento |
|---|---|
| Acesso | Exportar dados do usuário via `profiles`, `user_roles`, `audit_logs`. SLA: 15 dias. |
| Retificação | Usuário pode editar via interface; suporte pode editar campos restritos mediante solicitação por escrito. |
| Exclusão (anonimização) | Executar `gdpr_delete_user(user_id)`. Registra em `compliance_logs`. SLA: 15 dias. |
| Portabilidade | Exportação em JSON via solicitação ao suporte. |
| Revogação de consentimento | Suspender conta + anonimização. |

Toda solicitação é registrada em `compliance_logs` com `base_legal` correspondente.

---

## 7. Gestão de secrets

Secrets vivem em **Lovable Cloud → Secrets** (não no repositório).

| Secret | Uso | Rotação sugerida |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions privilegiadas | A cada incidente ou 12 meses |
| `RESEND_API_KEY` | Envio transacional | 6 meses |
| `WEBHOOK_SECRET` | Validação de webhooks | 6 meses |
| `CRON_SECRET` | Proteção de jobs cron | 6 meses |
| `COMPRAS_API_KEY` | Integração Gest10 | Conforme política do parceiro |
| `LOVABLE_API_KEY` | Lovable AI Gateway | Conforme uso |
| `SECQA_PASSWORD` | Suite de regressão de segurança | A cada execução manual sensível |

Nunca commitar `.env`. Ver `SECURITY.md`.

---

## 8. Onboarding de novo cliente (operacional)

1. Receber confirmação de pagamento.
2. Criar organização via **Super Admin → Criar organização** (ver `MANUAL_SUPER_ADMIN.md`).
3. Emitir NF-e (processo manual atual — automatizar via NFE.io na próxima sprint).
4. Acompanhar primeiro login em 24h; se não ocorrer, ligar para o cliente.
5. Agendar onboarding de 30 min em até 7 dias.

---

## 9. Offboarding de cliente

1. Marcar organização como `suspensa` com motivo.
2. Em 30 dias, exportar dados se solicitado.
3. Após período legal (5 anos para registros fiscais), executar anonimização de membros e arquivamento de contratos.

---

## 10. Referências

- `SECURITY.md` — política de segurança
- `docs/security-checklist.md` — checklist contínuo
- `docs/SECURITY_REPORT.md` — relatório atual
- `MANUAL_SUPER_ADMIN.md` — operação da plataforma
- `MANUAL_DO_USUARIO.md` — uso pelo cliente final
- `DOCUMENTACAO_TECNICA.md` — arquitetura
