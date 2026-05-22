import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/components/ui/use-toast";
import { handleDbError } from "@/utils/dbErrorHandler";

export type NegotiationTipo = "proposta" | "contraproposta" | "comentario" | "aceite" | "rejeicao";
export type NegotiationLado = "interno" | "contraparte";
export type NegotiationStatus = "aberto" | "aceito" | "rejeitado" | "superado";

export interface Negotiation {
  id: string;
  contrato_id: string;
  organization_id: string;
  versao_id: string | null;
  parent_id: string | null;
  tipo: NegotiationTipo;
  autor_lado: NegotiationLado;
  conteudo: string | null;
  arquivo_url: string | null;
  status: NegotiationStatus;
  metadata: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNegotiationInput {
  contrato_id: string;
  tipo: NegotiationTipo;
  autor_lado?: NegotiationLado;
  conteudo?: string | null;
  arquivo_url?: string | null;
  versao_id?: string | null;
  parent_id?: string | null;
  metadata?: Record<string, any>;
}

export function useNegociacoes(contratoId: string | undefined) {
  const qc = useQueryClient();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["contract_negotiations", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_negotiations")
        .select("*")
        .eq("contrato_id", contratoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Negotiation[];
    },
  });

  useEffect(() => {
    if (!contratoId) return;
    const channel = supabase
      .channel(`negotiations-${contratoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_negotiations", filter: `contrato_id=eq.${contratoId}` },
        () => qc.invalidateQueries({ queryKey: ["contract_negotiations", contratoId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId, qc]);

  const create = useMutation({
    mutationFn: async (input: CreateNegotiationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      if (!organization?.id) throw new Error("Organização não encontrada");

      const { data, error } = await supabase
        .from("contract_negotiations")
        .insert([{
          organization_id: organization.id,
          contrato_id: input.contrato_id,
          tipo: input.tipo,
          autor_lado: input.autor_lado ?? "interno",
          conteudo: input.conteudo ?? null,
          arquivo_url: input.arquivo_url ?? null,
          versao_id: input.versao_id ?? null,
          parent_id: input.parent_id ?? null,
          metadata: input.metadata ?? {},
          created_by: user.id,
        }])
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Erro", description: handleDbError(e).message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract_negotiations", contratoId] });
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: NegotiationStatus }) => {
      const { data, error } = await supabase
        .from("contract_negotiations")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Atualização bloqueada (sem permissão).");
      return data;
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Erro", description: handleDbError(e).message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract_negotiations", contratoId] });
    },
  });

  return { ...query, create, decide };
}
