# Análise do Projeto — LexFlow

> Atualizado: Maio/2026

LexFlow é um SaaS B2B de gestão preventiva de contratos, fornecedores, obrigações e franquias, construído sobre Lovable Cloud (Supabase gerenciado) com frontend React + Vite + TypeScript.

Documento canônico de arquitetura: `DOCUMENTACAO_TECNICA.md` (raiz do projeto).

## Pontos-chave

- **Multi-tenant estrito** via `organization_id` + RLS (`current_user_org()`).
- **RBAC** com `app_role`, `user_roles`, `permissions` e `role_permissions`.
- **Super Admins** globais (`super_admins`) operam a plataforma.
- **Edge Functions** (25+) cobrem onboarding, segurança, IA, integrações e cron.
- **Storage privado** com URLs assinadas para anexos de contrato.
- **Auditoria** completa via `audit_logs` (risk_level, event_category) + `compliance_logs` para LGPD.

## Documentos complementares

- `docs/architecture/recommended-approach.md` — padrões e decisões recomendadas.
- `docs/framework/tech-stack.md` — versões e bibliotecas.
- `docs/framework/coding-standards.md` — convenções de código.
- `docs/framework/source-tree.md` — layout de pastas.
- `docs/PRE_LAUNCH_TEST_SPEC.md` — especificação de testes de pré-venda.
- `docs/SECURITY_REPORT.md` — postura atual de segurança.

> Versões anteriores deste arquivo continham material de template de terceiros não aplicável ao LexFlow e foram removidas em Maio/2026.
