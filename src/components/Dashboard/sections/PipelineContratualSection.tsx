import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useDashPipeline } from "@/hooks/useDashboardKPIs";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", em_aprovacao: "Em aprovação", aprovado: "Aprovado",
  assinado: "Assinado", vigente: "Vigente", encerrado: "Encerrado", cancelado: "Cancelado",
};

interface Props { filters: DashboardFilters; dataInicio: string; dataFim: string; }

export function PipelineContratualSection({ filters, dataInicio, dataFim }: Props) {
  const { data, isLoading, error, refetch } = useDashPipeline({ filters, dataInicio, dataFim });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Pipeline contratual</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Volume por etapa do ciclo</p>
        </div>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Sem dados no período" />
      : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data as any[]).map(d => ({ ...d, label: STATUS_LABEL[d.status] || d.status }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
