import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export type AppRole = "administrador" | "consultoria_juridica" | "analista_juridico";

export function useRoles(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  const { data: roles = [], isLoading: loading } = useQuery({
    queryKey: ["user_roles", targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetId);
      if (error) throw error;
      return data.map((r) => r.role as AppRole);
    },
    enabled: !!targetId,
    staleTime: 5 * 60 * 1000,
  });

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles]
  );

  const isAdmin = roles.includes("administrador");
  const isConsultor = roles.includes("consultoria_juridica");
  const isAnalista = roles.includes("analista_juridico");

  return { roles, loading, hasRole, isAdmin, isConsultor, isAnalista };
}
