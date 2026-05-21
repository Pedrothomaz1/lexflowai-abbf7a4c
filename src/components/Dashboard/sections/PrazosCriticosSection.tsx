import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashPrazosCriticos } from "@/hooks/useDashboardKPIs";
import { Button } from "@/components/ui/button";

export function PrazosCriticosSection() {
  const { data, isLoading, error, refetch } = useDashPrazosCriticos(8);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Prazos críticos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Vencendo nos próximos 60 dias</p>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Sem prazos críticos" description="Nada vencendo na janela monitorada." />
      : (
        <div className="space-y-1">
          {(data as any[]).map((item) => {
            const dias = item.dias_restantes;
            const tone = dias < 0 ? "destructive" : dias <= 7 ? "default" : "secondary";
            return (
              <Link
                key={`${item.tipo_registro}-${item.id}`}
                to={item.tipo_registro === "obrigacao" ? `/obrigacoes` : `/contratos/${item.contrato_id}`}
                className="flex items-center justify-between p-2.5 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.tipo_registro}</p>
                </div>
                <Badge variant={tone as any} className="ml-3 shrink-0">
                  {dias < 0 ? `${Math.abs(dias)}d em atraso` : `${dias}d`}
                </Badge>
              </Link>
            );
          })}
          <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
            <Link to="/contratos">Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
