import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModuloAtivo = "contratos" | "servicos" | "ambos";

interface ModuloContextType {
  moduloAtivo: ModuloAtivo;
  moduloPadrao: ModuloAtivo;
  setModuloAtivo: (modulo: ModuloAtivo) => void;
  loading: boolean;
}

const ModuloContext = createContext<ModuloContextType | undefined>(undefined);

// Chave para persistir no localStorage
const MODULO_STORAGE_KEY = "lexflow_modulo_ativo";

export function ModuloProvider({ children }: { children: ReactNode }) {
  const [moduloAtivo, setModuloAtivoState] = useState<ModuloAtivo>(() => {
    // Tentar recuperar do localStorage
    const stored = localStorage.getItem(MODULO_STORAGE_KEY);
    if (stored === "contratos" || stored === "servicos") {
      return stored;
    }
    return "contratos";
  });
  const [moduloPadrao, setModuloPadrao] = useState<ModuloAtivo>("ambos");
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
        
        // Se não houver valor no localStorage, definir o módulo ativo baseado no padrão
        const storedModulo = localStorage.getItem(MODULO_STORAGE_KEY);
        if (!storedModulo) {
          // Se módulo padrão for "ambos", começar com "contratos"
          const moduloInicial = modulo === "ambos" ? "contratos" : modulo;
          setModuloAtivoState(moduloInicial);
          localStorage.setItem(MODULO_STORAGE_KEY, moduloInicial);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar módulo padrão:", error);
    } finally {
      setLoading(false);
    }
  };

  // Wrapper para setModuloAtivo que também persiste no localStorage
  const setModuloAtivo = useCallback((modulo: ModuloAtivo) => {
    if (modulo === "contratos" || modulo === "servicos") {
      setModuloAtivoState(modulo);
      localStorage.setItem(MODULO_STORAGE_KEY, modulo);
    }
  }, []);

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
