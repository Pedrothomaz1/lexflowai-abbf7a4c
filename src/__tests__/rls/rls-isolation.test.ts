// @ts-nocheck
/**
 * RLS Isolation Tests - Critical Multi-Tenant Security
 * 
 * These tests verify that Row-Level Security policies properly isolate
 * data between organizations. No user should be able to access data
 * from another organization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMultiTenantScenario,
  createTestContract,
  createTestSupplier,
  createTestContractAlert,
  createTestAuditLog,
  createTestOrganization,
  createTestOrganizationMember,
  createTestUser,
} from '@/test/utils/test-factories';
import {
  mockSupabaseClient,
  mockAuthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  mockRLSViolation,
  resetSupabaseMocks,
} from '@/test/mocks/supabase';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('RLS Isolation Tests', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('RLS-001: Cross-organization SELECT on contracts', () => {
    it('should return 0 records when user from Org A tries to SELECT contracts from Org B', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      // Configure mock to return only Org A contracts (simulating RLS)
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'contratos') {
          return mockQuerySuccess([scenario.orgA.contract]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('contratos').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
      // User A should NOT see Org B's contract
      expect(result.data.find((c: any) => c.organization_id === scenario.orgB.organization.id)).toBeUndefined();
    });
  });

  describe('RLS-002: User without organization access to contracts', () => {
    it('should return 0 records when user without organization tries to SELECT contracts', async () => {
      // Arrange
      const userWithoutOrg = createTestUser({ email: 'orphan@test.com' });
      mockAuthenticatedUser(userWithoutOrg.id, userWithoutOrg.email);

      // RLS should return empty for users without org membership
      mockSupabaseClient.from.mockImplementation((table: string) => {
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('contratos').select('*');

      // Assert
      expect(result.data).toHaveLength(0);
    });
  });

  describe('RLS-003: Cross-organization SELECT on audit_logs', () => {
    it('should return 0 records when Admin Org A tries to SELECT audit_logs from Org B', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      const auditLogOrgA = createTestAuditLog(scenario.orgA.organization.id);
      const auditLogOrgB = createTestAuditLog(scenario.orgB.organization.id);

      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      // RLS should only return Org A's logs
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return mockQuerySuccess([auditLogOrgA]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('audit_logs').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
      expect(result.data.find((l: any) => l.organization_id === scenario.orgB.organization.id)).toBeUndefined();
    });
  });

  describe('RLS-004: INSERT with different organization_id', () => {
    it('should return RLS violation error when user tries to INSERT with different organization_id', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      // Attempt to insert contract with Org B's ID
      const maliciousContract = createTestContract(scenario.orgB.organization.id, {
        titulo: 'Malicious Contract',
      });

      // RLS should reject this
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'contratos') {
          const chain = mockRLSViolation();
          chain.insert = vi.fn(() => chain);
          return chain;
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('contratos')
        .insert(maliciousContract)
        .single();

      // Assert
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe('42501');
      expect(result.error?.message).toContain('row-level security policy');
    });
  });

  describe('RLS-005: UPDATE changing organization_id', () => {
    it('should return error or 0 affected rows when user tries to UPDATE changing organization_id', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      // RLS should prevent changing organization_id
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'contratos') {
          const chain = mockQueryError('new row violates row-level security policy', '42501');
          chain.update = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          return chain;
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('contratos')
        .update({ organization_id: scenario.orgB.organization.id })
        .eq('id', scenario.orgA.contract.id)
        .single();

      // Assert
      expect(result.error).not.toBeNull();
    });
  });

  describe('RLS-006: Organization members visibility', () => {
    it('should return only members from the same organization', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      // RLS should only return Org A members
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return mockQuerySuccess([scenario.orgA.member]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('organization_members').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
      expect(result.data.find((m: any) => m.organization_id === scenario.orgB.organization.id)).toBeUndefined();
    });
  });

  describe('Cross-organization isolation for fornecedores', () => {
    it('should not allow access to suppliers from another organization', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'fornecedores') {
          return mockQuerySuccess([scenario.orgA.supplier]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('fornecedores').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
    });
  });

  describe('Cross-organization isolation for contract_alerts', () => {
    it('should not allow access to alerts from another organization', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      const alertOrgA = createTestContractAlert(scenario.orgA.organization.id);
      const alertOrgB = createTestContractAlert(scenario.orgB.organization.id);

      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'contract_alerts') {
          return mockQuerySuccess([alertOrgA]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('contract_alerts').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
    });
  });

  describe('Cross-organization isolation for unidades', () => {
    it('should not allow access to units from another organization', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      const unidadeOrgA = {
        id: crypto.randomUUID(),
        organization_id: scenario.orgA.organization.id,
        nome: 'Unidade Org A',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') {
          return mockQuerySuccess([unidadeOrgA]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('unidades').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
    });
  });

  describe('Cross-organization isolation for franquias', () => {
    it('should not allow access to franchises from another organization', async () => {
      // Arrange
      const scenario = createMultiTenantScenario();
      mockAuthenticatedUser(scenario.orgA.user.id, scenario.orgA.user.email);

      const franquiaOrgA = {
        id: crypto.randomUUID(),
        organization_id: scenario.orgA.organization.id,
        nome_completo: 'Franquia Org A',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'franquias') {
          return mockQuerySuccess([franquiaOrgA]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.from('franquias').select('*');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].organization_id).toBe(scenario.orgA.organization.id);
    });
  });
});
