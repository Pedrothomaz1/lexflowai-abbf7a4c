
# Plano de Implementação: Multi-Tenancy LexFlow SaaS

## Status de Implementação

| Fase | Status | Data |
|------|--------|------|
| Fase 1: Schema Multi-Tenant | ✅ Concluída | 2026-01-30 |
| Fase 2: Políticas RLS | ✅ Concluída | 2026-01-30 |
| Fase 3: Edge Functions | ⏳ Pendente | - |
| Fase 4: Frontend | ⏳ Pendente | - |
| Fase 5: Validação | ⏳ Pendente | - |

## Resumo Executivo

Este plano transforma o LexFlow de single-tenant para multi-tenant SaaS, permitindo que múltiplas empresas usem a mesma infraestrutura com isolamento total de dados.

---

## Análise do Gap: Estado Atual vs PRD

| Aspecto | Estado Atual | PRD Requerido |
|---------|--------------|---------------|
| Escopo de Dados | Global (todos veem tudo) | Isolado por Empresa |
| Conceito de Tenant | Não existe | Empresa = Tenant |
| Usuários | Pertencem ao sistema | Pertencem a uma Empresa |
| Contratos | Visíveis por role | Visíveis apenas dentro da Empresa |
| RLS Policies | Baseadas em role | Baseadas em empresa + role |
| Fornecedores | Compartilhados | Isolados por Empresa |
| Alertas | Globais | Por Empresa |

---

## Fase 1: Criação do Schema Multi-Tenant

### 1.1 Nova Tabela: `organizations` (Tenant)

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  slug TEXT UNIQUE NOT NULL, -- para URLs amigáveis
  email_contato TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logo_url TEXT,
  plano TEXT DEFAULT 'basico', -- para futuro billing
  max_usuarios INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  configuracoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Tabela de Associação: `organization_members`

