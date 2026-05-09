# Spec: Bateria Completa de Testes Pré-Venda — LexFlow

Documento mestre que descreve, **um a um**, todos os testes de segurança e vazamento de dados a serem executados antes de colocar o LexFlow à venda. Cada item terá: objetivo, como executar, evidência esperada e critério de aprovação.

A spec será materializada em **3 entregáveis**:

1. `docs/PRE_LAUNCH_TEST_SPEC.md` — documento mestre navegável (este conteúdo, expandido)
2. `docs/test-evidence/` — pasta para armazenar prints, logs e relatórios de cada execução
3. Painel `/security` → nova aba **"Pré-Venda"** com checklist interativo (status por teste, link para evidência, botão de marcar como aprovado)

---

## Estrutura da spec — 7 frentes, 48 testes

### Frente 1 — Autenticação & Sessão (8 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 1.1 | Login com credenciais válidas | Suite Vitest `auth-flow.test.ts` | Sessão criada, token retornado |
| 1.2 | Bloqueio após 5 tentativas falhas | Script manual + `is_login_blocked()` | 6ª tentativa bloqueada |
| 1.3 | Política de senha (12 chars + complexidade) | Edge fn `validate-password` | Rejeita senhas fracas |
| 1.4 | Reset de senha funcional | Fluxo manual: solicitar → email → trocar | Token válido 1x, expira em 1h |
| 1.5 | MFA obrigatório para roles configuradas | Login como `administrador` com MFA | Exige TOTP |
| 1.6 | Logout invalida sessão server-side | Logout + reuso do token antigo | 401 no reuso |
| 1.7 | Account enumeration | Tentar login com email inexistente | Mesma mensagem genérica |
| 1.8 | Refresh token rotation | Forçar refresh + reuso do antigo | Antigo invalidado |

### Frente 2 — Autorização & Multi-tenancy (10 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 2.1 | RLS por tabela (35 tabelas) | `security-regression-runner` | Todos os testes verdes |
| 2.2 | Cross-tenant SELECT (Org A → Org B) | Suite `rls_tables.test.ts` | 0 linhas retornadas |
| 2.3 | Cross-tenant INSERT forçando `organization_id` de outra org | Teste novo a criar | RLS bloqueia |
| 2.4 | Cross-tenant UPDATE via ID conhecido | Teste novo | `.maybeSingle()` retorna null |
| 2.5 | IDOR em rotas de detalhe (`/contratos/:id`) | Manual + script | 404/403 para ID de outra org |
| 2.6 | Privilege escalation horizontal (analista → admin) | Tentar `update user_roles` | RLS bloqueia |
| 2.7 | Privilege escalation vertical (admin org A → admin org B) | Suite | `is_admin_of_org` falha |
| 2.8 | Edge functions validam JWT | Suite `edge_auth.test.ts` | 401 sem Bearer |
| 2.9 | `user_id` derivado do token, não do body | Suite recém-criada | `compliance_logs` usa JWT sub |
| 2.10 | `role_permissions` somente service_role | Suite regressão | INSERT/UPDATE/DELETE 403 |

### Frente 3 — Vazamento de Dados (9 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 3.1 | Storage privado exige signed URL | `rls_storage.test.ts` | URL pública 403 |
| 3.2 | Realtime: usuário só vê próprio canal | `rls_realtime.test.ts` | Subscribe em canal de outro = sem mensagens |
| 3.3 | API responses sem campos sensíveis (hash, tokens) | Inspecionar `/profiles`, `/user_roles` | Nenhum campo de credencial |
| 3.4 | Logs sem segredos (CRON_SECRET, JWT, senhas) | `grep` em logs Supabase + analytics_query | 0 ocorrências |
| 3.5 | Error messages sem stack trace em produção | Forçar erro 500 | Mensagem genérica |
| 3.6 | CORS não usa `*` em endpoints autenticados sensíveis | Auditar todas edge fns | Lista revisada |
| 3.7 | Headers de segurança (CSP, HSTS, X-Frame, X-CTO) | curl + securityheaders.com | Grade A |
| 3.8 | PII masking ativo para roles sem permissão | Manual em telas de fornecedor/contrato | Campos mascarados |
| 3.9 | Export de dados respeita tenant | Exportar como user de Org A | Sem dados de Org B |

