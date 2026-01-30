
# Plano de Testes Automatizados - LexFlow Multi-Tenant

## Visao Geral

Este plano estrutura a implementacao de testes automatizados para o sistema LexFlow em 7 categorias hierarquicas de criticidade, utilizando a infraestrutura existente de Vitest/React Testing Library para testes de frontend e Deno para testes de Edge Functions.

---

## Estrutura de Arquivos Proposta

```
src/
  test/
    setup.ts                    # (existente - atualizar)
    example.test.ts             # (existente)
    mocks/
      supabase.ts               # Mock do cliente Supabase
      auth.ts                   # Mock de autenticacao
      organization.ts           # Mock de organizacao
    utils/
      test-factories.ts         # Fabricas de dados de teste
      test-helpers.ts           # Helpers comuns
  __tests__/
    rls/                        # 1. Testes de RLS (Critico)
      rls-isolation.test.ts
      rls-policies.test.ts
    security/                   # 2. Testes de Seguranca
      auth-flow.test.ts
      mfa.test.ts
      permissions.test.ts
    rbac/                       # 4. Testes de RBAC
      roles.test.ts
      permissions.test.ts
    flow/                       # 5. Testes de Fluxo (UX)
      contract-flow.test.tsx
      organization-flow.test.tsx
      auth-flow.test.tsx
    regression/                 # 6. Testes de Regressao
      critical-paths.test.tsx
  utils/
    documentValidation.test.ts  # (existente)
  components/
    ui/
      Button.test.tsx           # (existente)
      Card.test.tsx             # (existente)
    charts/
      PremiumCharts.test.tsx    # (existente)

supabase/
  functions/
    verificar-alertas/
      index_test.ts             # 3. Testes de Edge Functions
    enviar-notificacao-email/
      index_test.ts
    gdpr-handler/
      index_test.ts
    security-alert-handler/
      index_test.ts
    anomaly-detector/
      index_test.ts
```

---

## 1. Testes de Banco (RLS) - CRITICOS

### Objetivo
Verificar isolamento multi-tenant via RLS - nenhum usuario pode acessar dados de outra organizacao.

### Arquivo: `src/__tests__/rls/rls-isolation.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| RLS-001 | Usuario Org A tenta SELECT em contrato de Org B | 0 registros retornados |
| RLS-002 | Usuario sem organizacao tenta SELECT em contratos | 0 registros retornados |
| RLS-003 | Admin Org A tenta SELECT em audit_logs Org B | 0 registros retornados |
| RLS-004 | Usuario tenta INSERT com organization_id diferente | Erro RLS violation |
| RLS-005 | Usuario tenta UPDATE mudando organization_id | Erro ou nenhuma linha afetada |
| RLS-006 | Usuario pode ver apenas membros da propria org | Apenas membros da org retornados |

**Tabelas Cobertas:**
- contratos
- fornecedores
- contract_alerts
- audit_logs
- organization_members
- unidades
- franquias

### Arquivo: `src/__tests__/rls/rls-policies.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| RLS-007 | current_user_org() retorna org do usuario autenticado | UUID correto |
| RLS-008 | current_user_org() retorna NULL para anonimo | NULL |
| RLS-009 | belongs_to_org() valida pertencimento corretamente | true/false |
| RLS-010 | is_org_owner() identifica owner corretamente | true apenas para owner |
| RLS-011 | is_org_admin() identifica admin/owner | true para admin ou owner |

---

## 2. Testes de Seguranca

### Arquivo: `src/__tests__/security/auth-flow.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| SEC-001 | Login com credenciais validas | Sessao criada |
| SEC-002 | Login com senha incorreta | Erro "Invalid credentials" |
| SEC-003 | Bloqueio apos 5 tentativas falhas | Conta bloqueada temporariamente |
| SEC-004 | Logout invalida sessao | Sessao removida |
| SEC-005 | Token expirado nao permite acesso | Redirect para /auth |

### Arquivo: `src/__tests__/security/mfa.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| MFA-001 | Usuario com MFA habilitado precisa verificar | TwoFactorVerification exibido |
| MFA-002 | Codigo TOTP valido permite acesso | Acesso liberado |
| MFA-003 | Codigo TOTP invalido bloqueia | Erro exibido |
| MFA-004 | Role que requer MFA redireciona para setup | Redirect para /settings/2fa |
| MFA-005 | Backup code valido funciona | Acesso liberado |

