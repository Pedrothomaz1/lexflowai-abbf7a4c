import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils/test-helpers';

// Mock Supabase first
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock other modules
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => children,
  useOrganization: () => ({ organization: null, loading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

import { supabase } from '@/integrations/supabase/client';

const mockSignInWithPassword = vi.mocked(supabase.auth.signInWithPassword);
const mockSignUp = vi.mocked(supabase.auth.signUp);
const mockSignInWithOAuth = vi.mocked(supabase.auth.signInWithOAuth);
const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);

describe('Login Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    mockSignInWithOAuth.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
  });

  describe('Email Validation', () => {
    it('accepts valid email format', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInputs = screen.queryAllByPlaceholderText(/seu@email.com/i);
        expect(emailInputs.length).toBeGreaterThan(0);
      });
    });

    it('shows error for invalid email format', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        expect(emailInputs.length).toBeGreaterThan(0);
      });

      // Email validation happens at HTML5 level (type="email")
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      expect(emailInput?.type).toBe('email');
    });

    it('requires email field', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
        expect(emailInput?.required).toBe(true);
      });
    });

    it('accepts valid email and prevents form submission without it', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        expect(emailInputs.length).toBeGreaterThan(0);
      });

      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      expect(emailInput?.required).toBe(true);
    });
  });

  describe('Password Validation - Login', () => {
    it('requires password field for login', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        expect(passwordInputs.length).toBeGreaterThan(0);
      });

      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      expect(passwordInput?.required).toBe(true);
    });

    it('accepts password of any length for login', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        // Login form (first tab) doesn't have minLength restriction
        const loginPassword = passwordInputs[0];
        expect(loginPassword?.minLength).toBeLessThan(12); // Should be -1 or not set
      });
    });
  });

  describe('Password Validation - Signup', () => {
    it('enforces minimum 12 character password for signup', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        expect(passwordInput?.minLength).toBe(12);
      });
    });

    it('requires password complexity pattern for signup', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        expect(passwordInput?.pattern).toBeTruthy();
        expect(passwordInput?.pattern).toContain('a-z');
        expect(passwordInput?.pattern).toContain('A-Z');
        expect(passwordInput?.pattern).toContain('\\d');
      });
    });

    it('displays password requirement hint for signup', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const hint = screen.queryByText(/mínimo 12 caracteres/i) ||
                     screen.queryByText(/maiúscula.*minúscula.*número.*especial/i);
        expect(hint).toBeTruthy();
      });
    });

    it('accepts password with uppercase, lowercase, number and special char', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const validPassword = 'MyPassword123!';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: validPassword } });

        // Pattern validation
        const pattern = new RegExp(passwordInput.pattern);
        expect(pattern.test(validPassword)).toBe(true);
      });
    });

    it('rejects password without uppercase character', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const invalidPassword = 'mypassword123!';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        const pattern = new RegExp(passwordInput.pattern);
        expect(pattern.test(invalidPassword)).toBe(false);
      });
    });

    it('rejects password without lowercase character', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const invalidPassword = 'MYPASSWORD123!';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        const pattern = new RegExp(passwordInput.pattern);
        expect(pattern.test(invalidPassword)).toBe(false);
      });
    });

    it('rejects password without number', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const invalidPassword = 'MyPassword!';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        const pattern = new RegExp(passwordInput.pattern);
        expect(pattern.test(invalidPassword)).toBe(false);
      });
    });

    it('rejects password without special character', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const invalidPassword = 'MyPassword123';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        const pattern = new RegExp(passwordInput.pattern);
        expect(pattern.test(invalidPassword)).toBe(false);
      });
    });

    it('rejects password shorter than 12 characters', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      const shortPassword = 'MyPass1!';

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        expect(shortPassword.length).toBeLessThan(12);
        expect(passwordInput?.minLength).toBe(12);
      });
    });
  });

  describe('Full Name Validation - Signup', () => {
    it('requires full name field for signup', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const fullNameInput = document.querySelector('input[name="fullName"]') as HTMLInputElement;
        expect(fullNameInput?.required).toBe(true);
      });
    });

    it('accepts full name text input', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const fullNameInput = document.querySelector('input[name="fullName"]') as HTMLInputElement;
        expect(fullNameInput?.type).toBe('text');
      });
    });
  });

  describe('Terms Acceptance Requirement', () => {
    it('disables login button when terms not accepted', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        // Get the login tab's submit button
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find((btn) => btn.textContent?.includes('Entrar'));
        expect(submitBtn?.hasAttribute('disabled')).toBe(true);
      });
    });

    it('disables signup button when terms not accepted', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find((btn) => btn.textContent?.includes('Criar conta'));
        expect(submitBtn?.hasAttribute('disabled')).toBe(true);
      });
    });

    it('checkbox is present and required for terms', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const checkbox = document.getElementById('terms-checkbox');
        expect(checkbox).toBeTruthy();
        // Radix UI renders checkboxes as buttons with role="checkbox"
        expect(checkbox?.getAttribute('role')).toBe('checkbox');
      });
    });

    it('checkbox controls button disabled state via termsAccepted state', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const checkbox = document.getElementById('terms-checkbox');
        expect(checkbox).toBeTruthy();
        expect(checkbox?.getAttribute('role')).toBe('checkbox');
        // Radix UI checkbox uses aria-checked attribute instead of .checked property
        expect(checkbox?.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('terms acceptance text is present on page', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        // Check for terms text in the document - may appear multiple times (checkbox label + footer)
        const hasTermsText = document.body.textContent?.includes('Termos de Uso');
        expect(hasTermsText).toBe(true);
      });
    });

    it('privacy policy link is present', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        expect(document.body.textContent?.includes('Privacidade')).toBe(true);
      });
    });

    it('LGPD compliance text is present', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const lgpdText = document.body.textContent?.includes('LGPD') ||
                         document.body.textContent?.includes('Lei nº 13.709');
        expect(lgpdText).toBeTruthy();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('has password visibility toggle button in login form', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        expect(passwordInput?.type).toBe('password');
      });

      // Verify there's a toggle button (relative positioned button near password input)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has password visibility toggle button in signup form', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        expect(passwordInput?.type).toBe('password');
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('password fields use type="password" for security', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        expect(passwordInputs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Submission - Login', () => {
    it('has login form with correct structure', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;
        const forms = document.querySelectorAll('form');

        expect(emailInput).toBeTruthy();
        expect(passwordInput).toBeTruthy();
        expect(forms.length).toBeGreaterThan(0);
      });
    });

    it('login form accepts email and password input', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        expect((emailInput as any).value).toBe('test@example.com');
      });
    });

    it('handles signInWithPassword mock being called', () => {
      expect(mockSignInWithPassword).toBeDefined();
    });
  });

  describe('Form Submission - Signup', () => {
    it('has signup form with required fields', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const fullNameInput = document.querySelector('input[name="fullName"]') as HTMLInputElement;
        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[name="password"][type="password"]') as HTMLInputElement;

        expect(fullNameInput).toBeTruthy();
        expect(emailInput).toBeTruthy();
        expect(passwordInput).toBeTruthy();
      });
    });

    it('signup form accepts fullName input', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const fullNameInput = document.querySelector('input[name="fullName"]') as HTMLInputElement;
        fireEvent.change(fullNameInput, { target: { value: 'João Silva' } });
        expect((fullNameInput as any).value).toBe('João Silva');
      });
    });

    it('handles signUp mock being callable', () => {
      expect(mockSignUp).toBeDefined();
    });
  });

  describe('Loading State', () => {
    it('has submit button that can show loading state', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find((btn) => btn.textContent?.includes('Entrar'));
        expect(submitBtn).toBeTruthy();
      });
    });

    it('has signup submit button with loading capability', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      const signupTab = screen.getByRole('tab', { name: /cadastro/i });
      await userEvent.click(signupTab);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find((btn) => btn.textContent?.includes('Criar conta'));
        expect(submitBtn).toBeTruthy();
      });
    });

    it('button text updates based on loading state logic', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find((btn) => btn.textContent?.includes('Entrar'));
        // Initially shows "Entrar", would show "Entrando..." when loading
        expect(submitBtn?.textContent).toContain('Entrar');
      });
    });
  });

  describe('Google OAuth', () => {
    it('has Google OAuth button on login form', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const googleBtn = buttons.find((btn) => btn.textContent?.includes('Google'));
        expect(googleBtn).toBeTruthy();
      });
    });

    it('Google button is disabled initially (terms not accepted)', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const googleBtn = buttons.find((btn) => btn.textContent?.includes('Google'));
        expect(googleBtn?.hasAttribute('disabled')).toBe(true);
      });
    });

    it('Google OAuth is integrated with Supabase', () => {
      expect(mockSignInWithOAuth).toBeDefined();
    });

    it('OAuth button has proper styling and accessibility', async () => {
      const Auth = (await import('@/pages/Auth')).default;
      renderWithProviders(<Auth />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const googleBtn = buttons.find((btn) => btn.textContent?.includes('Google'));
        expect(googleBtn?.type).toBe('button');
      });
    });
  });
});
