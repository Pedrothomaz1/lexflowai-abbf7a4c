import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashObrigacoesVencidas } from "@/hooks/useDashboardKPIs";

export function ObrigacoesVencidasSection() {
  const { data, isLoading, error, refetch } = useDashObrigacoesVencidas(8);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Obrigações vencidas ou próximas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Janela de 90 dias passados a 7 futuros</p>
        </div>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Tudo em dia" description="Sem obrigações vencidas ou próximas." />
      : (
        <div className="space-y-1">
          {(data as any[]).map((o) => {
            const atrasada = o.dias_atraso > 0;
            return (
              <Link
                key={o.id}
                to={`/contratos/${o.contrato_id}`}
                className="flex items-center justify-between p-2.5 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(o.data_vencimento).toLocaleDateString("pt-BR")}
                    {o.valor && ` · R$ ${Number(o.valor).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <Badge variant={atrasada ? "destructive" : "default"} className="ml-3 shrink-0">
                  {atrasada ? `${o.dias_atraso}d atraso` : `vence em ${Math.abs(o.dias_atraso)}d`}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
