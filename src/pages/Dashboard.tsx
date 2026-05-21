import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/ui/page-header";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardRealtime } from "@/hooks/useDashboardRealtime";
import { useKpiContratosAtivos } from "@/hooks/useDashboardKPIs";
import { DashboardFiltersBar } from "@/components/Dashboard/DashboardFilters";
import { SavedViewsMenu } from "@/components/Dashboard/SavedViewsMenu";
import { KPIRow } from "@/components/Dashboard/KPIRow";
import { PipelineContratualSection } from "@/components/Dashboard/sections/PipelineContratualSection";
import { PrazosCriticosSection } from "@/components/Dashboard/sections/PrazosCriticosSection";
import { ContratosRiscoSection } from "@/components/Dashboard/sections/ContratosRiscoSection";
import { DemandasPorAreaSection } from "@/components/Dashboard/sections/DemandasPorAreaSection";
import { AprovacoesAcaoSection } from "@/components/Dashboard/sections/AprovacoesAcaoSection";
import { ObrigacoesVencidasSection } from "@/components/Dashboard/sections/ObrigacoesVencidasSection";
import { EvolucaoTemporalSection } from "@/components/Dashboard/sections/EvolucaoTemporalSection";
import { EmptyOnboardingState } from "@/components/Dashboard/EmptyOnboardingState";
import { Can } from "@/components/auth/Can";
import { trackEvent } from "@/lib/analytics";

export default function Dashboard() {
  const { filters, setFilter, resetFilters, applyFilters, dataInicio, dataFim, activeCount } =
    useDashboardFilters();
  useDashboardRealtime();

  const ativos = useKpiContratosAtivos({ filters, dataInicio, dataFim });
  const isEmpty = !ativos.isLoading && !ativos.error && (ativos.data?.valor ?? 0) === 0;

  useEffect(() => {
    trackEvent("dashboard_view", { filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard | LexFlow</title>
        <meta name="description" content="Visão executiva e operacional dos contratos, aprovações e obrigações da sua organização." />
      </Helmet>

      <PageHeader
        title="Dashboard"
        description="Indicadores executivos e fila operacional em tempo real."
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <DashboardFiltersBar
          filters={filters}
          activeCount={activeCount}
          onChange={setFilter}
          onReset={resetFilters}
        />
        <SavedViewsMenu currentFilters={filters} onApply={applyFilters} />
      </div>

      <KPIRow filters={filters} dataInicio={dataInicio} dataFim={dataFim} />

      {isEmpty && activeCount === 0 ? (
        <EmptyOnboardingState />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Can anyOf={["contract:read_all", "system:admin"]} fallback={null}>
              <PipelineContratualSection filters={filters} dataInicio={dataInicio} dataFim={dataFim} />
            </Can>
            <EvolucaoTemporalSection />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PrazosCriticosSection />
            <Can anyOf={["contract:approve", "system:admin"]} fallback={null}>
              <AprovacoesAcaoSection />
            </Can>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Can anyOf={["contract:read_all", "system:admin"]} fallback={null}>
              <ContratosRiscoSection />
            </Can>
            <ObrigacoesVencidasSection />
          </div>

          <Can anyOf={["contract:read_all", "system:admin"]} fallback={null}>
            <DemandasPorAreaSection filters={filters} dataInicio={dataInicio} dataFim={dataFim} />
          </Can>
        </>
      )}
    </div>
  );
}
