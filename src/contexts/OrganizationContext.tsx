import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type OrgStatus = "pendente_aprovacao" | "ativa" | "suspensa" | "cancelada";

interface Organization {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  logo_url: string | null;
  email_contato: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  plano: string | null;
  is_active: boolean;
  status: OrgStatus;
  motivo_suspensao: string | null;
}

interface OrganizationMembership {
  organization_id: string;
  role_in_org: string;
  is_active: boolean;
  organization: Organization;
}

interface OrganizationContextType {
  organization: Organization | null;
  membership: OrganizationMembership | null;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  isOrgAdmin: boolean;
  hasOrganization: boolean;
  /** True when membership exists but the org status is not 'ativa' */
  hasInactiveOrganization: boolean;
  orgStatus: OrgStatus | null;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  membership: null,
  loading: true,
  error: null,
  isOwner: false,
  isOrgAdmin: false,
  hasOrganization: false,
  hasInactiveOrganization: false,
  orgStatus: null,
  refresh: async () => {},
});

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization must be used within an OrganizationProvider");
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider = ({ children }: OrganizationProviderProps) => {
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user's organization membership (regardless of org status — we need to know if it's pending/suspended)
      const { data: membershipData, error: membershipError } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          role_in_org,
          is_active,
          organizations:organization_id (
            id, nome, slug, cnpj, logo_url, email_contato, telefone,
            endereco, cidade, estado, cep, plano, is_active,
            status, motivo_suspensao
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error("[OrganizationContext] Membership fetch error:", membershipError);
        setError("Erro ao carregar organização");
        setOrganization(null);
        setMembership(null);
      } else if (membershipData && membershipData.organizations) {
        const org = membershipData.organizations as unknown as Organization;
        setOrganization(org);
        setMembership({
          organization_id: membershipData.organization_id,
          role_in_org: membershipData.role_in_org || "member",
          is_active: membershipData.is_active,
          organization: org,
        });
      } else {
        setOrganization(null);
        setMembership(null);
      }
    } catch (err) {
      console.error("[OrganizationContext] Error:", err);
      setError("Erro ao carregar organização");
      setOrganization(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchOrganization();
  }, [authLoading, fetchOrganization]);

  useEffect(() => {
    if (!user && !authLoading) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
    }
  }, [user, authLoading]);

  const orgStatus: OrgStatus | null = organization?.status ?? null;
  const isOrgActive = orgStatus === "ativa";
  const isOwner = membership?.role_in_org === "owner";
  const isOrgAdmin = membership?.role_in_org === "admin" || isOwner;
  // hasOrganization is TRUE only when org is active (preserves prior behavior for routing)
  const hasOrganization = !!organization && !!membership && isOrgActive;
  const hasInactiveOrganization = !!organization && !!membership && !isOrgActive;

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        membership,
        loading: authLoading || loading,
        error,
        isOwner,
        isOrgAdmin,
        hasOrganization,
        hasInactiveOrganization,
        orgStatus,
        refresh: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
