import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLAIndicatorsCardProps {
  taxaAprovacaoNoPrazo: number;
  taxaRenovacao: number;
  contratosRenovados: number;
}

export function SLAIndicatorsCard({
  taxaAprovacaoNoPrazo,
  taxaRenovacao,
  contratosRenovados,
}: SLAIndicatorsCardProps) {
  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Indicadores de SLA
        </CardTitle>
        <CardDescription className="text-xs">Performance vs Metas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aprovações no prazo</span>
            <span className={cn("font-medium", taxaAprovacaoNoPrazo >= 80 ? "text-emerald-600" : "text-amber-600")}>
              {taxaAprovacaoNoPrazo.toFixed(0)}%
            </span>
          </div>
          <Progress value={taxaAprovacaoNoPrazo} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Meta: 80%</span>
            <span>{taxaAprovacaoNoPrazo >= 80 ? "✓ Atingida" : "⚠ Abaixo"}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de Renovação</span>
            <span className={cn("font-medium", taxaRenovacao >= 70 ? "text-emerald-600" : "text-amber-600")}>
              {taxaRenovacao.toFixed(0)}%
            </span>
          </div>
          <Progress value={taxaRenovacao} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Meta: 70%</span>
            <span>{taxaRenovacao >= 70 ? "✓ Atingida" : "⚠ Abaixo"}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Contratos renovados</span>
            </div>
            <Badge variant="secondary" className="text-xs">{contratosRenovados}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
