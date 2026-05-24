import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockSupabaseFrom = vi.mocked(supabase.from);

describe('usePermissions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('Loading State', () => {
    it('initializes with loading state true', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false when no user is present', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions).toEqual([]);
    });
  });

  describe('Permission Checking Methods', () => {
    beforeEach(() => {
      // Setup mock user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      };

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        // Simulate user login
        callback('SIGNED_IN', {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: mockUser,
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      // Mock role and permissions queries
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: { role: 'approver' },
                error: null,
              }),
            }),
          } as any;
        }

        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { permission_id: 'perm1', permissions: { name: 'contract:read' } },
                { permission_id: 'perm2', permissions: { name: 'contract:approve' } },
              ],
              error: null,
            }),
          } as any;
        }

        if (table === 'mfa_requirements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_required: true, grace_period_days: 30 },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });
    });

    it('hasPermission checks single permission', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission('contract:read')).toBe(true);
      expect(result.current.hasPermission('contract:delete')).toBe(false);
    });

    it('hasAnyPermission checks if user has any of specified permissions', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAnyPermission(['contract:read', 'contract:delete'])).toBe(true);
      expect(result.current.hasAnyPermission(['user:manage_roles', 'system:admin'])).toBe(false);
    });

    it('hasAllPermissions checks if user has all specified permissions', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasAllPermissions(['contract:read', 'contract:approve'])).toBe(true);
      expect(result.current.hasAllPermissions(['contract:read', 'contract:delete'])).toBe(false);
    });
  });

  describe('Convenience Permission Flags', () => {
    it('returns correct permission flags', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'approver@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      };

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        callback('SIGNED_IN', {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: mockUser,
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: { role: 'approver' },
                error: null,
              }),
            }),
          } as any;
        }

        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { permissions: { name: 'contract:read' } },
                { permissions: { name: 'contract:approve' } },
              ],
              error: null,
            }),
          } as any;
        }

        if (table === 'mfa_requirements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_required: true, grace_period_days: 30 },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canViewContracts).toBe(true);
      expect(result.current.canApproveContracts).toBe(true);
      expect(result.current.canCreateContracts).toBe(false);
      expect(result.current.isSystemAdmin).toBe(false);
    });
  });

  describe('MFA Requirement', () => {
    it('sets mfaRequired based on role', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'mfa@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      };

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        callback('SIGNED_IN', {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: mockUser,
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          } as any;
        }

        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          } as any;
        }

        if (table === 'mfa_requirements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_required: true, grace_period_days: 7 },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.mfaRequired).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles role fetch errors gracefully', async () => {
      const mockUser = {
        id: 'user-error',
        email: 'error@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      };

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        callback('SIGNED_IN', {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: mockUser,
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Role fetch failed'),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash and permissions should be empty
      expect(result.current.permissions).toEqual([]);
    });
  });

  describe('Refresh Permissions', () => {
    it('exposes refresh function to manually reload permissions', async () => {
      const mockUser = {
        id: 'user-refresh',
        email: 'refresh@example.com',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      };

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        callback('SIGNED_IN', {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: mockUser,
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            }),
          } as any;
        }

        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          } as any;
        }

        if (table === 'mfa_requirements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });
  });
});
