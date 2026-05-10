import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (cancelled) return;
      if (error) {
        console.error("[useSuperAdmin] error:", error);
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(!!data);
      }
      setLoading(false);
    };
    if (!authLoading) check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isSuperAdmin, loading };
};
