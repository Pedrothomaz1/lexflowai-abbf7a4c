# Prontidão de segurança para venda — LexFlow

Documento vivo. Cada item lista o controle, onde ele está implementado e o teste
automatizado que o cobre (`supabase/functions/_security_tests/`).

## 1. Multi-tenant (isolamento por organização)

| Controle | Implementação | Teste |
|---|---|---|
| RLS `organization_id = current_user_org()` em todas as tabelas de domínio | políticas `mt_*` | `rls_tables.test.ts` |
| Storage `contratos-documentos` por pasta de org | policies `storage_org_*` | `rls_storage.test.ts` |
| `realtime.messages` com RLS `authenticated`-only | migration `20260509205506_*` | `rls_realtime.test.ts` |
| Edge functions filtram por `organization_id` antes de notificar | `enviar-valores-contrato`, `analisar-contrato`, `extrair-dados-pdf` | `edge_auth.test.ts` |

## 2. Autenticação & RBAC

| Controle | Implementação | Teste |
|---|---|---|
| Email/senha (12+ chars, HIBP recomendado) | Supabase Auth | manual |
| Roles em tabela separada (`user_roles`) com `has_role`/`has_any_role` | migrations RBAC | `rls_tables.test.ts` |
| Admin self-deletion bloqueado | `useUserManagement` | manual |
| MFA opcional por papel (`mfa_requirements`) | `is_mfa_required_for_user` | manual |

## 3. Edge Functions

| Função | Controle | Teste |
|---|---|---|
| `rate-limiter` | exige JWT, role server-side | `edge_auth.test.ts` |
| `security-alert-handler` | exige JWT + admin | `edge_auth.test.ts` |
| `enviar-notificacao-whatsapp` | valida JWT real | `edge_auth.test.ts` |
| `anomaly-detector` | exige `CRON_SECRET` (sem fallback) | `edge_auth.test.ts` |
| `analisar-contrato` / `extrair-dados-pdf` | bloqueia `fileUrl` cross-org | `edge_auth.test.ts` |
| `consultar-cnpj` | erros genéricos no cliente | `edge_auth.test.ts` |

## 4. Auditoria & Compliance LGPD

- `audit_logs` com `risk_level` + `event_category`, leitura admin-only.
- `compliance_logs` para eventos LGPD (acesso, alteração, anonimização).
- `gdpr_delete_user(uuid)` anonimiza dados pessoais e registra `erasure_request`.
- `data_retention_policies` define janelas de retenção por entidade.
- Triggers `audit_trigger_func` registram CRUD em tabelas críticas.

## 5. Segredos & Headers

- Service Role usado apenas em edge functions; nunca no frontend.
- `_headers` com CSP estrita; `robots.txt` bloqueia áreas autenticadas.
- `LOVABLE_API_KEY` rotacionável via tooling Lovable.
- Sem `.env` no repositório.

## 6. Backup & Disaster Recovery

- Backups gerenciados pelo Lovable Cloud (PITR).
- Procedimento documentado em `incident_playbooks` (recurso interno).

## 7. OWASP Top 10 (2021) — mapping

| Categoria | Controle principal |
|---|---|
| A01 Broken Access Control | RLS + RBAC + testes desta suíte |
| A02 Cryptographic Failures | TLS gerenciado + `mask_pii()` para PII |
| A03 Injection | Cliente tipado supabase-js, sem SQL dinâmico |
| A04 Insecure Design | Modelo multi-tenant explícito + memórias `mem://security/*` |
| A05 Security Misconfig | Scanner Lovable + linter Supabase contínuos |
| A06 Vulnerable Components | `bun audit` + `dependency_scan` |
| A07 Auth Failures | `login_attempts`, `is_login_blocked`, MFA opcional |
| A08 Software/Data Integrity | `arquivo_hash` em contratos, `audit_logs` imutável (sem UPDATE/DELETE) |
| A09 Logging Failures | `audit_logs` + `compliance_logs` + `security_alerts` |
| A10 SSRF | edge functions só chamam APIs allow-listed (ReceitaWS, Resend, etc.) |

## 8. Próximos passos recomendados antes da venda

- Pentest manual por terceiro independente.
- Revisão jurídica do termo de uso e política de privacidade.
- Habilitar HIBP no Auth (1 toggle).
- Configurar SIEM externo consumindo `audit_logs` via webhook.
