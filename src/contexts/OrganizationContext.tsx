import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

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
  refresh: async () => {},
});

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
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

      // Fetch user's organization membership
      const { data: membershipData, error: membershipError } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          role_in_org,
          is_active,
          organizations:organization_id (
            id,
            nome,
            slug,
            cnpj,
            logo_url,
            email_contato,
            telefone,
            endereco,
            cidade,
            estado,
            cep,
            plano,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
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
        // User has no organization
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
    if (!authLoading) {
      fetchOrganization();
    }
  }, [authLoading, fetchOrganization]);

  // Clear state on logout
  useEffect(() => {
    if (!user && !authLoading) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
    }
  }, [user, authLoading]);

  const isOwner = membership?.role_in_org === "owner";
  const isOrgAdmin = membership?.role_in_org === "admin" || isOwner;
  const hasOrganization = !!organization && !!membership;

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
        refresh: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