### Arquivo: `src/__tests__/security/permissions.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| PERM-001 | has_permission() retorna true para permissao existente | true |
| PERM-002 | has_permission() retorna false para permissao inexistente | false |
| PERM-003 | ProtectedRoute bloqueia sem permissao | Tela de acesso negado |
| PERM-004 | ProtectedRoute permite com permissao | Componente renderizado |

---

## 3. Testes de Edge Functions

### Metodologia
Testes Deno usando framework nativo `Deno.test()`, executados via ferramenta de teste de Edge Functions.

### Arquivo: `supabase/functions/verificar-alertas/index_test.ts`

```typescript
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("verificar-alertas - rejeita requisicao sem CRON_SECRET", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/verificar-alertas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  await response.text();
  assertEquals(response.status, 401);
});

Deno.test("verificar-alertas - processa por organizacao", async () => {
  // Teste com CRON_SECRET valido
});
```

**Casos de Teste por Funcao:**

| Funcao | Casos |
|--------|-------|
| verificar-alertas | CRON auth, processamento por org, criacao de alertas |
| enviar-notificacao-email | Auth, scoping por org, formato de email |
| gdpr-handler | Auth, validacao cross-org, erasure/export/access |
| security-alert-handler | Response matrix, scoping por org, audit log |
| anomaly-detector | Processamento por org, metricas isoladas |

---

## 4. Testes de RBAC

### Arquivo: `src/__tests__/rbac/roles.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| RBAC-001 | Administrador tem todas as permissoes | Todas retornam true |
| RBAC-002 | Analista juridico tem permissoes limitadas | Subset de permissoes |
| RBAC-003 | Membro sem role especifica | Permissoes basicas |
| RBAC-004 | has_role() funciona corretamente | true/false |
| RBAC-005 | has_any_role() com array de roles | true se alguma corresponde |

### Arquivo: `src/__tests__/rbac/permissions.test.ts`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| RBAC-006 | usePermissions() carrega permissoes do usuario | Array de permissoes |
| RBAC-007 | canViewContracts calculado corretamente | boolean baseado em permissoes |
| RBAC-008 | canApproveContracts exige permissao especifica | true apenas com contract:approve |
| RBAC-009 | isSystemAdmin exige system:admin | true apenas para system_admin |

---

## 5. Testes de Fluxo (UX)

### Arquivo: `src/__tests__/flow/contract-flow.test.tsx`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| UX-001 | Criar contrato preenche todos campos | Contrato salvo |
| UX-002 | Editar contrato atualiza dados | Versao incrementada |
| UX-003 | Visualizar contrato mostra todos detalhes | Dados exibidos |
| UX-004 | Kanban atualiza status via drag-and-drop | Status atualizado |

### Arquivo: `src/__tests__/flow/organization-flow.test.tsx`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| UX-005 | Onboarding cria organizacao | Org criada + membro owner |
| UX-006 | Convidar membro envia convite | Email enviado |
| UX-007 | Alterar role de membro atualiza role_in_org | Role atualizada |
| UX-008 | Settings salva configuracoes | Dados persistidos |

### Arquivo: `src/__tests__/flow/auth-flow.test.tsx`

**Casos de Teste:**

| ID | Cenario | Esperado |
|----|---------|----------|
| UX-009 | Login redireciona para dashboard | Navegacao correta |
| UX-010 | Logout limpa sessao e redireciona | /auth exibido |
| UX-011 | Usuario sem org vai para waiting-for-invite | Pagina correta |
| UX-012 | AuthCallback processa login e redireciona | Fluxo completo |

---

## 6. Testes de Regressao

### Arquivo: `src/__tests__/regression/critical-paths.test.tsx`

**Cobertura de Caminhos Criticos:**

| Caminho | Componentes | Validacao |
|---------|-------------|-----------|
| Login -> Dashboard | Auth, ProtectedRoute, Dashboard | Acesso completo |
| Criar Contrato | Form, Supabase insert, Listagem | Contrato visivel |
| Aprovar Contrato | Workflow, Status change | Status = aprovado |
| Gerar Alerta | Trigger, Lista de alertas | Alerta criado |
| LGPD Export | gdpr-handler, Download | Dados exportados |

---

## 7. Testes de Performance

### Metodologia
Medicao de tempos de resposta e limites de carga usando metricas do browser e timing de queries.

### Metricas a Capturar

| Metrica | Limite Aceitavel | Metodo |
|---------|------------------|--------|
| Tempo de login | < 2s | Performance API |
| Carregamento Dashboard | < 3s | First Contentful Paint |
| Query de contratos (100 itens) | < 500ms | Supabase timing |
| Render de tabela (100 linhas) | < 1s | React Profiler |

