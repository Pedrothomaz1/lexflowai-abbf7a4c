import { vi } from 'vitest';

// Organization type matching the database schema
export interface MockOrganization {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  logo_url: string | null;
  plano: string;
  max_usuarios: number;
  is_active: boolean;
  configuracoes: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Organization member type
export interface MockOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_in_org: 'owner' | 'admin' | 'member';
  is_active: boolean;
  invited_by: string | null;
  joined_at: string;
}

// Create mock organization
export const createMockOrganization = (overrides: Partial<MockOrganization> = {}): MockOrganization => ({
  id: crypto.randomUUID(),
  nome: 'Test Organization',
  slug: 'test-org',
  cnpj: '12.345.678/0001-99',
  email_contato: 'contact@testorg.com',
  telefone: '(11) 99999-9999',
  endereco: 'Rua Teste, 123',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01234-567',
  logo_url: null,
  plano: 'basico',
  max_usuarios: 10,
  is_active: true,
  configuracoes: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Create mock organization member
export const createMockOrganizationMember = (
  overrides: Partial<MockOrganizationMember> = {}
): MockOrganizationMember => ({
  id: crypto.randomUUID(),
  organization_id: crypto.randomUUID(),
  user_id: crypto.randomUUID(),
  role_in_org: 'member',
  is_active: true,
  invited_by: null,
  joined_at: new Date().toISOString(),
  ...overrides,
});

// Mock OrganizationContext value
export interface MockOrganizationContextValue {
  organization: MockOrganization | null;
  loading: boolean;
  isOwner: boolean;
  isOrgAdmin: boolean;
  refresh: () => Promise<void>;
}

export const createMockOrganizationContext = (
  overrides: Partial<MockOrganizationContextValue> = {}
): MockOrganizationContextValue => ({
  organization: null,
  loading: false,
  isOwner: false,
  isOrgAdmin: false,
  refresh: vi.fn(() => Promise.resolve()),
  ...overrides,
});

// Create context with organization
export const createOrganizationContext = (
  orgOverrides: Partial<MockOrganization> = {},
  role: 'owner' | 'admin' | 'member' = 'member'
): MockOrganizationContextValue => {
  const organization = createMockOrganization(orgOverrides);
  return {
    organization,
    loading: false,
    isOwner: role === 'owner',
    isOrgAdmin: role === 'owner' || role === 'admin',
    refresh: vi.fn(() => Promise.resolve()),
  };
};

// Mock useOrganization hook
export const mockUseOrganization = vi.fn(() => createMockOrganizationContext());

// Reset organization mocks
export const resetOrganizationMocks = () => {
  mockUseOrganization.mockReset();
  mockUseOrganization.mockReturnValue(createMockOrganizationContext());
};
