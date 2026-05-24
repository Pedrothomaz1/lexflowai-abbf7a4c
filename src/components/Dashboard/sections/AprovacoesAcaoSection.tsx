import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { CheckSquare, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashAprovacoesAcao } from "@/hooks/useDashboardKPIs";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function AprovacoesAcaoSection() {
  const [apenasMeus, setApenasMeus] = useState(true);
  const { data, isLoading, error, refetch } = useDashAprovacoesAcao(apenasMeus, 6);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            Aprovações que exigem ação
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Fila em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="meus" checked={apenasMeus} onCheckedChange={setApenasMeus} />
          <Label htmlFor="meus" className="text-xs cursor-pointer">Apenas meus</Label>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" />
      : error ? <ErrorState onRetry={() => refetch()} />
      : !data?.length ? <EmptyState icon={CheckSquare} title="Fila zerada" description="Nenhuma aprovação aguardando ação." />
      : (
        <div className="space-y-2">
          {(data as any[]).map((a) => (
            <Link
              key={a.aprovacao_id}
              to={`/contratos/${a.contrato_id}`}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.numero_contrato} · há {Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000)}d
                </p>
              </div>
              <Button size="sm" variant="default" className="ml-3 shrink-0 h-8">
                Revisar
              </Button>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/workflow-aprovacoes">
              Abrir fila de aprovações <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
