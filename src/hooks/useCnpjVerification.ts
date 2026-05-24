import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CnpjVerifyResult {
  status: string;
  situacao?: string;
  situacao_data?: string | null;
  nome?: string;
  fantasia?: string;
  atividade_principal?: { code?: string; text?: string };
  endereco?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
  email?: string;
  telefone?: string;
  verificado_em?: string;
  cached?: boolean;
  error?: string;
}

export function useCnpjVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CnpjVerifyResult | null>(null);
  const { toast } = useToast();

  const verify = useCallback(
    async (cnpj: string, opts?: { fornecedorId?: string; force?: boolean; silent?: boolean }) => {
      const cleaned = (cnpj || "").replace(/\D/g, "");
      if (cleaned.length !== 14) return null;

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("consultar-cnpj", {
          body: { cnpj: cleaned, fornecedor_id: opts?.fornecedorId, force: opts?.force },
        });
        if (error) {
          if (!opts?.silent) {
            toast({
              variant: "destructive",
              title: "Falha ao consultar CNPJ",
              description: error.message,
            });
          }
          const fail: CnpjVerifyResult = { status: "erro_consulta", error: error.message };
          setResult(fail);
          return fail;
        }
        setResult(data as CnpjVerifyResult);
        return data as CnpjVerifyResult;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  return { verify, loading, result, setResult };
}
