import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDashContratosRisco } from "@/hooks/useDashboardKPIs";

function riskTone(score?: number) {
  if (score == null) return "secondary";
  if (score >= 7) return "destructive";
  if (score >= 4) return "default";
  return "secondary";
}

export function ContratosRiscoSection() {
  const { data, isLoading, error, refetch } = useDashContratosRisco(8);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Contratos com maior risco</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Baseado em análise jurídica</p>
        </div>
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState title="Sem análises de risco" description="Execute análise jurídica nos contratos para ver insights aqui." />
      : (
        <div className="space-y-1">
          {(data as any[]).map((c) => (
            <Link
              key={c.contrato_id}
              to={`/contratos/${c.contrato_id}`}
              className="flex items-center justify-between p-2.5 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.titulo}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {c.numero_contrato}{c.fornecedor_nome ? ` · ${c.fornecedor_nome}` : ""}
                </p>
              </div>
              <Badge variant={riskTone(c.score_risco) as any} className="ml-3 shrink-0 tabular-nums">
                {Number(c.score_risco).toFixed(1)}
              </Badge>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
            <Link to="/contratos?ordem=risco">
              Ver todos os contratos em risco <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
