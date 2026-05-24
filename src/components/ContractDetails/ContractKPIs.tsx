import { differenceInDays, differenceInMonths, isAfter, isBefore } from "date-fns";
import { motion } from "framer-motion";
import { 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Timer,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractKPIsProps {
  dataInicio: string | null;
  dataFim: string | null;
  status: string;
  valorTotal: number | null;
}

export function ContractKPIs({ dataInicio, dataFim, status, valorTotal }: ContractKPIsProps) {
  const today = new Date();
  const startDate = dataInicio ? new Date(dataInicio) : null;
  const endDate = dataFim ? new Date(dataFim) : null;

  // Calculate days until expiration
  const daysUntilExpiration = endDate ? differenceInDays(endDate, today) : null;
  
  // Calculate contract progress percentage
  let progressPercent = 0;
  if (startDate && endDate) {
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(today, startDate);
    progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : 0;
  }

  // Calculate contract duration in months
  const durationMonths = startDate && endDate ? differenceInMonths(endDate, startDate) : null;

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (!daysUntilExpiration) return 'neutral';
    if (daysUntilExpiration < 0) return 'expired';
    if (daysUntilExpiration <= 30) return 'critical';
    if (daysUntilExpiration <= 60) return 'warning';
    return 'healthy';
  };

  const urgency = getUrgencyLevel();

  const kpis = [
    {
      id: 'days-left',
      label: daysUntilExpiration !== null && daysUntilExpiration < 0 ? 'Vencido há' : 'Dias até vencer',
      value: daysUntilExpiration !== null ? Math.abs(daysUntilExpiration) : '—',
      suffix: 'dias',
      icon: Clock,
      variant: urgency === 'expired' ? 'destructive' :
               urgency === 'critical' ? 'destructive' :
               urgency === 'warning' ? 'warning' : 'success',
      show: !!endDate && status !== 'encerrado' && status !== 'cancelado',
    },
    {
      id: 'progress',
      label: 'Progresso do Contrato',
      value: Math.round(progressPercent),
      suffix: '%',
      icon: Percent,
      variant: progressPercent >= 90 ? 'warning' : 'default',
      showProgress: true,
      progressValue: progressPercent,
      show: !!startDate && !!endDate,
    },
    {
      id: 'duration',
      label: 'Duração Total',
      value: durationMonths !== null ? durationMonths : '—',
      suffix: durationMonths === 1 ? 'mês' : 'meses',
      icon: CalendarDays,
      variant: 'default',
      show: durationMonths !== null,
    },
    {
      id: 'value',
      label: 'Valor Total',
      value: valorTotal ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(valorTotal) : '—',
      suffix: '',
      icon: TrendingUp,
      variant: 'primary',
      show: !!valorTotal,
    },
  ].filter(kpi => kpi.show);

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'primary':
        return 'bg-primary/10 border-primary/20 text-primary';
      default:
        return 'bg-muted border-border text-foreground';
    }
  };

  const getIconClasses = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'text-destructive';
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      case 'primary':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative rounded-lg border p-4 transition-all",
              getVariantClasses(kpi.variant)
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-80">{kpi.label}</span>
              <Icon className={cn("h-4 w-4", getIconClasses(kpi.variant))} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{kpi.value}</span>
              {kpi.suffix && (
                <span className="text-sm opacity-70">{kpi.suffix}</span>
              )}
            </div>
            {kpi.showProgress && (
              <div className="mt-2 h-1.5 bg-background/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kpi.progressValue}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    kpi.progressValue >= 90 ? "bg-warning" :
                    kpi.progressValue >= 70 ? "bg-primary" :
                    "bg-success"
                  )}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
