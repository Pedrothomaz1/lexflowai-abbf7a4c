import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface SavedView {
  id: string;
  nome: string;
  filtros: Record<string, any>;
  is_shared: boolean;
  user_id: string;
  created_at: string;
}

export function useSavedViews() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const qc = useQueryClient();

  const list = useQuery<SavedView[]>({
    queryKey: ["dashboard_saved_views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_saved_views")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SavedView[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { nome: string; filtros: Record<string, any>; is_shared?: boolean }) => {
      if (!user || !organization) throw new Error("Sessão inválida");
      const { data, error } = await supabase
        .from("dashboard_saved_views")
        .insert({
          nome: input.nome,
          filtros: input.filtros,
          is_shared: input.is_shared ?? false,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_saved_views"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_saved_views"] }),
  });

  return { savedViews: list.data || [], loading: list.isLoading, create, remove };
}
