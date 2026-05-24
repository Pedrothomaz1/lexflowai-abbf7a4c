import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

export type ApprovalStep = {
  id: string;
  contrato_id: string;
  ordem: number;
  modo: "serie" | "paralelo";
  minimo_aprovacoes: number;
  status: "pendente" | "aprovado" | "rejeitado" | "cancelado";
  due_at: string | null;
  created_at: string;
  contratos?: {
    numero_contrato: string;
    titulo: string;
    fornecedores?: { nome: string } | null;
  } | null;
  approvers?: Array<{ aprovador_id: string; status: string }>;
};

export type ApprovalDecisionInput = {
  step_id: string;
  decisao: "aprovado" | "rejeitado" | "ajuste";
  motivo?: string;
};

/**
 * Lista os passos de aprovação que o usuário atual é aprovador designado.
 */
export function useMinhasAprovacoes(filter: "pendentes" | "decididas" | "todas" = "pendentes") {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["minhas-aprovacoes", organization?.id, user?.id, filter],
    enabled: !!organization?.id && !!user?.id,
    queryFn: async (): Promise<ApprovalStep[]> => {
      // 1. Passos onde o usuário é aprovador
      const { data: mine } = await supabase
        .from("approval_step_approvers")
        .select("step_id, status")
        .eq("aprovador_id", user!.id);

      const stepIds = (mine ?? []).map((m) => m.step_id);
      if (stepIds.length === 0) return [];

      // 2. Filtra por status
      let q = supabase
        .from("approval_steps")
        .select(`
          *,
          contratos:contrato_id (
            numero_contrato, titulo,
            fornecedores:fornecedor_id ( nome )
          )
        `)
        .in("id", stepIds)
        .order("created_at", { ascending: false });

      if (filter === "pendentes") q = q.eq("status", "pendente");
      if (filter === "decididas") q = q.neq("status", "pendente");

      const { data, error } = await q;
      if (error) throw error;

      // 3. Carrega approvers de cada step
      const ids = (data ?? []).map((s: any) => s.id);
      const approversByStep: Record<string, any[]> = {};
      if (ids.length > 0) {
        const { data: appr } = await supabase
          .from("approval_step_approvers")
          .select("step_id, aprovador_id, status")
          .in("step_id", ids);
        (appr ?? []).forEach((a: any) => {
          (approversByStep[a.step_id] ??= []).push(a);
        });
      }

      return (data ?? []).map((s: any) => ({
        ...s,
        approvers: approversByStep[s.id] ?? [],
      }));
    },
  });

  // Realtime: invalida quando algo muda nas tabelas relevantes
  useEffect(() => {
    if (!organization?.id) return;
    const channel = supabase
      .channel(`aprovacoes-${organization.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_steps" },
        () => queryClient.invalidateQueries({ queryKey: ["minhas-aprovacoes"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_decisions" },
        () => queryClient.invalidateQueries({ queryKey: ["minhas-aprovacoes"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_step_approvers" },
        () => queryClient.invalidateQueries({ queryKey: ["minhas-aprovacoes"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organization?.id, queryClient]);

  return query;
}

/**
 * Registra decisão e (se o passo bateu o mínimo) atualiza status do step.
 */
export function useRegistrarDecisao() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApprovalDecisionInput) => {
      if (!organization?.id || !user?.id) throw new Error("Sessão inválida");

      // 1. Insere decisão (trigger valida motivo obrigatório)
      const { data: dec, error: dErr } = await supabase
        .from("approval_decisions")
        .insert({
          organization_id: organization.id,
          step_id: input.step_id,
          aprovador_id: user.id,
          decisao: input.decisao,
          motivo: input.motivo ?? null,
        })
        .select()
        .maybeSingle();
      if (dErr) throw dErr;

      // 2. Atualiza status do approver
      await supabase
        .from("approval_step_approvers")
        .update({ status: input.decisao, decided_at: new Date().toISOString() })
        .eq("step_id", input.step_id)
        .eq("aprovador_id", user.id)
        .select("id")
        .maybeSingle();

      // 3. Lê step + approvers para decidir se conclui
      const { data: step } = await supabase
        .from("approval_steps")
        .select("id, contrato_id, modo, minimo_aprovacoes, status")
        .eq("id", input.step_id)
        .maybeSingle();

      const { data: appr } = await supabase
        .from("approval_step_approvers")
        .select("status")
        .eq("step_id", input.step_id);

      if (step && step.status === "pendente" && appr) {
        const aprovados = appr.filter((a) => a.status === "aprovado").length;
        const rejeitados = appr.filter((a) => a.status === "rejeitado").length;

        let novoStatus: string | null = null;
        if (rejeitados > 0) {
          novoStatus = "rejeitado";
        } else if (aprovados >= step.minimo_aprovacoes) {
          novoStatus = "aprovado";
        }

        if (novoStatus) {
          await supabase
            .from("approval_steps")
            .update({ status: novoStatus, updated_at: new Date().toISOString() })
            .eq("id", input.step_id)
            .select("id")
            .maybeSingle();

          // Espelha em contract_approvals (compat dashboard)
          await supabase.from("contract_approvals").insert({
            organization_id: organization.id,
            contrato_id: step.contrato_id,
            aprovador_id: user.id,
            status: novoStatus === "aprovado" ? "aprovado" : "rejeitado",
            comentario: input.motivo ?? null,
            data_aprovacao: new Date().toISOString(),
          });
        }
      }

      return dec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-aprovacoes"] });
    },
  });
}

/**
 * Conta aprovações pendentes para o usuário (badge do menu).
 */
export function useAprovacoesPendentesCount() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  return useQuery({
    queryKey: ["aprovacoes-pendentes-count", user?.id, organization?.id],
    enabled: !!user?.id && !!organization?.id,
    queryFn: async () => {
      const { data: mine } = await supabase
        .from("approval_step_approvers")
        .select("step_id")
        .eq("aprovador_id", user!.id)
        .eq("status", "pendente");
      const stepIds = (mine ?? []).map((m) => m.step_id);
      if (stepIds.length === 0) return 0;
      const { count } = await supabase
        .from("approval_steps")
        .select("id", { count: "exact", head: true })
        .in("id", stepIds)
        .eq("status", "pendente");
      return count ?? 0;
    },
  });
}
