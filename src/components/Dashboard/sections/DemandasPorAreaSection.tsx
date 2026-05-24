import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Building2 } from "lucide-react";
import { useDashDemandasPorArea } from "@/hooks/useDashboardKPIs";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";

interface Props { filters: DashboardFilters; dataInicio: string; dataFim: string; }

export function DemandasPorAreaSection({ filters, dataInicio, dataFim }: Props) {
  const { data, isLoading, error, refetch } = useDashDemandasPorArea({ filters, dataInicio, dataFim });
  const max = (data as any[])?.reduce((m, d) => Math.max(m, Number(d.total)), 0) || 1;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Demandas por área</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Requisições no período</p>
        </div>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Sem requisições no período" />
      : (
        <div className="space-y-3">
          {(data as any[]).map((d) => (
            <div key={d.departamento}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium">{d.departamento}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {d.abertas}/{d.total} abertas
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(Number(d.total) / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
