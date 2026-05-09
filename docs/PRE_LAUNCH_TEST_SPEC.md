# LexFlow — Spec de Testes Pré-Venda

> Bateria oficial de **48 testes** de segurança e vazamento de dados executados antes de liberar o produto para venda corporativa.
> Cada teste tem ID estável (ex.: `1.2`), instrução de execução, evidência esperada e critério de aprovação.
> Resultados são registrados na tabela `pre_launch_test_runs` e visíveis na aba **Pré-Venda** do painel `/security`.

---

## Como usar este documento

1. Abra `/security` → aba **Pré-Venda** (apenas administradores).
2. Para cada teste, execute conforme instrução, anexe a evidência em `docs/test-evidence/<id>-<slug>.{png,json,md}` e marque o status no painel.
3. Status possíveis: `pending` (não rodado), `passed` (aprovado), `failed` (precisa correção), `skipped` (não aplicável).
4. Lançamento só é liberado quando **0 testes em `failed`** e **0 testes críticos em `pending`**.

---

## Frente 1 — Autenticação & Sessão

### 1.1 — Login com credenciais válidas
- **Como executar**: `bunx vitest run src/__tests__/auth-flow.test.ts` ou login manual.
- **Evidência**: log do teste verde + screenshot da home autenticada.
- **Aprovado se**: sessão criada, JWT presente em `localStorage`.

### 1.2 — Bloqueio após 5 tentativas falhas
- **Como executar**: tentar login com senha errada 5x para o mesmo email; consultar `SELECT public.is_login_blocked('email@x.com');`.
- **Evidência**: JSON do retorno + screenshot da mensagem de bloqueio.
- **Aprovado se**: 6ª tentativa retorna bloqueio, função retorna `true`.

### 1.3 — Política de senha
- **Como executar**: tentar cadastrar senhas fracas (`123456`, `senha123`).
- **Evidência**: screenshot da validação rejeitando.
- **Aprovado se**: mínimo 12 chars + complexidade exigida.

### 1.4 — Reset de senha
- **Como executar**: solicitar reset, abrir email, definir nova senha, tentar reusar o link.
- **Evidência**: capturas das 3 etapas + tentativa de reuso.
- **Aprovado se**: link válido apenas 1 vez, expira em 1h.

### 1.5 — MFA obrigatório para administradores
- **Como executar**: login como `administrador` com `mfa_requirements.is_required = true`.
- **Evidência**: screenshot da tela de TOTP.
- **Aprovado se**: app exige código TOTP antes de liberar acesso.

### 1.6 — Logout invalida sessão
- **Como executar**: copiar token, fazer logout, tentar requisição autenticada com token antigo.
- **Evidência**: curl mostrando 401.
- **Aprovado se**: token rejeitado server-side.

### 1.7 — Account enumeration
- **Como executar**: tentar login com email inexistente vs existente com senha errada.
- **Evidência**: comparação das mensagens.
- **Aprovado se**: mensagem genérica idêntica nos dois casos.

### 1.8 — Refresh token rotation
- **Como executar**: forçar refresh, capturar novo token, reutilizar o antigo.
- **Evidência**: logs de auth.
- **Aprovado se**: refresh token antigo invalidado.

---

## Frente 2 — Autorização & Multi-tenancy

### 2.1 — RLS por tabela (35 tabelas)
- **Como executar**: aba **Regressão** → botão **Executar suíte**.
- **Evidência**: JSON de retorno do `security-regression-runner`.
- **Aprovado se**: todos os testes verdes.

### 2.2 — Cross-tenant SELECT
- **Como executar**: `supabase--test_edge_functions` com `pattern: "rls_tables"`.
- **Evidência**: log do Deno test.
- **Aprovado se**: 0 linhas retornadas para org alheia.

### 2.3 — Cross-tenant INSERT forjado
- **Como executar**: como user de Org A, tentar `INSERT` em `contratos` com `organization_id` da Org B.
- **Evidência**: erro RLS no console.
- **Aprovado se**: insert bloqueado.

### 2.4 — Cross-tenant UPDATE
- **Como executar**: tentar `UPDATE` em registro de outra org via ID conhecido.
- **Evidência**: `.maybeSingle()` retornando null.
- **Aprovado se**: 0 linhas afetadas.

