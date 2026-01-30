import type { Database } from '@/integrations/supabase/types';

type ContractStatus = Database['public']['Enums']['contract_status'];
type ContractType = Database['public']['Enums']['contract_type'];
type AppRole = Database['public']['Enums']['app_role'];

// =====================
// ORGANIZATION FACTORIES
// =====================

export interface TestOrganization {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  email_contato: string | null;
  plano: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const createTestOrganization = (overrides: Partial<TestOrganization> = {}): TestOrganization => ({
  id: crypto.randomUUID(),
  nome: 'Organização Teste',
  slug: 'org-teste-' + Date.now(),
  cnpj: '12.345.678/0001-99',
  email_contato: 'contato@orgteste.com',
  plano: 'basico',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// USER FACTORIES
// =====================

export interface TestUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: crypto.randomUUID(),
  email: `user-${Date.now()}@test.com`,
  full_name: 'Usuário Teste',
  phone: '(11) 99999-9999',
  department: 'Jurídico',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// USER ROLE FACTORIES
// =====================

export interface TestUserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export const createTestUserRole = (overrides: Partial<TestUserRole> = {}): TestUserRole => ({
  id: crypto.randomUUID(),
  user_id: crypto.randomUUID(),
  role: 'analista_juridico',
  ...overrides,
});

// =====================
// ORGANIZATION MEMBER FACTORIES
// =====================

export interface TestOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_in_org: 'owner' | 'admin' | 'member';
  is_active: boolean;
  joined_at: string;
}

export const createTestOrganizationMember = (
  overrides: Partial<TestOrganizationMember> = {}
): TestOrganizationMember => ({
  id: crypto.randomUUID(),
  organization_id: crypto.randomUUID(),
  user_id: crypto.randomUUID(),
  role_in_org: 'member',
  is_active: true,
  joined_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// CONTRACT FACTORIES
// =====================

export interface TestContract {
  id: string;
  organization_id: string;
  numero_contrato: string;
  titulo: string;
  descricao: string | null;
  tipo: ContractType;
  status: ContractStatus;
  valor_total: number | null;
  moeda: string;
  data_inicio: string | null;
  data_fim: string | null;
  fornecedor_id: string | null;
  created_by: string | null;
  versao: number;
  created_at: string;
  updated_at: string;
}

export const createTestContract = (
  organizationId: string,
  overrides: Partial<TestContract> = {}
): TestContract => ({
  id: crypto.randomUUID(),
  organization_id: organizationId,
  numero_contrato: `CTR-${Date.now()}`,
  titulo: 'Contrato de Teste',
  descricao: 'Descrição do contrato de teste',
  tipo: 'prestacao_servicos',
  status: 'rascunho',
  valor_total: 10000,
  moeda: 'BRL',
  data_inicio: new Date().toISOString().split('T')[0],
  data_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  fornecedor_id: null,
  created_by: null,
  versao: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// SUPPLIER FACTORIES
// =====================

export interface TestSupplier {
  id: string;
  organization_id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  tipo_pessoa: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const createTestSupplier = (
  organizationId: string,
  overrides: Partial<TestSupplier> = {}
): TestSupplier => ({
  id: crypto.randomUUID(),
  organization_id: organizationId,
  nome: 'Fornecedor Teste',
  cnpj: '98.765.432/0001-10',
  cpf: null,
  email: 'fornecedor@teste.com',
  telefone: '(11) 88888-8888',
  tipo_pessoa: 'juridica',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// ALERT FACTORIES
// =====================

export interface TestContractAlert {
  id: string;
  organization_id: string;
  contrato_id: string | null;
  tipo_alerta: string;
  titulo: string;
  mensagem: string | null;
  data_alerta: string;
  enviado: boolean;
  created_at: string;
}

export const createTestContractAlert = (
  organizationId: string,
  overrides: Partial<TestContractAlert> = {}
): TestContractAlert => ({
  id: crypto.randomUUID(),
  organization_id: organizationId,
  contrato_id: null,
  tipo_alerta: 'vencimento',
  titulo: 'Alerta de Teste',
  mensagem: 'Mensagem de alerta de teste',
  data_alerta: new Date().toISOString(),
  enviado: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// AUDIT LOG FACTORIES
// =====================

export interface TestAuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  risk_level: string;
  event_category: string;
  created_at: string;
}

export const createTestAuditLog = (
  organizationId: string,
  overrides: Partial<TestAuditLog> = {}
): TestAuditLog => ({
  id: crypto.randomUUID(),
  organization_id: organizationId,
  user_id: null,
  acao: 'INSERT',
  entidade: 'contratos',
  entidade_id: null,
  dados_anteriores: null,
  dados_novos: { titulo: 'Novo Contrato' },
  risk_level: 'low',
  event_category: 'data',
  created_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// PERMISSION FACTORIES
// =====================

export interface TestPermission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const createTestPermission = (overrides: Partial<TestPermission> = {}): TestPermission => ({
  id: crypto.randomUUID(),
  name: 'contract:read',
  description: 'Permite visualizar contratos',
  category: 'contract',
  ...overrides,
});

// =====================
// 2FA SETTINGS FACTORIES
// =====================

export interface Test2FASettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  totp_secret: string | null;
  backup_codes: string[] | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const createTest2FASettings = (
  userId: string,
  overrides: Partial<Test2FASettings> = {}
): Test2FASettings => ({
  id: crypto.randomUUID(),
  user_id: userId,
  is_enabled: false,
  totp_secret: null,
  backup_codes: null,
  verified_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =====================
// SCENARIO BUILDERS
// =====================

/**
 * Creates a complete multi-tenant test scenario with two organizations
 * and their respective users and data
 */
export const createMultiTenantScenario = () => {
  // Organization A
  const orgA = createTestOrganization({ nome: 'Organização A', slug: 'org-a' });
  const userA = createTestUser({ email: 'user-a@orga.com', full_name: 'Usuário Org A' });
  const memberA = createTestOrganizationMember({
    organization_id: orgA.id,
    user_id: userA.id,
    role_in_org: 'admin',
  });
  const contractA = createTestContract(orgA.id, { titulo: 'Contrato Org A' });
  const supplierA = createTestSupplier(orgA.id, { nome: 'Fornecedor Org A' });

  // Organization B
  const orgB = createTestOrganization({ nome: 'Organização B', slug: 'org-b' });
  const userB = createTestUser({ email: 'user-b@orgb.com', full_name: 'Usuário Org B' });
  const memberB = createTestOrganizationMember({
    organization_id: orgB.id,
    user_id: userB.id,
    role_in_org: 'owner',
  });
  const contractB = createTestContract(orgB.id, { titulo: 'Contrato Org B' });
  const supplierB = createTestSupplier(orgB.id, { nome: 'Fornecedor Org B' });

  return {
    orgA: { organization: orgA, user: userA, member: memberA, contract: contractA, supplier: supplierA },
    orgB: { organization: orgB, user: userB, member: memberB, contract: contractB, supplier: supplierB },
  };
};

/**
 * Creates a complete RBAC test scenario with different roles
 */
export const createRBACScenario = (organizationId: string) => {
  const admin = createTestUser({ email: 'admin@test.com', full_name: 'Administrador' });
  const adminRole = createTestUserRole({ user_id: admin.id, role: 'administrador' });
  const adminMember = createTestOrganizationMember({
    organization_id: organizationId,
    user_id: admin.id,
    role_in_org: 'owner',
  });

  const analyst = createTestUser({ email: 'analyst@test.com', full_name: 'Analista Jurídico' });
  const analystRole = createTestUserRole({ user_id: analyst.id, role: 'analista_juridico' });
  const analystMember = createTestOrganizationMember({
    organization_id: organizationId,
    user_id: analyst.id,
    role_in_org: 'member',
  });

  const consultant = createTestUser({ email: 'consultant@test.com', full_name: 'Consultoria Jurídica' });
  const consultantRole = createTestUserRole({ user_id: consultant.id, role: 'consultoria_juridica' });
  const consultantMember = createTestOrganizationMember({
    organization_id: organizationId,
    user_id: consultant.id,
    role_in_org: 'admin',
  });

  return {
    admin: { user: admin, role: adminRole, member: adminMember },
    analyst: { user: analyst, role: analystRole, member: analystMember },
    consultant: { user: consultant, role: consultantRole, member: consultantMember },
  };
};
