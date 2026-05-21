import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashEvolucaoTemporal } from "@/hooks/useDashboardKPIs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EvolucaoTemporalSection() {
  const [metrica, setMetrica] = useState("contratos_criados");
  const { data, isLoading, error, refetch } = useDashEvolucaoTemporal(metrica, 6);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Evolução temporal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={metrica} onValueChange={setMetrica}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contratos_criados">Contratos criados</SelectItem>
              <SelectItem value="assinaturas">Assinaturas</SelectItem>
              <SelectItem value="requisicoes">Requisições</SelectItem>
            </SelectContent>
          </Select>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Sem histórico" />
      : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data as any[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