### 2.5 — IDOR em rotas de detalhe
- **Como executar**: navegar para `/contratos/<id-de-outra-org>`.
- **Evidência**: screenshot 404/403.
- **Aprovado se**: nada vazado.

### 2.6 — Privilege escalation horizontal
- **Como executar**: como `analista_juridico`, tentar `UPDATE user_roles SET role='administrador' WHERE user_id=auth.uid()`.
- **Evidência**: erro RLS.
- **Aprovado se**: bloqueado.

### 2.7 — Privilege escalation vertical
- **Como executar**: admin de Org A tenta agir em Org B.
- **Evidência**: log da suíte.
- **Aprovado se**: `is_admin_of_org` retorna false.

### 2.8 — Edge functions validam JWT
- **Como executar**: suíte `edge_auth.test.ts`.
- **Evidência**: log dos testes.
- **Aprovado se**: 401 sem Bearer em todas as fns sensíveis.

### 2.9 — `user_id` derivado do token
- **Como executar**: chamar `registrar-aceite-lgpd` com body `{user_id: "uuid-falso"}`.
- **Evidência**: registro em `compliance_logs` com `user_id` do JWT.
- **Aprovado se**: body ignorado, JWT vence.

### 2.10 — `role_permissions` somente service_role
- **Como executar**: como admin, tentar INSERT/UPDATE/DELETE em `role_permissions`.
- **Evidência**: erro RLS.
- **Aprovado se**: bloqueado para todos exceto service_role.

---

## Frente 3 — Vazamento de Dados

### 3.1 — Storage privado exige signed URL
- **Como executar**: copiar URL pública de arquivo em `contratos-documentos` e tentar acessar.
- **Evidência**: 403.
- **Aprovado se**: só signed URL funciona.

### 3.2 — Realtime scoped por usuário/org
- **Como executar**: subscribe em `user:<outro-uuid>` autenticado como user A.
- **Evidência**: nenhum payload recebido.
- **Aprovado se**: canal vazio.

### 3.3 — API responses sem campos sensíveis
- **Como executar**: `GET /profiles`, `GET /user_roles` via REST.
- **Evidência**: JSON sem hash/token/refresh.
- **Aprovado se**: 0 campos de credencial.

### 3.4 — Logs sem segredos
- **Como executar**: buscar `CRON_SECRET`, `Bearer ey`, `password` em logs Supabase.
- **Evidência**: prints com 0 ocorrências.
- **Aprovado se**: nenhum match.

### 3.5 — Erros sem stack trace
- **Como executar**: forçar 500 em edge function.
- **Evidência**: response body.
- **Aprovado se**: mensagem genérica, sem stack.

### 3.6 — CORS revisado
- **Como executar**: auditar `corsHeaders` de todas edge fns.
- **Evidência**: tabela função × origem permitida.
- **Aprovado se**: lista revisada e aprovada.

