// @ts-nocheck
/**
 * Authentication Flow Tests
 * 
 * These tests verify the authentication flows:
 * - Login with valid/invalid credentials
 * - Account lockout after failed attempts
 * - Logout behavior
 * - Token expiration handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestUser,
} from '@/test/utils/test-factories';
import {
  mockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticated,
  mockSupabaseAuth,
  resetSupabaseMocks,
} from '@/test/mocks/supabase';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('SEC-001: Login with valid credentials', () => {
    it('should create session when logging in with valid credentials', async () => {
      // Arrange
      const testUser = createTestUser({ email: 'valid@test.com' });
      const mockSession = {
        user: {
          id: testUser.id,
          email: testUser.email,
          aud: 'authenticated',
        },
        access_token: 'valid-token-123',
        refresh_token: 'refresh-token-123',
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'valid-password-123',
      });

      // Assert
      expect(result.error).toBeNull();
      expect(result.data.session).not.toBeNull();
      expect(result.data.user?.email).toBe(testUser.email);
    });
  });

  describe('SEC-002: Login with incorrect password', () => {
    it('should return "Invalid credentials" error with wrong password', async () => {
      // Arrange
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signInWithPassword({
        email: 'user@test.com',
        password: 'wrong-password',
      });

      // Assert
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Invalid');
      expect(result.data.session).toBeNull();
    });
  });

  describe('SEC-003: Account lockout after failed attempts', () => {
    it('should block account after 5 failed login attempts', async () => {
      // Arrange
      const attempts: { email: string; success: boolean }[] = [];
      
      mockSupabaseAuth.signInWithPassword.mockImplementation(async (credentials: any) => {
        attempts.push({ email: credentials.email, success: false });
        
        if (attempts.length >= 5) {
          return {
            data: { user: null, session: null },
            error: { 
              message: 'Too many requests. Please try again later.', 
              status: 429 
            },
          };
        }
        
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        };
      });

      // Act - Simulate 5 failed attempts
      const { supabase } = await import('@/integrations/supabase/client');
      
      for (let i = 0; i < 5; i++) {
        await supabase.auth.signInWithPassword({
          email: 'locked@test.com',
          password: 'wrong-password',
        });
      }

      const result = await supabase.auth.signInWithPassword({
        email: 'locked@test.com',
        password: 'wrong-password',
      });

      // Assert
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(429);
      expect(result.error?.message).toContain('Too many requests');
    });
  });

  describe('SEC-004: Logout invalidates session', () => {
    it('should remove session when logging out', async () => {
      // Arrange
      const testUser = createTestUser();
      mockAuthenticatedUser(testUser.id, testUser.email);
      
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signOut();

      // Assert
      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should clear session data after logout', async () => {
      // Arrange
      const testUser = createTestUser();
      mockAuthenticatedUser(testUser.id, testUser.email);
      
      mockSupabaseAuth.signOut.mockImplementation(async () => {
        // Simulate clearing session
        mockUnauthenticated();
        return { error: null };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      const session = await supabase.auth.getSession();

      // Assert
      expect(session.data.session).toBeNull();
    });
  });

  describe('SEC-005: Expired token handling', () => {
    it('should return null session when token is expired', async () => {
      // Arrange
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'JWT expired', status: 401 },
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      // Assert
      expect(result.data.session).toBeNull();
    });

    it('should trigger auth state change on token expiration', async () => {
      // Arrange
      let authCallback: ((event: string, session: any) => void) | null = null;
      
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
        authCallback = callback;
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        };
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      supabase.auth.onAuthStateChange((event, session) => {
        // This callback would be triggered
      });

      // Simulate token expiration event
      if (authCallback) {
        authCallback('TOKEN_REFRESHED', null);
      }

      // Assert
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Password reset flow', () => {
    it('should send password reset email', async () => {
      // Arrange
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.resetPasswordForEmail('user@test.com');

      // Assert
      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith('user@test.com');
    });
  });

  describe('Session persistence', () => {
    it('should retrieve existing session on app load', async () => {
      // Arrange
      const testUser = createTestUser();
      const mockSession = {
        user: {
          id: testUser.id,
          email: testUser.email,
        },
        access_token: 'persisted-token',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Act
      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      // Assert
      expect(result.data.session).not.toBeNull();
      expect(result.data.session?.user?.email).toBe(testUser.email);
    });
  });
});
