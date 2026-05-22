import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "analista_juridico" | "administrador" | null;
export type ModuloPadrao = "contratos" | "servicos" | "ambos";

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [moduloPadrao, setModuloPadrao] = useState<ModuloPadrao>("contratos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, modulo_padrao")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar role:", error);
        setUserRole(null);
      } else {
        setUserRole(data?.role as UserRole);
        setModuloPadrao((data?.modulo_padrao as ModuloPadrao) || "contratos");
      }
    } catch (error) {
      console.error("Erro ao buscar role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const updateModuloPadrao = async (novoModulo: ModuloPadrao) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("user_roles")
        .update({ modulo_padrao: novoModulo })
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar módulo:", error);
        return false;
      }

      setModuloPadrao(novoModulo);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar módulo:", error);
      return false;
    }
  };

  const isAnalista = userRole === "analista_juridico";
  const isConsultor = userRole === "consultoria_juridica";
  const isAdmin = userRole === "administrador";
  const canApprove = isConsultor || isAdmin;
  const canManageUsers = isAdmin;

  return {
    userRole,
    moduloPadrao,
    loading,
    isAnalista,
    isConsultor,
    isAdmin,
    canApprove,
    canManageUsers,
    updateModuloPadrao,
    refresh: fetchUserRole,
  };
};
