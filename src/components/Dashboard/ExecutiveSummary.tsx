import { motion } from "framer-motion";
import { 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComplianceRing } from "./ComplianceRing";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ExecutiveSummaryProps {
  stats: {
    contratosAtivos: number;
    valorTotal: number;
    riscosAltos: number;
    vencendo30Dias: number;
  };
  conformidade?: number;
  onToggleView: () => void;
}

export function ExecutiveSummary({ stats, conformidade = 92, onToggleView }: ExecutiveSummaryProps) {
  const navigate = useNavigate();

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const metrics = [
    {
      label: "Ativos",
      value: stats.contratosAtivos,
      icon: FileText,
      trend: { value: 12, positive: true },
      onClick: () => navigate("/contratos?status=vigente"),
    },
    {
      label: "Valor Total",
      value: formatCompactCurrency(stats.valorTotal),
      icon: DollarSign,
      trend: { value: 8, positive: true },
      onClick: () => navigate("/contratos"),
    },
    {
      label: "Riscos",
      value: stats.riscosAltos,
      icon: AlertTriangle,
      isCritical: stats.riscosAltos > 0,
      onClick: () => navigate("/contratos"),
    },
    {
      label: "Vence 30d",
      value: stats.vencendo30Dias,
      icon: Clock,
      isCritical: stats.vencendo30Dias > 5,
      onClick: () => navigate("/alertas"),
    },
  ];

  // Generate insight based on data
  const getInsight = () => {
    const insights: string[] = [];
    
    if (stats.riscosAltos > 0) {
      insights.push(`${stats.riscosAltos} contrato${stats.riscosAltos > 1 ? 's' : ''} com risco alto requer${stats.riscosAltos > 1 ? 'em' : ''} revisão jurídica`);
    }
    
    if (stats.vencendo30Dias > 0) {
      insights.push(`${stats.vencendo30Dias} contrato${stats.vencendo30Dias > 1 ? 's' : ''} vence${stats.vencendo30Dias > 1 ? 'm' : ''} em 30 dias`);
    }

    if (insights.length === 0) {
      insights.push("Todos os indicadores estão dentro do esperado");
    }

    return insights.join(". ") + ".";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold tracking-tight">
              Resumo Executivo
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleView}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver detalhado
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {/* Metrics */}
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.button
                  key={metric.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={metric.onClick}
                  className={cn(
                    "text-left p-3 rounded-lg transition-all hover:bg-muted/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn(
                      "h-4 w-4",
                      metric.isCritical ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl font-bold tracking-tight",
                      metric.isCritical && "text-destructive"
                    )}>
                      {metric.value}
                    </span>
                    {metric.trend && (
                      <span className={cn(
                        "text-xs font-medium flex items-center gap-0.5",
                        metric.trend.positive ? "text-emerald-600" : "text-destructive"
                      )}>
                        {metric.trend.positive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {metric.trend.value}%
                      </span>
                    )}
                    {metric.isCritical && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Crítico
                      </Badge>
                    )}
                  </div>
                </motion.button>
              );
            })}

            {/* Compliance Ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center p-2"
            >
              <span className="text-xs text-muted-foreground mb-1">Conformidade</span>
              <ComplianceRing value={conformidade} size={56} strokeWidth={5} />
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-4 py-3 rounded-lg bg-muted/30 border border-border"
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Insight: </span>
          {getInsight()}
        </p>
      </motion.div>
    </motion.div>
  );
}