### Implementacao

```typescript
// src/__tests__/performance/load-times.test.ts
describe("Performance Benchmarks", () => {
  it("Dashboard carrega em menos de 3s", async () => {
    const start = performance.now();
    render(<Dashboard />);
    await waitFor(() => screen.getByText("Dashboard"));
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(3000);
  });
});
```

---

## Infraestrutura de Testes

### Atualizacao do Setup (`src/test/setup.ts`)

Adicionar:
- Mock global do Supabase client
- Mock do AuthContext
- Mock do OrganizationContext
- Helpers para criar usuarios de teste

### Fabricas de Dados (`src/test/utils/test-factories.ts`)

```typescript
export const createTestOrganization = (overrides = {}) => ({
  id: crypto.randomUUID(),
  nome: "Test Org",
  slug: "test-org",
  is_active: true,
  ...overrides,
});

export const createTestUser = (overrides = {}) => ({
  id: crypto.randomUUID(),
  email: "test@example.com",
  ...overrides,
});

export const createTestContract = (orgId: string, overrides = {}) => ({
  id: crypto.randomUUID(),
  organization_id: orgId,
  titulo: "Contrato Teste",
  numero_contrato: "CTR-001",
  status: "rascunho",
  tipo: "servico",
  ...overrides,
});
```

### Mocks Reutilizaveis (`src/test/mocks/`)

**supabase.ts:**
```typescript
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  })),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  rpc: vi.fn(),
};
```

---

## Scripts de Execucao

### package.json Updates

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:rls": "vitest run src/__tests__/rls/",
    "test:security": "vitest run src/__tests__/security/",
    "test:rbac": "vitest run src/__tests__/rbac/",
    "test:flow": "vitest run src/__tests__/flow/",
    "test:regression": "vitest run src/__tests__/regression/",
    "test:critical": "vitest run src/__tests__/rls/ src/__tests__/security/"
  }
}
```

---

## Ordem de Implementacao

| Prioridade | Categoria | Justificativa |
|------------|-----------|---------------|
| 1 | Testes de RLS | Isolamento multi-tenant e mais critico |
| 2 | Testes de Seguranca | Protecao de dados e autenticacao |
| 3 | Testes de Edge Functions | Backend critico para operacoes |
| 4 | Testes de RBAC | Controle de acesso e autorizacao |
| 5 | Testes de Fluxo | Experiencia do usuario |
| 6 | Testes de Regressao | Prevencao de bugs |
| 7 | Testes de Performance | Otimizacao |

---

## Arquivos a Criar (Resumo)

| Arquivo | Linhas Estimadas |
|---------|------------------|
| `src/test/mocks/supabase.ts` | ~80 |
| `src/test/mocks/auth.ts` | ~40 |
| `src/test/mocks/organization.ts` | ~30 |
| `src/test/utils/test-factories.ts` | ~100 |
| `src/test/utils/test-helpers.ts` | ~60 |
| `src/__tests__/rls/rls-isolation.test.ts` | ~200 |
| `src/__tests__/rls/rls-policies.test.ts` | ~150 |
| `src/__tests__/security/auth-flow.test.ts` | ~120 |
| `src/__tests__/security/mfa.test.ts` | ~100 |
| `src/__tests__/security/permissions.test.ts` | ~80 |
| `src/__tests__/rbac/roles.test.ts` | ~100 |
| `src/__tests__/rbac/permissions.test.ts` | ~80 |
| `src/__tests__/flow/contract-flow.test.tsx` | ~150 |
| `src/__tests__/flow/organization-flow.test.tsx` | ~120 |
| `src/__tests__/flow/auth-flow.test.tsx` | ~100 |
| `src/__tests__/regression/critical-paths.test.tsx` | ~180 |
| Edge Function tests (5 arquivos) | ~400 total |

**Total estimado: ~2.000 linhas de codigo de teste**

---

## Secao Tecnica

### Dependencias Existentes (ja instaladas)
- vitest ^3.2.4
- @testing-library/react ^16.3.2
- @testing-library/jest-dom ^6.9.1
- @testing-library/user-event ^14.6.1
- jsdom ^20.0.3

### Configuracao Vitest (ja configurada)
- Environment: jsdom
- Globals: true
- Setup: src/test/setup.ts
- Include: src/**/*.{test,spec}.{ts,tsx}

### Testes de Edge Functions
- Framework: Deno.test nativo
- Execucao via ferramenta supabase--test-edge-functions
- Ambiente: Deno com dotenv para credenciais
