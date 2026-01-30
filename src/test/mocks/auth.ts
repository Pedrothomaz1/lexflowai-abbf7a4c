import { vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';

// Create mock user
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: crypto.randomUUID(),
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  ...overrides,
});

// Create mock session
export const createMockSession = (user: User): Session => ({
  user,
  access_token: 'mock-access-token-' + crypto.randomUUID(),
  refresh_token: 'mock-refresh-token-' + crypto.randomUUID(),
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
});

// Mock AuthContext value
export interface MockAuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export const createMockAuthContext = (overrides: Partial<MockAuthContextValue> = {}): MockAuthContextValue => ({
  session: null,
  user: null,
  loading: false,
  ...overrides,
});

// Create authenticated context
export const createAuthenticatedContext = (userOverrides: Partial<User> = {}): MockAuthContextValue => {
  const user = createMockUser(userOverrides);
  const session = createMockSession(user);
  return {
    session,
    user,
    loading: false,
  };
};

// Create loading context
export const createLoadingContext = (): MockAuthContextValue => ({
  session: null,
  user: null,
  loading: true,
});

// Mock useAuth hook
export const mockUseAuth = vi.fn(() => createMockAuthContext());

// Reset auth mocks
export const resetAuthMocks = () => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue(createMockAuthContext());
};
