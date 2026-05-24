export type TestStatus = "pending" | "passed" | "failed" | "skipped";

export interface PreLaunchTest {
  id: string;
  frente: string;
  titulo: string;
  comoExecutar: string;
  aprovadoSe: string;
  critico?: boolean;
}

export const PRE_LAUNCH_FRENTES: Record<string, { titulo: string; descricao: string }> = {
  "1": { titulo: "Autenticação & Sessão", descricao: "Login, MFA, reset, enumeration, rotation" },
  "2": { titulo: "Autorização & Multi-tenancy", descricao: "RLS, cross-tenant, IDOR, privilege escalation" },
  "3": { titulo: "Vazamento de Dados", descricao: "Storage, realtime, logs, headers, PII" },
  "4": { titulo: "Injeção & Input Validation", descricao: "SQLi, XSS, SSRF, upload, path traversal" },
  "5": { titulo: "Compliance LGPD", descricao: "Aceite, exclusão, retenção, DPA" },
  "6": { titulo: "Infra & Operação", descricao: "Pentest, DAST, SAST, deps, backup" },
  "7": { titulo: "Monitoring & Resposta", descricao: "Alertas, canal de disclosure" },
};

export const PRE_LAUNCH_TESTS: PreLaunchTest[] = [
  // Frente 1 (8)
  { id: "1.1", frente: "1", titulo: "Login com credenciais válidas", comoExecutar: "Suite Vitest auth-flow ou login manual.", aprovadoSe: "Sessão criada, JWT presente.", critico: true },
  { id: "1.2", frente: "1", titulo: "Bloqueio após 5 tentativas falhas", comoExecutar: "5x senha errada + SELECT is_login_blocked('email').", aprovadoSe: "6ª tentativa bloqueada.", critico: true },
  { id: "1.3", frente: "1", titulo: "Política de senha", comoExecutar: "Cadastrar senhas fracas no signup.", aprovadoSe: "Rejeita < 12 chars sem complexidade." },
  { id: "1.4", frente: "1", titulo: "Reset de senha", comoExecutar: "Solicitar reset → email → trocar → reusar link.", aprovadoSe: "Link válido 1x, expira em 1h.", critico: true },
  { id: "1.5", frente: "1", titulo: "MFA obrigatório para admins", comoExecutar: "Login como administrador com MFA ativo.", aprovadoSe: "Exige TOTP." },
  { id: "1.6", frente: "1", titulo: "Logout invalida sessão", comoExecutar: "Logout + reuso do token antigo.", aprovadoSe: "401 no reuso.", critico: true },
  { id: "1.7", frente: "1", titulo: "Account enumeration", comoExecutar: "Login com email inexistente vs existente.", aprovadoSe: "Mensagem genérica idêntica." },
  { id: "1.8", frente: "1", titulo: "Refresh token rotation", comoExecutar: "Forçar refresh + reuso do antigo.", aprovadoSe: "Antigo invalidado." },

  // Frente 2 (10)
  { id: "2.1", frente: "2", titulo: "RLS por tabela (regressão)", comoExecutar: "Aba Regressão → Executar suíte.", aprovadoSe: "Todos verdes.", critico: true },
  { id: "2.2", frente: "2", titulo: "Cross-tenant SELECT", comoExecutar: "Deno test rls_tables.", aprovadoSe: "0 linhas de outra org.", critico: true },
  { id: "2.3", frente: "2", titulo: "Cross-tenant INSERT forjado", comoExecutar: "INSERT com organization_id de outra org.", aprovadoSe: "RLS bloqueia.", critico: true },
  { id: "2.4", frente: "2", titulo: "Cross-tenant UPDATE", comoExecutar: "UPDATE em ID de outra org.", aprovadoSe: "0 linhas afetadas.", critico: true },
  { id: "2.5", frente: "2", titulo: "IDOR em rotas de detalhe", comoExecutar: "Navegar /contratos/<id-outro>.", aprovadoSe: "404/403.", critico: true },
  { id: "2.6", frente: "2", titulo: "Privilege escalation horizontal", comoExecutar: "Analista tenta UPDATE user_roles.", aprovadoSe: "Bloqueado.", critico: true },
  { id: "2.7", frente: "2", titulo: "Privilege escalation vertical", comoExecutar: "Admin Org A age na Org B.", aprovadoSe: "is_admin_of_org false.", critico: true },
  { id: "2.8", frente: "2", titulo: "Edge functions validam JWT", comoExecutar: "Suite edge_auth.test.ts.", aprovadoSe: "401 sem Bearer.", critico: true },
  { id: "2.9", frente: "2", titulo: "user_id derivado do token", comoExecutar: "Chamar registrar-aceite-lgpd com user_id forjado.", aprovadoSe: "compliance_logs usa JWT sub." },
  { id: "2.10", frente: "2", titulo: "role_permissions service_role only", comoExecutar: "Admin tenta INSERT/UPDATE/DELETE.", aprovadoSe: "Bloqueado.", critico: true },

  // Frente 3 (9)
  { id: "3.1", frente: "3", titulo: "Storage privado exige signed URL", comoExecutar: "URL pública vs signed em contratos-documentos.", aprovadoSe: "Pública 403.", critico: true },
  { id: "3.2", frente: "3", titulo: "Realtime scoped", comoExecutar: "Subscribe em canal de outro user.", aprovadoSe: "Sem payloads.", critico: true },
  { id: "3.3", frente: "3", titulo: "Sem campos sensíveis nas APIs", comoExecutar: "GET profiles/user_roles via REST.", aprovadoSe: "0 hashes/tokens." },
  { id: "3.4", frente: "3", titulo: "Logs sem segredos", comoExecutar: "Grep CRON_SECRET, Bearer, password.", aprovadoSe: "0 matches." },
  { id: "3.5", frente: "3", titulo: "Erros sem stack trace", comoExecutar: "Forçar 500 em edge fn.", aprovadoSe: "Mensagem genérica." },
  { id: "3.6", frente: "3", titulo: "CORS revisado", comoExecutar: "Auditar corsHeaders de todas fns.", aprovadoSe: "Lista aprovada." },
  { id: "3.7", frente: "3", titulo: "Headers de segurança", comoExecutar: "curl -I + securityheaders.com.", aprovadoSe: "Grade A." },
  { id: "3.8", frente: "3", titulo: "PII masking ativo", comoExecutar: "Role sem view_pii abre fornecedor.", aprovadoSe: "CPF/email mascarados." },
  { id: "3.9", frente: "3", titulo: "Export respeita tenant", comoExecutar: "Exportar relatório como user Org A.", aprovadoSe: "0 dados de outras orgs.", critico: true },

  // Frente 4 (7)
  { id: "4.1", frente: "4", titulo: "SQLi em busca", comoExecutar: "Payloads OWASP em campos de busca.", aprovadoSe: "Tratado como string." },
  { id: "4.2", frente: "4", titulo: "XSS armazenado", comoExecutar: "<script> em observações.", aprovadoSe: "Renderizado escapado." },
  { id: "4.3", frente: "4", titulo: "XSS refletido", comoExecutar: "Payload em query param.", aprovadoSe: "Escapado." },
  { id: "4.4", frente: "4", titulo: "SSRF", comoExecutar: "URL interna em integrações.", aprovadoSe: "Bloqueado." },
  { id: "4.5", frente: "4", titulo: "Upload malicioso", comoExecutar: ".exe renomeado, EICAR, arquivo grande.", aprovadoSe: "Rejeitado." },
  { id: "4.6", frente: "4", titulo: "Path traversal", comoExecutar: "../../etc/passwd em download.", aprovadoSe: "403/404." },
  { id: "4.7", frente: "4", titulo: "Validação Zod em todas edge fns", comoExecutar: "rg z.object em supabase/functions.", aprovadoSe: "100% das fns POST/PUT." },

  // Frente 5 (6)
  { id: "5.1", frente: "5", titulo: "Aceite imutável", comoExecutar: "UPDATE compliance_logs.", aprovadoSe: "Bloqueado.", critico: true },
  { id: "5.2", frente: "5", titulo: "Direito de acesso (Art. 18)", comoExecutar: "gdpr-handler action=export.", aprovadoSe: "Dados retornados.", critico: true },
  { id: "5.3", frente: "5", titulo: "Direito de exclusão (Art. 18)", comoExecutar: "SELECT gdpr_delete_user(uuid).", aprovadoSe: "Profile anonimizado.", critico: true },
  { id: "5.4", frente: "5", titulo: "Logs de consentimento completos", comoExecutar: "Inspecionar registro recente.", aprovadoSe: "IP/UA/versão/timestamp." },
  { id: "5.5", frente: "5", titulo: "Política de retenção", comoExecutar: "Verificar cron daily-compliance-check.", aprovadoSe: "Rodando diariamente." },
  { id: "5.6", frente: "5", titulo: "DPA disponível", comoExecutar: "docs/legal/DPA.md.", aprovadoSe: "Doc publicado.", critico: true },

  // Frente 6 (6)
  { id: "6.1", frente: "6", titulo: "Pentest externo", comoExecutar: "Contratar HackerOne/Cobalt.", aprovadoSe: "0 críticas/highs.", critico: true },
  { id: "6.2", frente: "6", titulo: "DAST automatizado", comoExecutar: "OWASP ZAP em staging.", aprovadoSe: "0 highs." },
  { id: "6.3", frente: "6", titulo: "SAST no CI", comoExecutar: "Semgrep + ESLint security.", aprovadoSe: "0 highs." },
  { id: "6.4", frente: "6", titulo: "Dependency scan", comoExecutar: "bun audit --production.", aprovadoSe: "0 highs/criticals." },
  { id: "6.5", frente: "6", titulo: "Secret scanning no repo", comoExecutar: "gitleaks detect.", aprovadoSe: "0 segredos." },
  { id: "6.6", frente: "6", titulo: "Backup restore drill", comoExecutar: "Restaurar em ambiente isolado.", aprovadoSe: "RTO < 4h documentado." },

  // Frente 7 (2)
  { id: "7.1", frente: "7", titulo: "Alertas funcionando", comoExecutar: "Simular 6 logins falhos.", aprovadoSe: "Alerta < 5min." },
  { id: "7.2", frente: "7", titulo: "Canal de disclosure público", comoExecutar: "Email security@ + SECURITY.md.", aprovadoSe: "Canal ativo, SLA doc.", critico: true },
];