### Frente 4 — Injeção & Input Validation (7 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 4.1 | SQLi em campos de busca | Payloads OWASP em `BuscaAvancada` | Sem erro de SQL, sem dados extras |
| 4.2 | XSS armazenado em comentários/observações | `<script>alert(1)</script>` em campos | Renderizado como texto |
| 4.3 | XSS refletido em query params | Payload em URL | Escape ativo |
| 4.4 | SSRF em integrações (Gest10, CNPJ) | URL interna como input | Bloqueado |
| 4.5 | Upload de arquivo: tipo e tamanho | PDF malicioso, .exe renomeado | Rejeitado |
| 4.6 | Path traversal em downloads | `../../etc/passwd` | 403/404 |
| 4.7 | Validação Zod em todas edge fns | Audit de código | 100% das fns têm schema |

### Frente 5 — Compliance LGPD (6 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 5.1 | Aceite de termos imutável | Tentar UPDATE em `compliance_logs` | RLS bloqueia |
| 5.2 | Direito de acesso (Art. 18 LGPD) | Edge fn `gdpr-handler` action=export | Retorna dados do user |
| 5.3 | Direito de exclusão (Art. 18) | `gdpr_delete_user(uuid)` | Profile anonimizado, logs marcados |
| 5.4 | Logs de consentimento completos | Inspecionar 1 registro | IP, UA, versão, timestamp |
| 5.5 | Política de retenção aplicada | Verificar `retention_policies` ativas | Cron rodando |
| 5.6 | DPA disponível para clientes | Doc em `/docs/legal/DPA.md` | Documento publicado |

### Frente 6 — Infra & Operação (6 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 6.1 | Pentest externo (terceirizado) | Contratar empresa (HackerOne/Cobalt) | Relatório com 0 críticas |
| 6.2 | DAST automatizado | OWASP ZAP em staging | Sem highs |
| 6.3 | SAST no CI | Semgrep + ESLint security | Sem highs |
| 6.4 | Dependency scan | `npm audit --production` | 0 highs/criticals |
| 6.5 | Secret scanning no repo | gitleaks | 0 segredos |
| 6.6 | Backup restore drill | Restaurar em ambiente isolado | RTO < 4h documentado |

### Frente 7 — Monitoring & Resposta (2 testes)
| # | Teste | Como executar | Aprovado se |
|---|---|---|---|
| 7.1 | Alertas funcionando (login suspeito, picos de erro) | `security-alert-handler` + simulação | Alerta dispara |
| 7.2 | Canal de disclosure público | `security@lexflowai.com.br` ativo + SECURITY.md | Email recebido |

---

## O que será criado na implementação

1. **`docs/PRE_LAUNCH_TEST_SPEC.md`** — versão expandida deste plano com cada teste detalhado: passos exatos, comandos, payloads, screenshots de evidência esperada
2. **`docs/test-evidence/README.md`** — convenção de nomes para arquivos de evidência (ex.: `1.2-bloqueio-login.png`, `4.1-sqli-busca.json`)
3. **Tabela `pre_launch_test_runs`** no banco — para registrar execuções: `test_id`, `executed_by`, `status` (pending/passed/failed/skipped), `evidence_url`, `notes`, `executed_at`
4. **Componente `PreLaunchChecklist.tsx`** em `src/components/security/` — renderiza os 48 testes agrupados por frente, com badges de status, botão "marcar como aprovado", upload de evidência e contador de progresso (X/48)
5. **Nova aba "Pré-Venda"** em `src/pages/SecurityDashboard.tsx` — só visível para `administrador`
6. **Edge function `pre-launch-test-runner`** — opcional, para disparar os testes automatizáveis (frentes 1, 2, 3.1-3.4, 4.7, 5.1-5.4, 6.4) em batch e gravar resultado direto na tabela

## Fora do escopo desta spec

- Execução real dos testes (será feita após a aprovação do plano)
- Contratação de pentest externo (depende do usuário)
- Implementação de correções para testes que falharem (cada falha vira um ticket separado)

## Próximos passos depois de aprovado

1. Criar o documento mestre + tabela + componente + aba
2. Rodar os testes automatizáveis (≈30 dos 48) e registrar resultados
3. Listar os ≈18 testes manuais com instruções claras para você executar
4. Gerar relatório final em PDF com todas as evidências para entregar a clientes corporativos
