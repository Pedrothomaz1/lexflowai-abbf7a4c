import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar as CalendarIcon, ArrowUpRight } from "lucide-react";

interface Contrato {
  id: string;
  titulo: string;
  data_fim: string;
  valor_total?: number | null;
}

interface ExpiryTimelineSectionProps {
  timelineVencimentos: Contrato[];
  onNavigate: (path: string) => void;
}

function getDaysUntil(date: string) {
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ExpiryTimelineSection({ timelineVencimentos, onNavigate }: ExpiryTimelineSectionProps) {
  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Próximos Vencimentos
        </CardTitle>
        <CardDescription className="text-xs">Contratos nos próximos 90 dias</CardDescription>
      </CardHeader>
      <CardContent>
        {timelineVencimentos.length > 0 ? (
          <div className="space-y-3">
            {timelineVencimentos.slice(0, 8).map((contrato) => {
              const dias = getDaysUntil(contrato.data_fim);
              const urgencia = dias <= 7 ? "destructive" : dias <= 30 ? "warning" : "default";
              return (
                <div
                  key={contrato.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate(`/contratos/${contrato.id}`)}
                >
                  <Badge
                    variant={
                      urgencia === "destructive" ? "destructive" : urgencia === "warning" ? "default" : "secondary"
                    }
                    className="w-14 justify-center shrink-0"
                  >
                    {dias}d
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contrato.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence em {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    {formatCurrency(contrato.valor_total || 0)}
                  </span>
                </div>
              );
            })}
            {timelineVencimentos.length > 8 && (
              <Button variant="ghost" className="w-full text-sm" onClick={() => onNavigate("/calendario")}>
                Ver todos os {timelineVencimentos.length} vencimentos
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <EmptyState
            title="Nenhum vencimento próximo"
            description="Não há contratos vencendo nos próximos 90 dias. Mantenha seus contratos atualizados para receber alertas."
            action={{ label: "Ver Contratos", onClick: () => onNavigate("/contratos") }}
          />
        )}
      </CardContent>
    </Card>
  );
}
