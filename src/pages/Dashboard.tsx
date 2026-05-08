import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  AlertTriangle,
  Activity,
  Calendar as CalendarIcon,
  Timer,
  Target,
  RefreshCcw,
  Building2,
  ArrowUpRight,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumAreaChart, PremiumBarChart, PremiumDonutChart } from "@/components/charts";
import { ExecutiveSummary, ProximaAcaoCard, FranquiasKPIGrid } from "@/components/Dashboard";
import { SLAIndicatorsCard } from "@/components/Dashboard/SLAIndicatorsCard";
import { TopFornecedoresCard } from "@/components/Dashboard/TopFornecedoresCard";
import { ExpiryTimelineSection } from "@/components/Dashboard/ExpiryTimelineSection";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { helpTexts } from "@/lib/help-texts";

const DASHBOARD_MODE_KEY = 'lexflow_dashboard_mode';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecutiveMode, setIsExecutiveMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DASHBOARD_MODE_KEY) === 'executive';
    }
    return false;
  });
  const [stats, setStats] = useState({
    contratosAtivos: 0,
    fornecedores: 0,
    vencendo30Dias: 0,
    aprovacoesPendentes: 0,
    valorTotal: 0,
    valorMedio: 0,
    riscosAltos: 0,
    tempoMedioAprovacao: 0,
    taxaAprovacaoNoPrazo: 0,
    contratosRenovados: 0,
    taxaRenovacao: 0,
  });
  const [contratosVencendo, setContratosVencendo] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tipoContratoData, setTipoContratoData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [valorMensalData, setValorMensalData] = useState<any[]>([]);
  const [timelineVencimentos, setTimelineVencimentos] = useState<any[]>([]);
  const [topFornecedores, setTopFornecedores] = useState<any[]>([]);
  const [franquiasStats, setFranquiasStats] = useState({
    ativas: 0,
    proximoVencer: 0,
    emRenovacao: 0,
  });

  const toggleDashboardMode = () => {
    const newMode = !isExecutiveMode;
    setIsExecutiveMode(newMode);
    localStorage.setItem(DASHBOARD_MODE_KEY, newMode ? 'executive' : 'detailed');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchStats();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchStats();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStats = async () => {
    const { data: todosContratos } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: contratos } = await supabase
      .from("contratos")
      .select("*")
      .eq("status", "vigente");

    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id");

    const hoje = new Date();
    const data30Dias = new Date();
    data30Dias.setDate(hoje.getDate() + 30);

    const { data: vencendo } = await supabase
      .from("contratos")
      .select("*")
      .gte("data_fim", hoje.toISOString().split("T")[0])
      .lte("data_fim", data30Dias.toISOString().split("T")[0])
      .eq("status", "vigente");

    const { data: aprovacoes } = await supabase
      .from("contract_approvals")
      .select("*");

    const aprovacoesPendentes = aprovacoes?.filter(a => !a.data_aprovacao) || [];
    const aprovacoesCompletas = aprovacoes?.filter(a => a.data_aprovacao) || [];

    let tempoMedioAprovacao = 0;
    if (aprovacoesCompletas.length > 0) {
      const tempos = aprovacoesCompletas.map(a => {
        const criado = new Date(a.created_at);
        const aprovado = new Date(a.data_aprovacao);
        return (aprovado.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24);
      });
      tempoMedioAprovacao = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    }

    const aprovacoesNoPrazo = aprovacoesCompletas.filter(a => {
      const criado = new Date(a.created_at);
      const aprovado = new Date(a.data_aprovacao);
      const dias = (aprovado.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24);
      return dias <= 5;
    });
    const taxaAprovacaoNoPrazo = aprovacoesCompletas.length > 0 
      ? (aprovacoesNoPrazo.length / aprovacoesCompletas.length) * 100 
      : 0;

    const { data: analises } = await supabase
      .from("contract_analysis")
      .select("*, contratos(titulo)");

    const valorTotal = contratos?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) || 0;
    const valorMedio = contratos && contratos.length > 0 ? valorTotal / contratos.length : 0;
    const riscosAltos = analises?.filter((a: any) => (a.score_risco || 0) >= 7).length || 0;

    const contratosEncerrados = todosContratos?.filter(c => c.status === 'encerrado') || [];
    const contratosRenovados = todosContratos?.filter(c => 
      c.observacoes?.toLowerCase().includes('renovado') || 
      c.observacoes?.toLowerCase().includes('renovação')
    ).length || 0;
    const taxaRenovacao = contratosEncerrados.length > 0 
      ? (contratosRenovados / contratosEncerrados.length) * 100 
      : 0;

    const valorPorFornecedor: Record<string, { nome: string; valor: number; count: number }> = {};
    
    const { data: fornecedoresList } = await supabase.from("fornecedores").select("id, nome");
    const fornecedoresMap = new Map(fornecedoresList?.map(f => [f.id, f.nome]) || []);

    todosContratos?.forEach((c: any) => {
      if (c.fornecedor_id) {
        const nome = fornecedoresMap.get(c.fornecedor_id) || 'Desconhecido';
        if (!valorPorFornecedor[c.fornecedor_id]) {
          valorPorFornecedor[c.fornecedor_id] = { nome, valor: 0, count: 0 };
        }
        valorPorFornecedor[c.fornecedor_id].valor += Number(c.valor_total) || 0;
        valorPorFornecedor[c.fornecedor_id].count++;
      }
    });

    const topFornecedoresList = Object.values(valorPorFornecedor)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    
    setTopFornecedores(topFornecedoresList);

    setStats({
      contratosAtivos: contratos?.length || 0,
      fornecedores: fornecedores?.length || 0,
      vencendo30Dias: vencendo?.length || 0,
      aprovacoesPendentes: aprovacoesPendentes.length,
      valorTotal,
      valorMedio,
      riscosAltos,
      tempoMedioAprovacao,
      taxaAprovacaoNoPrazo,
      contratosRenovados,
      taxaRenovacao,
    });

    setContratosVencendo(vencendo || []);

    const data90Dias = new Date();
    data90Dias.setDate(hoje.getDate() + 90);
    const { data: vencimentos90 } = await supabase
      .from("contratos")
      .select("*")
      .gte("data_fim", hoje.toISOString().split("T")[0])
      .lte("data_fim", data90Dias.toISOString().split("T")[0])
      .eq("status", "vigente")
      .order("data_fim", { ascending: true });

    setTimelineVencimentos(vencimentos90 || []);

    if (todosContratos) {
      const monthlyData: Record<string, { contratos: number; valor: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesKey = mes.toLocaleDateString("pt-BR", { month: "short" }).replace('.', '');
        monthlyData[mesKey] = { contratos: 0, valor: 0 };
      }

      todosContratos.forEach((contrato) => {
        const data = new Date(contrato.created_at);
        const mesKey = data.toLocaleDateString("pt-BR", { month: "short" }).replace('.', '');
        if (monthlyData.hasOwnProperty(mesKey)) {
          monthlyData[mesKey].contratos++;
          monthlyData[mesKey].valor += Number(contrato.valor_total) || 0;
        }
      });

      const chartData = Object.entries(monthlyData).map(([mes, data]) => ({
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        contratos: data.contratos,
        valor: data.valor / 1000,
      }));
      setChartData(chartData);
      setValorMensalData(chartData);

      const tipoCount: Record<string, number> = {};
      todosContratos.forEach((contrato: any) => {
        const tipo = contrato.tipo || "outro";
        tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
      });

      const tipoLabels: Record<string, string> = {
        prestacao_servicos: "Serviços",
        fornecimento: "Fornecimento",
        locacao: "Locação",
        confidencialidade: "NDA",
        parceria: "Parceria",
        outro: "Outro",
      };

      setTipoContratoData(
        Object.entries(tipoCount).map(([tipo, value]) => ({
          name: tipoLabels[tipo] || tipo,
          value,
        }))
      );
    }

    if (analises && analises.length > 0) {
      const riskCategories = {
        "Baixo": 0,
        "Médio": 0,
        "Alto": 0,
        "Crítico": 0,
      };

      analises.forEach((analise: any) => {
        const score = analise.score_risco || 0;
        if (score <= 3) riskCategories["Baixo"]++;
        else if (score <= 6) riskCategories["Médio"]++;
        else if (score <= 8) riskCategories["Alto"]++;
        else riskCategories["Crítico"]++;
      });

      setRiskData(
        Object.entries(riskCategories)
          .filter(([_, value]) => value > 0)
          .map(([name, value]) => ({ name, value }))
      );
    }

    // Fetch franquias stats
    const { data: franquias } = await supabase
      .from("franquias")
      .select("status_vigencia, consultora_informada, contrato_novo_assinado");

    if (franquias) {
      const ativas = franquias.filter(f => f.status_vigencia === "ativo").length;
      const proximoVencer = franquias.filter(f => f.status_vigencia === "proximo_vencer").length;
      const emRenovacao = franquias.filter(f => 
        f.consultora_informada && !f.contrato_novo_assinado
      ).length;

      setFranquiasStats({ ativas, proximoVencer, emRenovacao });
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
  ];

  const RISK_COLORS: Record<string, string> = {
    "Baixo": "hsl(142, 76%, 36%)",
    "Médio": "hsl(38, 92%, 50%)",
    "Alto": "hsl(0, 84%, 60%)",
    "Crítico": "hsl(0, 72%, 35%)",
  };

  const getDaysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Visão Geral"
        description="Acompanhe o que precisa de atenção"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <Switch 
                checked={isExecutiveMode} 
                onCheckedChange={toggleDashboardMode}
                aria-label="Alternar modo executivo"
              />
              <Sparkles className={cn(
                "h-4 w-4 transition-colors",
                isExecutiveMode ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <Button onClick={() => navigate("/contratos")} size="sm" className="btn-cta" data-tour="novo-contrato">
              Ver Contratos
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Executive Summary Mode */}
      {isExecutiveMode && (
        <ExecutiveSummary
          stats={{
            contratosAtivos: stats.contratosAtivos,
            valorTotal: stats.valorTotal,
            riscosAltos: stats.riscosAltos,
            vencendo30Dias: stats.vencendo30Dias,
          }}
          conformidade={Math.round(stats.taxaAprovacaoNoPrazo)}
          onToggleView={toggleDashboardMode}
        />
      )}

      {/* Alert */}
      {contratosVencendo.length > 0 && (
        <Alert variant="destructive" className="animate-slide-up" data-tour="alertas">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção: Contratos Vencendo!</AlertTitle>
          <AlertDescription>
            <span>{contratosVencendo.length} contrato(s) vencendo nos próximos 30 dias.</span>
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-destructive-foreground underline"
              onClick={() => navigate("/alertas")}
            >
              Ver detalhes →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed View - Only show when not in Executive Mode */}
      {!isExecutiveMode && (
        <>
          {/* Próxima Ação Card + KPI Cards */}
          <div className="grid gap-6 lg:grid-cols-4">
            <ProximaAcaoCard 
              stats={{
                vencendo7Dias: contratosVencendo.filter(c => getDaysUntil(c.data_fim) <= 7).length,
                vencendo30Dias: stats.vencendo30Dias,
                aprovacoesPendentes: stats.aprovacoesPendentes,
                riscosAltos: stats.riscosAltos,
              }}
              className="lg:col-span-1"
            />
            <div className="lg:col-span-3">
              <StatCardGrid columns={3} data-tour="kpi-grid">
                <StatCard
                  title="Contratos a Vencer"
                  value={stats.vencendo30Dias}
                  icon={Clock}
                  variant={stats.vencendo30Dias > 0 ? "critical" : "default"}
                  subtitle="Próximos 30 dias"
                  onClick={() => navigate("/alertas")}
                  helpText={helpTexts.dashboard.vencendo30Dias}
                />
                <StatCard
                  title="Valor Total"
                  value={formatCompactCurrency(stats.valorTotal)}
                  icon={DollarSign}
                  variant="success"
                  trend={{ value: 8, label: "vs mês anterior" }}
                  onClick={() => navigate("/contratos")}
                  helpText={helpTexts.dashboard.valorTotal}
                />
                <StatCard
                  title="Riscos Identificados"
                  value={stats.riscosAltos}
                  icon={AlertTriangle}
                  variant={stats.riscosAltos > 0 ? "critical" : "default"}
                  subtitle="Precisam de atenção"
                  onClick={() => navigate("/contratos")}
                  helpText={helpTexts.dashboard.riscosAltos}
                />
              </StatCardGrid>
            </div>
          </div>

          {/* KPI Cards - Original row */}
          <StatCardGrid columns={4}>
            <StatCard
              title="Contratos Ativos"
              value={stats.contratosAtivos}
              icon={FileText}
              variant="primary"
              trend={{ value: 12, label: "vs mês anterior" }}
              onClick={() => navigate("/contratos?status=vigente")}
              helpText={helpTexts.dashboard.contratosAtivos}
            />
            <StatCard
              title="Fornecedores"
              value={stats.fornecedores}
              icon={Users}
              subtitle="Cadastrados"
              onClick={() => navigate("/fornecedores")}
              helpText={helpTexts.dashboard.fornecedores}
            />
            <StatCard
              title="Aprovações Pendentes"
              value={stats.aprovacoesPendentes}
              icon={Timer}
              subtitle="Aguardando decisão"
              onClick={() => navigate("/workflows")}
              helpText={helpTexts.dashboard.aprovacoesPendentes}
            />
            <StatCard
              title="Tempo Médio Aprovação"
              value={`${stats.tempoMedioAprovacao.toFixed(1)}d`}
              icon={Target}
              subtitle={stats.tempoMedioAprovacao <= 5 ? "✓ Dentro da meta" : "⚠ Acima da meta"}
              onClick={() => navigate("/workflows")}
              helpText={helpTexts.dashboard.tempoMedioAprovacao}
            />
          </StatCardGrid>
            <StatCard
              title="Fornecedores"
              value={stats.fornecedores}
              icon={Users}
              subtitle="Cadastrados"
              onClick={() => navigate("/fornecedores")}
              helpText={helpTexts.dashboard.fornecedores}
            />
            <StatCard
              title="Valor Médio"
              value={formatCompactCurrency(stats.valorMedio)}
              icon={Activity}
              subtitle="Por contrato"
              onClick={() => navigate("/contratos")}
              helpText={helpTexts.dashboard.valorMedio}
            />
            <StatCard
              title="Aprovações Pendentes"
              value={stats.aprovacoesPendentes}
              icon={Timer}
              subtitle="Aguardando ação"
              onClick={() => navigate("/workflows")}
              helpText={helpTexts.dashboard.aprovacoesPendentes}
            />
            <StatCard
              title="Tempo Médio Aprovação"
              value={`${stats.tempoMedioAprovacao.toFixed(1)}d`}
              icon={Target}
              subtitle={stats.tempoMedioAprovacao <= 5 ? "✓ Dentro da meta" : "⚠ Acima da meta"}
              onClick={() => navigate("/workflows")}
              helpText={helpTexts.dashboard.tempoMedioAprovacao}
            />

          {/* Franquias KPIs Section */}
          <FranquiasKPIGrid stats={franquiasStats} />

          {/* Main Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <SLAIndicatorsCard
              taxaAprovacaoNoPrazo={stats.taxaAprovacaoNoPrazo}
              taxaRenovacao={stats.taxaRenovacao}
              contratosRenovados={stats.contratosRenovados}
            />
            <TopFornecedoresCard
              topFornecedores={topFornecedores}
              onNavigate={navigate}
            />
            <CnpjProblemasCard />
          </div>

          {/* Charts Row - Premium Style */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Evolução de Contratos
                    </CardTitle>
                    <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
                  </div>
                  {chartData.length > 1 && (
                    <Badge className="bg-success/10 text-success border-success/20">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <PremiumAreaChart
                    data={chartData}
                    dataKey="contratos"
                    xAxisKey="mes"
                    height={260}
                    formatter={(v) => `${v} contratos`}
                  />
                ) : (
                  <EmptyState 
                    title="Comece a acompanhar seus contratos" 
                    description="Cadastre seu primeiro contrato para visualizar a evolução aqui."
                    action={{
                      label: "Cadastrar Contrato",
                      onClick: () => navigate("/contratos"),
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <CardTitle className="text-base">Valor por Mês</CardTitle>
                </div>
                <CardDescription className="text-xs">Em milhares (R$)</CardDescription>
              </CardHeader>
              <CardContent>
                {valorMensalData.length > 0 ? (
                  <PremiumBarChart
                    data={valorMensalData}
                    dataKey="valor"
                    xAxisKey="mes"
                    height={260}
                    formatter={(v) => `R$ ${v.toFixed(0)}K`}
                  />
                ) : (
                  <EmptyState 
                    title="Acompanhe valores mensais" 
                    description="Seus indicadores de valor aparecerão aqui após cadastrar contratos."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
                  <CardTitle className="text-base">Contratos por Tipo</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribuição atual</CardDescription>
              </CardHeader>
              <CardContent>
                {tipoContratoData.length > 0 ? (
                  <PremiumDonutChart
                    data={tipoContratoData}
                    height={260}
                    colors={CHART_COLORS}
                    formatter={(v) => `${v} contratos`}
                    showLabels={false}
                  />
                ) : (
                  <EmptyState 
                    title="Distribuição por tipo" 
                    description="A distribuição por tipo de contrato aparecerá aqui após cadastrar contratos."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Análise de Riscos
                </CardTitle>
                <CardDescription className="text-xs">Por nível de risco</CardDescription>
              </CardHeader>
              <CardContent>
                {riskData.length > 0 ? (
                  <PremiumBarChart
                    data={riskData}
                    dataKey="value"
                    yAxisKey="name"
                    layout="vertical"
                    height={260}
                    gradient={false}
                    colors={riskData.map(r => RISK_COLORS[r.name] || "hsl(var(--primary))")}
                    formatter={(v) => `${v} contratos`}
                  />
                ) : (
                  <EmptyState
                    title="Análises de risco"
                    description="Execute análises de IA nos seus contratos para ver a distribuição de riscos."
                    action={{
                      label: "Ver Contratos",
                      onClick: () => navigate("/contratos"),
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <ExpiryTimelineSection
            timelineVencimentos={timelineVencimentos}
            onNavigate={navigate}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
