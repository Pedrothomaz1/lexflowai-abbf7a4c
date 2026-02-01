import { Building2, Clock, RefreshCcw } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface FranquiaQuickStatsProps {
  stats: {
    ativas: number;
    proximoVencer: number;
    emRenovacao: number;
  };
}

export function FranquiaQuickStats({ stats }: FranquiaQuickStatsProps) {
  return (
    <StatCardGrid columns={3}>
      <StatCard
        title="Ativas"
        value={stats.ativas}
        icon={Building2}
        variant="default"
        className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
      />
      <StatCard
        title="A Vencer (90 dias)"
        value={stats.proximoVencer}
        icon={Clock}
        variant={stats.proximoVencer > 0 ? "warning" : "default"}
        className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
      />
      <StatCard
        title="Em Renovação"
        value={stats.emRenovacao}
        icon={RefreshCcw}
        variant={stats.emRenovacao > 0 ? "primary" : "default"}
        className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
      />
    </StatCardGrid>
  );
}
