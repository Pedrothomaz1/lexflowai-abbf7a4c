import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "lexflow:dashboard:last-view";

export interface DashboardFilters {
  periodo: string; // 7d | 30d | 90d | ytd | custom
  periodoInicio?: string; // ISO date
  periodoFim?: string;
  area: string[];
  tipo: string[];
  status: string[];
  responsavel: string[];
  fornecedor: string[];
}

export const DEFAULT_FILTERS: DashboardFilters = {
  periodo: "30d",
  area: [],
  tipo: [],
  status: [],
  responsavel: [],
  fornecedor: [],
};

function parseList(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Restaurar última view do localStorage se URL vazia
  useEffect(() => {
    if (searchParams.toString() === "") {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        try {
          const params = new URLSearchParams(last);
          if (params.toString()) setSearchParams(params, { replace: true });
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir mudanças
  useEffect(() => {
    const qs = searchParams.toString();
    if (qs) localStorage.setItem(STORAGE_KEY, qs);
  }, [searchParams]);

  const filters: DashboardFilters = useMemo(() => ({
    periodo: searchParams.get("periodo") || "30d",
    periodoInicio: searchParams.get("inicio") || undefined,
    periodoFim: searchParams.get("fim") || undefined,
    area: parseList(searchParams.get("area")),
    tipo: parseList(searchParams.get("tipo")),
    status: parseList(searchParams.get("status")),
    responsavel: parseList(searchParams.get("responsavel")),
    fornecedor: parseList(searchParams.get("fornecedor")),
  }), [searchParams]);

  const setFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ) => {
    const next = new URLSearchParams(searchParams);
    const map: Record<string, string> = {
      periodo: "periodo",
      periodoInicio: "inicio",
      periodoFim: "fim",
      area: "area",
      tipo: "tipo",
      status: "status",
      responsavel: "responsavel",
      fornecedor: "fornecedor",
    };
    const k = map[key as string];
    if (Array.isArray(value)) {
      if (value.length) next.set(k, value.join(",")); else next.delete(k);
    } else if (value) {
      next.set(k, String(value));
    } else {
      next.delete(k);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    localStorage.removeItem(STORAGE_KEY);
  }, [setSearchParams]);

  const applyFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    const next = new URLSearchParams();
    const merged = { ...DEFAULT_FILTERS, ...newFilters };
    if (merged.periodo && merged.periodo !== "30d") next.set("periodo", merged.periodo);
    if (merged.periodoInicio) next.set("inicio", merged.periodoInicio);
    if (merged.periodoFim) next.set("fim", merged.periodoFim);
    if (merged.area?.length) next.set("area", merged.area.join(","));
    if (merged.tipo?.length) next.set("tipo", merged.tipo.join(","));
    if (merged.status?.length) next.set("status", merged.status.join(","));
    if (merged.responsavel?.length) next.set("responsavel", merged.responsavel.join(","));
    if (merged.fornecedor?.length) next.set("fornecedor", merged.fornecedor.join(","));
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  // Resolve período em datas
  const { dataInicio, dataFim } = useMemo(() => {
    const fim = filters.periodoFim ? new Date(filters.periodoFim) : new Date();
    let inicio: Date;
    if (filters.periodo === "custom" && filters.periodoInicio) {
      inicio = new Date(filters.periodoInicio);
    } else if (filters.periodo === "7d") {
      inicio = new Date(); inicio.setDate(inicio.getDate() - 7);
    } else if (filters.periodo === "90d") {
      inicio = new Date(); inicio.setDate(inicio.getDate() - 90);
    } else if (filters.periodo === "ytd") {
      inicio = new Date(new Date().getFullYear(), 0, 1);
    } else {
      inicio = new Date(); inicio.setDate(inicio.getDate() - 30);
    }
    return {
      dataInicio: inicio.toISOString().slice(0, 10),
      dataFim: fim.toISOString().slice(0, 10),
    };
  }, [filters]);

  const activeCount = useMemo(() => {
    let c = 0;
    if (filters.periodo !== "30d") c++;
    c += filters.area.length + filters.tipo.length + filters.status.length;
    c += filters.responsavel.length + filters.fornecedor.length;
    return c;
  }, [filters]);

  return { filters, setFilter, resetFilters, applyFilters, dataInicio, dataFim, activeCount };
}
