import { useNavigate } from "react-router-dom";
import { Building2, Clock, RefreshCcw } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface FranquiasKPIGridProps {
  stats: {
    ativas: number;
    proximoVencer: number;
    emRenovacao: number;
  };
}

export function FranquiasKPIGrid({ stats }: FranquiasKPIGridProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[hsl(var(--lexflow-mostarda))]" />
        <h3 className="text-sm font-semibold text-foreground">Franquias</h3>
      </div>
      <StatCardGrid columns={3}>
        <StatCard
          title="Franquias Ativas"
          value={stats.ativas}
          icon={Building2}
          variant="default"
          subtitle="Em operação"
          onClick={() => navigate("/franquias?status=ativo")}
          helpText="Total de franquias com contrato ativo."
          className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
        />
        <StatCard
          title="Próximas ao Vencimento"
          value={stats.proximoVencer}
          icon={Clock}
          variant={stats.proximoVencer > 0 ? "warning" : "default"}
          subtitle="Próximos 90 dias"
          onClick={() => navigate("/franquias?status=proximo_vencer")}
          helpText="Franquias que vencem nos próximos 90 dias."
          className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
        />
        <StatCard
          title="Em Renovação"
          value={stats.emRenovacao}
          icon={RefreshCcw}
          variant={stats.emRenovacao > 0 ? "primary" : "default"}
          subtitle="Workflow ativo"
          onClick={() => navigate("/franquias")}
          helpText="Franquias em processo de renovação de contrato."
          className="border-l-2 border-l-[hsl(var(--lexflow-mostarda))]"
        />
      </StatCardGrid>
    </div>
  );
}
