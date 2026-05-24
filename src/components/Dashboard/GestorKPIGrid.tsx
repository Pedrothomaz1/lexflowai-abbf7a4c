import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { helpTexts } from "@/lib/help-texts";

interface GestorKPIGridProps {
  stats: {
    contratosVencendo: number;
    valorEmRisco: number;
    servicosEmAlerta: number;
    proximosVencimentos: number;
  };
  formatCurrency: (value: number) => string;
}

export function GestorKPIGrid({ stats, formatCurrency }: GestorKPIGridProps) {
  const navigate = useNavigate();

  return (
    <StatCardGrid columns={4} data-tour="kpi-grid">
      <StatCard
        title="Contratos a Vencer"
        value={stats.contratosVencendo}
        icon={Calendar}
        variant={stats.contratosVencendo > 0 ? "critical" : "default"}
        subtitle="Próximos 30 dias"
        onClick={() => navigate("/alertas")}
        helpText="Vencem em breve. Revise e decida: renovar, renegociar ou encerrar."
      />
      <StatCard
        title="Valor em Risco"
        value={formatCurrency(stats.valorEmRisco)}
        icon={DollarSign}
        variant={stats.valorEmRisco > 0 ? "warning" : "success"}
        subtitle="Contratos em alerta"
        onClick={() => navigate("/alertas")}
        helpText="Impacto financeiro de contratos que precisam de atenção imediata."
      />
      <StatCard
        title="Serviços em Alerta"
        value={stats.servicosEmAlerta}
        icon={AlertTriangle}
        variant={stats.servicosEmAlerta > 0 ? "critical" : "default"}
        subtitle="Ação necessária"
        onClick={() => navigate("/contratos")}
        helpText="Requerem atenção. Revise antes que virem problema."
      />
      <StatCard
        title="Próximos 90 dias"
        value={stats.proximosVencimentos}
        icon={Clock}
        variant="default"
        subtitle="Vencimentos planejados"
        onClick={() => navigate("/calendario")}
        helpText="Agenda de vencimentos. Antecipe negociações e evite gaps."
      />
    </StatCardGrid>
  );
}