### 3.7 — Headers de segurança
- **Como executar**: `curl -I https://lexflowai.com.br` e [securityheaders.com](https://securityheaders.com).
- **Evidência**: relatório.
- **Aprovado se**: grade A.

### 3.8 — PII masking ativo
- **Como executar**: logar como role sem `view_pii`, abrir cadastro de fornecedor.
- **Evidência**: screenshot dos campos mascarados.
- **Aprovado se**: CPF/CNPJ/email mascarados.

### 3.9 — Export respeita tenant
- **Como executar**: exportar relatório como user de Org A.
- **Evidência**: arquivo gerado.
- **Aprovado se**: 0 dados de outras orgs.

---

## Frente 4 — Injeção & Input Validation

### 4.1 — SQLi em busca
- **Como executar**: payloads `' OR 1=1--`, `'; DROP TABLE--` em campos de busca.
- **Evidência**: response sem erro de SQL.
- **Aprovado se**: tratado como string literal.

### 4.2 — XSS armazenado
- **Como executar**: `<script>alert(1)</script>` em observações.
- **Evidência**: screenshot do texto renderizado escapado.
- **Aprovado se**: nenhum alert.

### 4.3 — XSS refletido
- **Como executar**: payload em query param.
- **Evidência**: response.
- **Aprovado se**: escapado.

### 4.4 — SSRF
- **Como executar**: passar `http://169.254.169.254/` para integrações.
- **Evidência**: bloqueio.
- **Aprovado se**: rejeitado.

### 4.5 — Upload malicioso
- **Como executar**: subir `.exe` renomeado para `.pdf`, EICAR, arquivo > 50MB.
- **Evidência**: bloqueio.
- **Aprovado se**: rejeitado por tipo/tamanho.

### 4.6 — Path traversal
- **Como executar**: requisitar `../../etc/passwd` em download.
- **Evidência**: 404/403.
- **Aprovado se**: bloqueado.

### 4.7 — Validação Zod em todas edge fns
- **Como executar**: `rg "z\\.object" supabase/functions/`.
- **Evidência**: lista função × schema.
- **Aprovado se**: 100% das fns POST/PUT têm schema.

---

## Frente 5 — Compliance LGPD

### 5.1 — Aceite imutável
- **Como executar**: tentar `UPDATE compliance_logs`.
- **Evidência**: erro RLS.
- **Aprovado se**: bloqueado.

### 5.2 — Direito de acesso (Art. 18)
- **Como executar**: chamar `gdpr-handler` com `action=export`.
- **Evidência**: JSON com dados do user.
- **Aprovado se**: dados retornados em < 15 dias.

### 5.3 — Direito de exclusão (Art. 18)
- **Como executar**: `SELECT public.gdpr_delete_user('<uuid>');`.
- **Evidência**: profile anonimizado, log gravado.
- **Aprovado se**: dados removidos/anonimizados.

### 5.4 — Logs de consentimento completos
- **Como executar**: inspecionar 1 registro recente em `compliance_logs`.
- **Evidência**: JSON.
- **Aprovado se**: contém IP, UA, versão dos termos, timestamp.

### 5.5 — Política de retenção
- **Como executar**: verificar cron `daily-compliance-check`.
- **Evidência**: logs.
- **Aprovado se**: rodando diariamente.

### 5.6 — DPA disponível
- **Como executar**: verificar `docs/legal/DPA.md`.
- **Evidência**: arquivo publicado.
- **Aprovado se**: doc revisado por jurídico.

---

## Frente 6 — Infra & Operação

### 6.1 — Pentest externo
- **Como executar**: contratar HackerOne / Cobalt / empresa local.
- **Evidência**: relatório assinado em PDF.
- **Aprovado se**: 0 críticas / 0 highs em aberto.

### 6.2 — DAST automatizado
- **Como executar**: OWASP ZAP em staging.
- **Evidência**: relatório HTML.
- **Aprovado se**: 0 highs.

### 6.3 — SAST no CI
- **Como executar**: Semgrep + ESLint security em pipeline.
- **Evidência**: badge verde.
- **Aprovado se**: 0 highs.

### 6.4 — Dependency scan
- **Como executar**: `bun audit --production` (ou painel Lovable).
- **Evidência**: log.
- **Aprovado se**: 0 highs/criticals.

### 6.5 — Secret scanning no repo
- **Como executar**: `gitleaks detect`.
- **Evidência**: log.
- **Aprovado se**: 0 segredos.

### 6.6 — Backup restore drill
- **Como executar**: restaurar backup em ambiente isolado e validar dados.
- **Evidência**: doc com timestamps.
- **Aprovado se**: RTO < 4h, RPO < 24h documentado.

---

## Frente 7 — Monitoring & Resposta

### 7.1 — Alertas funcionando
- **Como executar**: simular 6 logins falhos consecutivos.
- **Evidência**: alerta em `security_alerts` + email.
- **Aprovado se**: alerta gerado em < 5min.

### 7.2 — Canal de disclosure público
- **Como executar**: enviar email para `security@lexflowai.com.br` e checar SECURITY.md.
- **Evidência**: confirmação de recebimento + URL do doc.
- **Aprovado se**: canal ativo, SLA documentado.

---

## Critério Go/No-Go

| Critério | Mínimo |
|---|---|
| Testes `failed` | 0 |
| Testes críticos `pending` | 0 (frentes 1, 2, 3, 5) |
| Testes `skipped` justificados | 100% com nota |
| Pentest externo | Relatório < 90 dias |
| DPA + Política de Privacidade | Publicados |

Quando todos os critérios estiverem verdes, gerar o **Relatório Final de Segurança Pré-Venda** em PDF (compilação automática a partir de `pre_launch_test_runs` + evidências) e arquivar em `docs/SECURITY_REPORT.md`.
