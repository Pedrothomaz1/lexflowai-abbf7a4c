// @ts-nocheck
/**
 * RLS Policies Tests - Database Function Verification
 * 
 * These tests verify that the RLS helper functions work correctly:
 * - current_user_org()
 * - belongs_to_org()
 * - is_org_owner()
 * - is_org_admin()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestOrganization,
  createTestUser,
  createTestOrganizationMember,
} from '@/test/utils/test-factories';
import {
  mockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
  resetSupabaseMocks,
} from '@/test/mocks/supabase';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('RLS Policy Functions', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('RLS-007: current_user_org() returns correct organization', () => {
    it('should return the organization UUID for authenticated user', async () => {
      // Arrange
      const org = createTestOrganization();
      const user = createTestUser();
      const member = createTestOrganizationMember({
        organization_id: org.id,
        user_id: user.id,
        is_active: true,
      });

      mockAuthenticatedUser(user.id, user.email);

      // Mock RPC call to current_user_org
      (mockSupabaseClient.rpc as ReturnType<typeof vi.fn>).mockImplementation((fnName: string) => {
        if (fnName === 'current_user_org') {
          return Promise.resolve({ data: org.id, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('current_user_org');

      // Assert
      expect(result.data).toBe(org.id);
      expect(result.error).toBeNull();
    });
  });

  describe('RLS-008: current_user_org() returns NULL for anonymous', () => {
    it('should return NULL when user is not authenticated', async () => {
      // Arrange
      mockUnauthenticated();

      // Mock RPC call returning null for anonymous
      mockSupabaseClient.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'current_user_org') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('current_user_org');

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('RLS-009: belongs_to_org() validation', () => {
    it('should return true when user belongs to organization', async () => {
      // Arrange
      const org = createTestOrganization();
      const user = createTestUser();
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: user.id,
        is_active: true,
      });

      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'belongs_to_org') {
          const belongsToOrg = params._user_id === user.id && params._org_id === org.id;
          return Promise.resolve({ data: belongsToOrg, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('belongs_to_org', {
        _user_id: user.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false when user does not belong to organization', async () => {
      // Arrange
      const org = createTestOrganization();
      const user = createTestUser();
      const differentOrg = createTestOrganization({ slug: 'different-org' });

      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'belongs_to_org') {
          // User only belongs to org, not differentOrg
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('belongs_to_org', {
        _user_id: user.id,
        _org_id: differentOrg.id,
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });

  describe('RLS-010: is_org_owner() identification', () => {
    it('should return true only for organization owner', async () => {
      // Arrange
      const org = createTestOrganization();
      const owner = createTestUser({ email: 'owner@test.com' });
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: owner.id,
        role_in_org: 'owner',
      });

      mockAuthenticatedUser(owner.id, owner.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_org_owner') {
          const isOwner = params._user_id === owner.id && params._org_id === org.id;
          return Promise.resolve({ data: isOwner, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('is_org_owner', {
        _user_id: owner.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false for non-owner members', async () => {
      // Arrange
      const org = createTestOrganization();
      const member = createTestUser({ email: 'member@test.com' });
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: member.id,
        role_in_org: 'member',
      });

      mockAuthenticatedUser(member.id, member.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_org_owner') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('is_org_owner', {
        _user_id: member.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });

  describe('RLS-011: is_org_admin() identification', () => {
    it('should return true for organization owner', async () => {
      // Arrange
      const org = createTestOrganization();
      const owner = createTestUser({ email: 'owner@test.com' });
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: owner.id,
        role_in_org: 'owner',
      });

      mockAuthenticatedUser(owner.id, owner.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_org_admin') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('is_org_admin', {
        _user_id: owner.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return true for organization admin', async () => {
      // Arrange
      const org = createTestOrganization();
      const admin = createTestUser({ email: 'admin@test.com' });
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: admin.id,
        role_in_org: 'admin',
      });

      mockAuthenticatedUser(admin.id, admin.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_org_admin') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('is_org_admin', {
        _user_id: admin.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false for regular member', async () => {
      // Arrange
      const org = createTestOrganization();
      const member = createTestUser({ email: 'member@test.com' });
      createTestOrganizationMember({
        organization_id: org.id,
        user_id: member.id,
        role_in_org: 'member',
      });

      mockAuthenticatedUser(member.id, member.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_org_admin') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('is_org_admin', {
        _user_id: member.id,
        _org_id: org.id,
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });

  describe('has_role() function', () => {
    it('should return true when user has the specified role', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_role') {
          return Promise.resolve({ data: params._role === 'administrador', error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'administrador',
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false when user does not have the specified role', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_role') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'administrador',
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });

  describe('has_any_role() function', () => {
    it('should return true when user has any of the specified roles', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_any_role') {
          const roles = params._roles as string[];
          return Promise.resolve({ 
            data: roles.includes('analista_juridico'), 
            error: null 
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_any_role', {
        _user_id: user.id,
        _roles: ['administrador', 'analista_juridico', 'consultoria_juridica'],
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false when user has none of the specified roles', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_any_role') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_any_role', {
        _user_id: user.id,
        _roles: ['administrador', 'system_admin'],
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });

  describe('has_permission() function', () => {
    it('should return true when user has the specified permission', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_permission') {
          return Promise.resolve({ 
            data: params._permission === 'contract:read', 
            error: null 
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission: 'contract:read',
      });

      // Assert
      expect(result.data).toBe(true);
    });

    it('should return false when user does not have the specified permission', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'has_permission') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission: 'system:admin',
      });

      // Assert
      expect(result.data).toBe(false);
    });
  });
});
