import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardFilters } from "./useDashboardFilters";

interface KPIArgs {
  filters: DashboardFilters;
  dataInicio: string;
  dataFim: string;
}

const STALE = 60_000;

function rpcParams(args: KPIArgs) {
  return {
    p_periodo_inicio: args.dataInicio,
    p_periodo_fim: args.dataFim,
    p_tipo: args.filters.tipo.length ? args.filters.tipo : null,
    p_status: args.filters.status.length ? args.filters.status : null,
    p_responsavel: args.filters.responsavel.length ? args.filters.responsavel : null,
    p_fornecedor: args.filters.fornecedor.length ? args.filters.fornecedor : null,
  };
}

function useKpi<T = any>(name: string, key: any, fn: () => any) {
  return useQuery<T>({
    queryKey: ["dash", name, key],
    queryFn: async () => {
      const { data, error } = await fn();
      if (error) throw error;
      return data as T;
    },
    staleTime: STALE,
  });
}

export function useKpiContratosAtivos(args: KPIArgs) {
  return useKpi("contratos_ativos", args, () =>
    supabase.rpc("dash_kpi_contratos_ativos", rpcParams(args) as any),
  );
}

export function useKpiRequisicoesAbertas(args: KPIArgs) {
  return useKpi("requisicoes_abertas", args, () =>
    supabase.rpc("dash_kpi_requisicoes_abertas", {
      p_periodo_inicio: args.dataInicio,
      p_periodo_fim: args.dataFim,
      p_area: args.filters.area.length ? args.filters.area : null,
      p_tipo: args.filters.tipo.length ? args.filters.tipo : null,
    } as any),
  );
}

export function useKpiAprovacoesPendentes(args: KPIArgs) {
  return useKpi("aprovacoes_pendentes", args, () =>
    supabase.rpc("dash_kpi_aprovacoes_pendentes", {
      p_responsavel: args.filters.responsavel.length ? args.filters.responsavel : null,
    } as any),
  );
}

export function useKpiObrigacoesAtraso(args: KPIArgs) {
  return useKpi("obrigacoes_atraso", args, () =>
    supabase.rpc("dash_kpi_obrigacoes_atraso", {
      p_responsavel: args.filters.responsavel.length ? args.filters.responsavel : null,
    } as any),
  );
}

export function useKpiRenovacoes30d(args: KPIArgs) {
  return useKpi("renovacoes_30d", args, () =>
    supabase.rpc("dash_kpi_renovacoes_30d", {
      p_tipo: args.filters.tipo.length ? args.filters.tipo : null,
      p_fornecedor: args.filters.fornecedor.length ? args.filters.fornecedor : null,
    } as any),
  );
}

export function useKpiTempoMedioAssinatura(args: KPIArgs) {
  return useKpi("tempo_medio_assinatura", args, () =>
    supabase.rpc("dash_kpi_tempo_medio_assinatura", {
      p_periodo_inicio: args.dataInicio,
      p_periodo_fim: args.dataFim,
      p_tipo: args.filters.tipo.length ? args.filters.tipo : null,
    } as any),
  );
}

// Seções

export function useDashPipeline(args: KPIArgs) {
  return useKpi("pipeline", args, () =>
    supabase.rpc("dash_pipeline_contratual", {
      p_periodo_inicio: args.dataInicio,
      p_periodo_fim: args.dataFim,
      p_tipo: args.filters.tipo.length ? args.filters.tipo : null,
    } as any),
  );
}

export function useDashPrazosCriticos(limite = 10) {
  return useKpi("prazos_criticos", limite, () =>
    supabase.rpc("dash_prazos_criticos", { p_limite: limite } as any),
  );
}

export function useDashContratosRisco(limite = 10) {
  return useKpi("contratos_risco", limite, () =>
    supabase.rpc("dash_contratos_risco", { p_limite: limite } as any),
  );
}

export function useDashDemandasPorArea(args: KPIArgs) {
  return useKpi("demandas_area", args, () =>
    supabase.rpc("dash_demandas_por_area", {
      p_periodo_inicio: args.dataInicio,
      p_periodo_fim: args.dataFim,
    } as any),
  );
}

export function useDashAprovacoesAcao(apenasMeus = false, limite = 20) {
  return useKpi("aprovacoes_acao", { apenasMeus, limite }, () =>
    supabase.rpc("dash_aprovacoes_acao", {
      p_apenas_meus: apenasMeus,
      p_limite: limite,
    } as any),
  );
}

export function useDashObrigacoesVencidas(limite = 20) {
  return useKpi("obrigacoes_vencidas", limite, () =>
    supabase.rpc("dash_obrigacoes_vencidas", { p_limite: limite } as any),
  );
}

export function useDashEvolucaoTemporal(metrica = "contratos_criados", meses = 6) {
  return useKpi("evolucao_temporal", { metrica, meses }, () =>
    supabase.rpc("dash_evolucao_temporal", { p_metrica: metrica, p_meses: meses } as any),
  );
}
