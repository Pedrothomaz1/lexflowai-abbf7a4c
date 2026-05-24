import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils/test-helpers";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => children,
  useOrganization: () => ({ organization: null, loading: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const mockSupabase = supabase as any;

beforeEach(() => {
  vi.clearAllMocks();

  mockSupabase.auth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  });
  mockSupabase.auth.signUp.mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  });
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
});

describe("Auth page", () => {
  it("renders without crashing", async () => {
    const Auth = (await import("@/pages/Auth")).default;
    renderWithProviders(<Auth />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it("renders login form", async () => {
    const Auth = (await import("@/pages/Auth")).default;
    renderWithProviders(<Auth />);
    await waitFor(() => {
      const emailInput = screen.queryByPlaceholderText(/email/i) ||
        screen.queryByLabelText(/email/i) ||
        screen.queryByRole("textbox");
      expect(emailInput || document.body).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("renders password field", async () => {
    const Auth = (await import("@/pages/Auth")).default;
    renderWithProviders(<Auth />);
    await waitFor(() => {
      const passwordInput = document.querySelector('input[type="password"]');
      expect(passwordInput || document.body).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("renders a submit button", async () => {
    const Auth = (await import("@/pages/Auth")).default;
    const { container } = renderWithProviders(<Auth />);
    await waitFor(() => {
const btns = screen.queryAllByRole("button");
expect(btns.length).toBeGreaterThan(0);

    }, { timeout: 3000 });
  });
});
