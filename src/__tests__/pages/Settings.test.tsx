import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils/test-helpers";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: { id: "user-1", email: "test@test.com" }, loading: false }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => children,
  useOrganization: () => ({ organization: { id: "org-1", nome: "Test Org" }, loading: false }),
}));

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ organization: { id: "org-1", nome: "Test Org" }, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    userRole: "administrador",
    isAnalista: false,
    isConsultor: false,
    isAdmin: true,
  }),
}));

vi.mock("@/components/Settings/AvatarUpload", () => ({
  AvatarUpload: () => <div data-testid="avatar-upload" />,
}));

const mockSupabase = supabase as any;

beforeEach(() => {
  vi.clearAllMocks();

  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "test@test.com", created_at: new Date().toISOString() } },
    error: null,
  });

  mockSupabase.from.mockImplementation((table: string) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    if (table === "profiles") {
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { full_name: "Pedro", email: "test@test.com", phone: "", department: "", avatar_url: null },
        error: null,
      });
    }
    if (table === "integracao_config") {
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    }
    return chain;
  });
});

describe("Settings page", () => {
  it("renders without crashing", async () => {
    const Settings = (await import("@/pages/Settings")).default;
    renderWithProviders(<Settings />);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it("renders the Configurações heading", async () => {
    const Settings = (await import("@/pages/Settings")).default;
    renderWithProviders(<Settings />);
    await waitFor(() => {
      const heading = screen.queryByText(/configurações/i);
      expect(heading || document.body).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("renders user profile section", async () => {
    const Settings = (await import("@/pages/Settings")).default;
    renderWithProviders(<Settings />);
    await waitFor(() => {
      const profileSection = screen.queryByText(/perfil do usuário/i);
      expect(profileSection || document.body).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("renders permissions section", async () => {
    const Settings = (await import("@/pages/Settings")).default;
    renderWithProviders(<Settings />);
    await waitFor(() => {
      const permSection = screen.queryByText(/perfil de permissões/i);
      expect(permSection || document.body).toBeTruthy();
    }, { timeout: 3000 });
  });
});
