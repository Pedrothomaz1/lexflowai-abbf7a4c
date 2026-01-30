import { vi } from 'vitest';

// Type for mock function to avoid type errors
type MockFn = ReturnType<typeof vi.fn>;

// Chainable mock builder for Supabase queries
const createChainableMock = () => {
  const chain: Record<string, MockFn> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    like: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    is: vi.fn(() => chain),
    in: vi.fn(() => chain),
    contains: vi.fn(() => chain),
    containedBy: vi.fn(() => chain),
    range: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
  };
  return chain;
};

// Mock Supabase Auth
export const mockSupabaseAuth = {
  getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
  signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  onAuthStateChange: vi.fn((callback) => {
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: null, error: null })),
  updateUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
};

// Mock Supabase Storage
export const mockSupabaseStorage = {
  from: vi.fn(() => ({
    upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
    download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
    remove: vi.fn(() => Promise.resolve({ data: [], error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.pdf' } })),
    list: vi.fn(() => Promise.resolve({ data: [], error: null })),
  })),
};

// Mock Supabase Functions
export const mockSupabaseFunctions = {
  invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

// Main Supabase client mock
export const mockSupabaseClient = {
  from: vi.fn((table: string) => createChainableMock()),
  auth: mockSupabaseAuth,
  storage: mockSupabaseStorage,
  functions: mockSupabaseFunctions,
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() })),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
};

// Helper to reset all mocks
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
};

// Helper to setup successful query response
export const mockQuerySuccess = (data: any) => {
  const chain = createChainableMock();
  chain.then = vi.fn((resolve) => resolve({ data, error: null }));
  chain.single = vi.fn(() => Promise.resolve({ data: data[0] || data, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: data[0] || data, error: null }));
  return chain;
};

// Helper to setup failed query response
export const mockQueryError = (message: string, code?: string) => {
  const chain = createChainableMock();
  const error = { message, code: code || 'PGRST116' };
  chain.then = vi.fn((resolve) => resolve({ data: null, error }));
  chain.single = vi.fn(() => Promise.resolve({ data: null, error }));
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error }));
  return chain;
};

// Helper to simulate RLS violation
export const mockRLSViolation = () => {
  return mockQueryError('new row violates row-level security policy', '42501');
};

// Helper to mock authenticated user
export const mockAuthenticatedUser = (userId: string, email: string = 'test@example.com') => {
  const user = {
    id: userId,
    email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
  };
  
  const session = {
    user,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000,
  };

  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session }, error: null });
  mockSupabaseAuth.getUser.mockResolvedValue({ data: { user }, error: null });
  
  return { user, session };
};

// Helper to mock unauthenticated state
export const mockUnauthenticated = () => {
  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
};

export default mockSupabaseClient;
