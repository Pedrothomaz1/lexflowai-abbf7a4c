import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { vi as vMocked } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockSignOut = vi.mocked(supabase.auth.signOut);

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
  });

  describe('Hook Initialization', () => {
    it('throws error when used outside AuthProvider', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('useAuth must be used within an AuthProvider');
    });

    it('initializes with loading state', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('initializes with null session and user', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('loads existing session on mount', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {},
          app_metadata: {},
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
    });

    it('sets up auth state change listener', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'user-456',
          email: 'another@example.com',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {},
          app_metadata: {},
        },
      };

      let authStateCallback: Function | null = null;
      mockOnAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Trigger auth state change
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.user).toEqual(mockSession.user);
      });
    });
  });

  describe('Loading State', () => {
    it('sets loading to false after session check', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Logout Flow', () => {
    it('clears session on auth state change to signed out', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'user-789',
          email: 'logout@example.com',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {},
          app_metadata: {},
        },
      };

      let authStateCallback: Function | null = null;
      mockOnAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial login
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      // Logout
      if (authStateCallback) {
        authStateCallback('SIGNED_OUT', null);
      }

      await waitFor(() => {
        expect(result.current.session).toBeNull();
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Subscription Cleanup', () => {
    it('unsubscribes from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      } as any);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { unmount } = renderHook(() => useAuth(), { wrapper });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('handles session retrieval error gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session retrieval failed'),
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still show null session but not crash
      expect(result.current.session).toBeNull();
    });
  });
});
