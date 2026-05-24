import { FileText, Inbox, CheckSquare, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { KPICard } from "./KPICard";
import { Can } from "@/components/auth/Can";
import {
  useKpiContratosAtivos, useKpiRequisicoesAbertas, useKpiAprovacoesPendentes,
  useKpiObrigacoesAtraso, useKpiRenovacoes30d, useKpiTempoMedioAssinatura,
} from "@/hooks/useDashboardKPIs";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";

interface Props {
  filters: DashboardFilters;
  dataInicio: string;
  dataFim: string;
}

export function KPIRow({ filters, dataInicio, dataFim }: Props) {
  const args = { filters, dataInicio, dataFim };

  const ativos = useKpiContratosAtivos(args);
  const requisicoes = useKpiRequisicoesAbertas(args);
  const aprovacoes = useKpiAprovacoesPendentes(args);
  const obrigacoes = useKpiObrigacoesAtraso(args);
  const renovacoes = useKpiRenovacoes30d(args);
  const tempoMedio = useKpiTempoMedioAssinatura(args);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        label="Contratos Vigentes"
        icon={FileText}
        value={ativos.data?.valor}
        delta={ativos.data?.delta_pct}
        loading={ativos.isLoading}
        error={!!ativos.error}
        href="/contratos?status=vigente"
      />

      <Can anyOf={["contract:read_all", "system:admin"]} fallback={null}>
        <KPICard
          label="Requisições Abertas"
          icon={Inbox}
          value={requisicoes.data?.valor}
          loading={requisicoes.isLoading}
          error={!!requisicoes.error}
          href="/requisicoes?status=pendente"
        />
      </Can>

      <Can anyOf={["contract:approve", "system:admin"]} fallback={null}>
        <KPICard
          label="Aprovações Pendentes"
          icon={CheckSquare}
          value={aprovacoes.data?.valor}
          loading={aprovacoes.isLoading}
          error={!!aprovacoes.error}
          href="/workflow-aprovacoes"
          tone={aprovacoes.data?.valor > 0 ? "warning" : "default"}
        />
      </Can>

      <Can anyOf={["contract:read", "system:admin"]} fallback={null}>
        <KPICard
          label="Obrigações em Atraso"
          icon={AlertTriangle}
          value={obrigacoes.data?.valor}
          loading={obrigacoes.isLoading}
          error={!!obrigacoes.error}
          href="/obrigacoes?vencidas=true"
          tone={obrigacoes.data?.valor > 0 ? "danger" : "default"}
        />
      </Can>

      <KPICard
        label="Renovações 30 dias"
        icon={RefreshCw}
        value={renovacoes.data?.valor}
        loading={renovacoes.isLoading}
        error={!!renovacoes.error}
        href="/contratos?renovacao=30d"
      />

      <KPICard
        label="Tempo Médio Assinatura"
        icon={Clock}
        value={tempoMedio.data?.valor}
        unit={tempoMedio.data?.unidade || "dias"}
        loading={tempoMedio.isLoading}
        error={!!tempoMedio.error}
      />
    </div>
  );
}
