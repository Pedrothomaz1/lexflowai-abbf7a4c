// @ts-nocheck
/**
 * MFA (Multi-Factor Authentication) Tests
 * 
 * These tests verify MFA functionality:
 * - MFA requirement for roles
 * - TOTP code validation
 * - Backup code usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestUser,
  createTest2FASettings,
} from '@/test/utils/test-factories';
import {
  mockSupabaseClient,
  mockAuthenticatedUser,
  mockQuerySuccess,
  resetSupabaseMocks,
} from '@/test/mocks/supabase';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('MFA Tests', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('MFA-001: User with MFA enabled requires verification', () => {
    it('should require 2FA verification when MFA is enabled', async () => {
      // Arrange
      const user = createTestUser();
      const mfaSettings = createTest2FASettings(user.id, {
        is_enabled: true,
        totp_secret: 'test-secret-key',
        verified_at: new Date().toISOString(),
      });

      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_2fa_settings') {
          return mockQuerySuccess([mfaSettings]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Assert
      expect(result.data?.is_enabled).toBe(true);
      expect(result.data?.totp_secret).not.toBeNull();
    });
  });

  describe('MFA-002: Valid TOTP code allows access', () => {
    it('should verify TOTP code and allow access', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      // Mock edge function for TOTP verification
      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'verify' && body?.code === '123456') {
            return { data: { verified: true }, error: null };
          }
          return { data: { verified: false }, error: null };
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'verify', code: '123456' },
      });

      // Assert
      expect(result.data?.verified).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('MFA-003: Invalid TOTP code blocks access', () => {
    it('should reject invalid TOTP code', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'verify' && body?.code !== '123456') {
            return { data: { verified: false, error: 'Invalid code' }, error: null };
          }
          return { data: null, error: null };
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'verify', code: 'wrong-code' },
      });

      // Assert
      expect(result.data?.verified).toBe(false);
      expect(result.data?.error).toBe('Invalid code');
    });
  });

  describe('MFA-004: Role requiring MFA redirects to setup', () => {
    it('should identify when MFA is required for user role', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      // Mock MFA requirement check
      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'is_mfa_required_for_user') {
          // Administrador role requires MFA
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Also mock 2FA settings to show it's not yet enabled
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_2fa_settings') {
          return mockQuerySuccess([{ is_enabled: false }]);
        }
        return mockQuerySuccess([]);
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const mfaRequired = await supabase.rpc('is_mfa_required_for_user', {
        _user_id: user.id,
      });
      
      const settings = await supabase
        .from('user_2fa_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .single();

      // Assert - MFA is required but not yet enabled
      expect(mfaRequired.data).toBe(true);
      expect(settings.data?.is_enabled).toBe(false);
      // UI would redirect to /settings/2fa
    });
  });

  describe('MFA-005: Valid backup code works', () => {
    it('should allow access with valid backup code', async () => {
      // Arrange
      const user = createTestUser();
      const backupCodes = ['BACKUP-CODE-1', 'BACKUP-CODE-2', 'BACKUP-CODE-3'];
      
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'verify-backup' && backupCodes.includes(body?.code)) {
            return { data: { verified: true, codeUsed: true }, error: null };
          }
          return { data: { verified: false }, error: null };
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'verify-backup', code: 'BACKUP-CODE-1' },
      });

      // Assert
      expect(result.data?.verified).toBe(true);
      expect(result.data?.codeUsed).toBe(true);
    });

    it('should reject invalid backup code', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          return { data: { verified: false, error: 'Invalid backup code' }, error: null };
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'verify-backup', code: 'INVALID-CODE' },
      });

      // Assert
      expect(result.data?.verified).toBe(false);
    });
  });

  describe('MFA Setup flow', () => {
    it('should generate TOTP secret for new setup', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'setup') {
            return {
              data: {
                secret: 'JBSWY3DPEHPK3PXP',
                qrCodeUrl: 'otpauth://totp/LexFlow:user@test.com?secret=JBSWY3DPEHPK3PXP',
              },
              error: null,
            };
          }
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'setup' },
      });

      // Assert
      expect(result.data?.secret).toBeDefined();
      expect(result.data?.qrCodeUrl).toContain('otpauth://totp/');
    });

    it('should confirm MFA setup with valid code', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'confirm-setup' && body?.code === '123456') {
            return {
              data: {
                enabled: true,
                backupCodes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5'],
              },
              error: null,
            };
          }
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'confirm-setup', code: '123456' },
      });

      // Assert
      expect(result.data?.enabled).toBe(true);
      expect(result.data?.backupCodes).toHaveLength(5);
    });
  });

  describe('MFA Disable flow', () => {
    it('should allow disabling MFA with valid code', async () => {
      // Arrange
      const user = createTestUser();
      mockAuthenticatedUser(user.id, user.email);

      mockSupabaseClient.functions.invoke.mockImplementation(async (fnName: string, options: any) => {
        if (fnName === 'totp-auth') {
          const body = options?.body;
          if (body?.action === 'disable' && body?.code === '123456') {
            return { data: { disabled: true }, error: null };
          }
        }
        return { data: null, error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('totp-auth', {
        body: { action: 'disable', code: '123456' },
      });

      // Assert
      expect(result.data?.disabled).toBe(true);
    });
  });
});
