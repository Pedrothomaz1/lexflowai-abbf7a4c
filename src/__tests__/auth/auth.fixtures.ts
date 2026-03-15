import { vi } from 'vitest';

/**
 * Mock fixtures para testes de Auth.tsx
 * Fornece mocks de Supabase, router, e dados de teste
 */

// Mock de Supabase Auth
export const createMockSupabaseAuth = () => ({
  signInWithOAuth: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  signInWithPassword: vi.fn().mockResolvedValue({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {},
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
      },
    },
    error: null,
  }),
  signUp: vi.fn().mockResolvedValue({
    data: {
      user: {
        id: 'new-user-id',
        email: 'newuser@example.com',
      },
      session: null,
    },
    error: null,
  }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  getSession: vi.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  }),
  verifyOtp: vi.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  }),
  refreshSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: 'new-access-token',
        refresh_token: 'mock-refresh-token',
      },
    },
    error: null,
  }),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
});

// Mock de Supabase Functions
export const createMockSupabaseFunctions = () => ({
  invoke: vi.fn().mockResolvedValue({
    data: { success: true },
    error: null,
  }),
});

// Mock completo de Supabase Client
export const createMockSupabaseClient = () => ({
  auth: createMockSupabaseAuth(),
  functions: createMockSupabaseFunctions(),
});

// Mock de React Router
export const createMockRouter = () => ({
  navigate: vi.fn(),
  pathname: '/',
  search: '',
  hash: '',
  state: null,
});

// Mock de Toast Hook
export const createMockToast = () => ({
  toast: vi.fn(),
});

// Dados de teste para forms
export const testCredentials = {
  valid: {
    email: 'user@example.com',
    password: 'ValidPassword123!',
  },
  invalid: {
    email: 'invalid-email',
    password: 'short',
  },
  signup: {
    email: 'newuser@example.com',
    password: 'NewPassword123!',
    fullName: 'Test User',
  },
};

// Dados de teste para TOTP
export const totpTestData = {
  validToken: '123456',
  expiredToken: '000000',
  invalidToken: '999999',
};

// Dados de teste para Session
export const sessionTestData = {
  validSession: {
    access_token: 'access-token-valid',
    refresh_token: 'refresh-token-valid',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'user-id-123',
      email: 'user@example.com',
      user_metadata: {},
    },
  },
  expiredSession: {
    access_token: 'access-token-expired',
    refresh_token: 'refresh-token-valid',
    expires_in: -1,
    expires_at: Math.floor(Date.now() / 1000) - 3600,
    token_type: 'bearer',
  },
};

// Mocks de erros
export const authErrors = {
  invalidCredentials: {
    message: 'Invalid login credentials',
    status: 400,
  },
  networkError: {
    message: 'Network error',
    status: 0,
  },
  serverError: {
    message: 'Internal server error',
    status: 500,
  },
  tokenExpired: {
    message: 'Token has expired',
    status: 401,
  },
};
