import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModuloAtivo = "contratos" | "servicos" | "ambos";

interface ModuloContextType {
  moduloAtivo: ModuloAtivo;
  moduloPadrao: ModuloAtivo;
  setModuloAtivo: (modulo: ModuloAtivo) => void;
  loading: boolean;
}

const ModuloContext = createContext<ModuloContextType | undefined>(undefined);

export function ModuloProvider({ children }: { children: ReactNode }) {
  const [moduloAtivo, setModuloAtivo] = useState<ModuloAtivo>("contratos");
  const [moduloPadrao, setModuloPadrao] = useState<ModuloAtivo>("contratos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModuloPadrao();
  }, []);

  const fetchModuloPadrao = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("modulo_padrao")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.modulo_padrao) {
        const modulo = data.modulo_padrao as ModuloAtivo;
        setModuloPadrao(modulo);
        // Se não for "ambos", definir o módulo ativo automaticamente
        if (modulo !== "ambos") {
          setModuloAtivo(modulo);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar módulo padrão:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuloContext.Provider value={{ moduloAtivo, moduloPadrao, setModuloAtivo, loading }}>
      {children}
    </ModuloContext.Provider>
  );
}

export function useModulo() {
  const context = useContext(ModuloContext);
  if (context === undefined) {
    throw new Error("useModulo must be used within a ModuloProvider");
  }
  return context;
}