```sql
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### 1.3 Adicionar `organization_id` às Tabelas Principais

Tabelas que receberão a coluna `organization_id`:

| Tabela | Impacto |
|--------|---------|
| `contratos` | Contratos isolados por empresa |
| `fornecedores` | Fornecedores isolados por empresa |
| `contract_alerts` | Alertas isolados por empresa |
| `contract_obligations` | Obrigações isoladas por empresa |
| `contract_requests` | Requisições isoladas por empresa |
| `unidades` | Unidades/filiais isoladas por empresa |
| `user_roles` | Roles dentro da empresa |
| `profiles` | Perfis associados à empresa |
| `audit_logs` | Logs de auditoria por empresa |
| `compliance_logs` | Compliance LGPD por empresa |
| `notification_preferences` | Preferências por empresa |
| `contract_templates` | Templates por empresa |
| `report_configurations` | Relatórios por empresa |

---

## Fase 2: Funções SQL Helper Multi-Tenant

### 2.1 Função para obter organização do usuário

```sql
CREATE OR REPLACE FUNCTION public.get_user_organization(uid UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = uid 
  AND is_active = true 
  LIMIT 1;
$$;
```

### 2.2 Função para verificar pertencimento

```sql
CREATE OR REPLACE FUNCTION public.belongs_to_organization(uid UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = uid 
    AND organization_id = org_id 
    AND is_active = true
  );
$$;
```

### 2.3 Função para contexto atual

```sql
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT get_user_organization(auth.uid());
$$;
```

---

## Fase 3: Atualização das Políticas RLS

### 3.1 Padrão de Policy Multi-Tenant

**Antes (atual):**
```sql
CREATE POLICY "Authenticated users can view contratos" 
ON contratos FOR SELECT
USING (auth.uid() IS NOT NULL);
```

**Depois (multi-tenant):**
```sql
CREATE POLICY "Users can view own organization contracts" 
ON contratos FOR SELECT
USING (
  organization_id = current_user_org()
);
```

### 3.2 Políticas por Tabela

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `organizations` | Apenas sua org | Super admin | Owner/Admin | Super admin |
| `contratos` | Mesma org | Mesma org + role | Mesma org + role | Admin apenas |
| `fornecedores` | Mesma org | Mesma org + role | Mesma org + role | Admin apenas |
| `contract_alerts` | Mesma org | Mesma org | Mesma org | Mesma org |
| `audit_logs` | Mesma org (admin) | Trigger apenas | Nenhum | Nenhum |

---

## Fase 4: Atualização do Frontend

### 4.1 Novo Contexto: `OrganizationContext`

**Arquivo:** `src/contexts/OrganizationContext.tsx`

```tsx
interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  isOwner: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### 4.2 Atualização do AuthContext

Adicionar fetch da organização após login bem-sucedido.

### 4.3 Componentes Afetados

| Componente | Alteração |
|------------|-----------|
| `AuthCallback.tsx` | Redirecionar para seletor de org se múltiplas |
| `DashboardLayout.tsx` | Mostrar nome da organização no header |
| `AppSidebar.tsx` | Exibir contexto da empresa |
| `GlobalHeader.tsx` | Adicionar switcher de organização |
| Todas as páginas de listagem | Dados já filtrados por RLS |

### 4.4 Nova Página: Configurações da Organização

**Arquivo:** `src/pages/OrganizationSettings.tsx`

- Editar dados da empresa
- Gerenciar membros
- Configurações específicas da org

---

## Fase 5: Atualização das Edge Functions

### 5.1 Funções que precisam de contexto de organização

| Função | Alteração |
|--------|-----------|
| `verificar-alertas` | Iterar por organização |
| `enviar-notificacao-email` | Incluir org context |
| `enviar-notificacao-whatsapp` | Incluir org context |
| `gdpr-handler` | Escopo por organização |
| `security-alert-handler` | Alertas por org |

### 5.2 Padrão de Atualização

```typescript
// Antes
const { data: contratos } = await supabase
  .from('contratos')
  .select('*')
  .eq('status', 'vigente');

// Depois
const { data: organizations } = await supabase
  .from('organizations')
  .select('id')
  .eq('is_active', true);

for (const org of organizations) {
  const { data: contratos } = await supabase
    .from('contratos')
    .select('*')
    .eq('organization_id', org.id)
    .eq('status', 'vigente');
  // processar por org
}
```

---

## Fase 6: Migração de Dados Existentes

### 6.1 Estratégia

1. Criar organização "default" para dados existentes
2. Associar todos os usuários existentes a essa org
3. Atribuir `organization_id` a todos os registros existentes

```sql
-- 1. Criar org default
INSERT INTO organizations (nome, slug) 
VALUES ('Empresa Padrão', 'default');

-- 2. Migrar usuários
INSERT INTO organization_members (organization_id, user_id, is_owner)
SELECT 
  (SELECT id FROM organizations WHERE slug = 'default'),
  user_id,
  (role = 'administrador')
FROM user_roles;

-- 3. Migrar contratos
UPDATE contratos SET organization_id = (
  SELECT id FROM organizations WHERE slug = 'default'
);
```

---

## Fase 7: Fluxo de Onboarding

### 7.1 Registro de Nova Empresa

1. Usuário acessa `/signup`
2. Preenche dados da empresa + dados pessoais
3. Sistema cria `organization` + `user` + `organization_member`
4. Envia email de verificação
5. Após verificar, redireciona para dashboard

### 7.2 Convite de Usuário

1. Admin acessa Configurações > Usuários
2. Clica "Convidar Membro"
3. Sistema envia email com magic link
4. Novo usuário cria senha e é associado à org

---

## Fase 8: Segurança e Auditoria

### 8.1 Validações Adicionais

- Trigger para garantir `organization_id` nunca é NULL
- Trigger para prevenir mudança de `organization_id`
- Log de todas as operações cross-org (super admin)

### 8.2 Índices de Performance

```sql
CREATE INDEX idx_contratos_org ON contratos(organization_id);
CREATE INDEX idx_fornecedores_org ON fornecedores(organization_id);
CREATE INDEX idx_members_org ON organization_members(organization_id);
CREATE INDEX idx_members_user ON organization_members(user_id);
```

---

## Cronograma de Implementação

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Schema Multi-Tenant | 1 sessão |
| 2 | Funções SQL Helper | 1 sessão |
| 3 | Políticas RLS | 2 sessões |
| 4 | Frontend (contextos + componentes) | 3 sessões |
| 5 | Edge Functions | 2 sessões |
| 6 | Migração de Dados | 1 sessão |
| 7 | Fluxo de Onboarding | 2 sessões |
| 8 | Testes e Ajustes | 2 sessões |

**Total estimado: 14 sessões de desenvolvimento**

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Queries sem filtro de org | RLS garante isolamento mesmo se código falhar |
| Performance com muitas orgs | Índices + partition por org (futuro) |
| Migração de dados incorreta | Script de validação pós-migração |
| Usuário sem organização | Tratamento no AuthCallback + redirect |

---

## Detalhes Técnicos

### Arquivos a Criar

```
src/contexts/OrganizationContext.tsx
src/hooks/useOrganization.ts
src/pages/OrganizationSettings.tsx
src/pages/OrganizationMembers.tsx
src/components/OrganizationSwitcher.tsx
src/components/InviteMemberDialog.tsx
```

### Arquivos a Modificar

```
src/contexts/AuthContext.tsx
src/components/ProtectedRoute.tsx
src/pages/AuthCallback.tsx
src/pages/Auth.tsx
src/components/DashboardLayout.tsx
src/components/GlobalHeader.tsx
src/hooks/useUserRole.tsx
src/hooks/usePermissions.ts
supabase/functions/verificar-alertas/index.ts
supabase/functions/enviar-notificacao-email/index.ts
supabase/functions/gdpr-handler/index.ts
```

---

## Próximos Passos

Após aprovação deste plano:

1. Iniciar pela **Fase 1** (Schema) - fundação do multi-tenancy
2. Implementar **Fase 2** (Funções SQL) - helpers necessários
3. Seguir sequencialmente até conclusão

Deseja que eu inicie a implementação pela Fase 1?
