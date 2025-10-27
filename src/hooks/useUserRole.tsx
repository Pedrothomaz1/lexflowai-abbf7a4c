import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "analista_juridico" | "consultoria_juridica" | "administrador" | null;

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
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
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar role:", error);
        setUserRole(null);
      } else {
        setUserRole(data?.role as UserRole);
      }
    } catch (error) {
      console.error("Erro ao buscar role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isAnalista = userRole === "analista_juridico";
  const isConsultor = userRole === "consultoria_juridica";
  const isAdmin = userRole === "administrador";
  const canApprove = isConsultor || isAdmin;
  const canManageUsers = isAdmin;

  return {
    userRole,
    loading,
    isAnalista,
    isConsultor,
    isAdmin,
    canApprove,
    canManageUsers,
    refresh: fetchUserRole,
  };
};
