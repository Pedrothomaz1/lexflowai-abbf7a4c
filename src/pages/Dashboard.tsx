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
  ArrowDownRight
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [statusData, setStatusData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [valorMensalData, setValorMensalData] = useState<any[]>([]);
  const [timelineVencimentos, setTimelineVencimentos] = useState<any[]>([]);
  const [topFornecedores, setTopFornecedores] = useState<any[]>([]);

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

      const statusCount: Record<string, number> = {};
      todosContratos.forEach((contrato: any) => {
        const status = contrato.status || "rascunho";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        rascunho: "Rascunho",
        em_aprovacao: "Em Aprovação",
        aprovado: "Aprovado",
        assinado: "Assinado",
        vigente: "Vigente",
        encerrado: "Encerrado",
        cancelado: "Cancelado",
      };

      setStatusData(
        Object.entries(statusCount).map(([name, value]) => ({
          name: statusLabels[name] || name,
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

  const RISK_COLORS = {
    "Baixo": "hsl(var(--success))",
    "Médio": "hsl(var(--warning))",
    "Alto": "hsl(var(--destructive))",
    "Crítico": "hsl(0 72% 35%)",
  };

  const getDaysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Executivo"
        description="Visão geral e análise de contratos"
        actions={
          <Button onClick={() => navigate("/contratos")} size="sm" className="btn-cta">
            Ver Todos os Contratos
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Button>
        }
      />

      {/* Alert */}
      {contratosVencendo.length > 0 && (
        <Alert variant="destructive" className="animate-slide-up">
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

      {/* KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Contratos Ativos"
          value={stats.contratosAtivos}
          icon={FileText}
          variant="primary"
          trend={{ value: 12, label: "vs mês anterior" }}
          onClick={() => navigate("/contratos?status=vigente")}
        />
        <StatCard
          title="Valor Total"
          value={formatCompactCurrency(stats.valorTotal)}
          icon={DollarSign}
          variant="success"
          trend={{ value: 8, label: "vs mês anterior" }}
          onClick={() => navigate("/contratos")}
        />
        <StatCard
          title="Vencendo em 30 dias"
          value={stats.vencendo30Dias}
          icon={Clock}
          variant="critical"
          onClick={() => navigate("/alertas")}
        />
        <StatCard
          title="Riscos Altos"
          value={stats.riscosAltos}
          icon={AlertTriangle}
          variant="critical"
          onClick={() => navigate("/contratos")}
        />
      </StatCardGrid>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fornecedores"
          value={stats.fornecedores}
          icon={Users}
          subtitle="Cadastrados"
          onClick={() => navigate("/fornecedores")}
        />
        <StatCard
          title="Valor Médio"
          value={formatCompactCurrency(stats.valorMedio)}
          icon={Activity}
          subtitle="Por contrato"
          onClick={() => navigate("/contratos")}
        />
        <StatCard
          title="Aprovações Pendentes"
          value={stats.aprovacoesPendentes}
          icon={Timer}
          subtitle="Aguardando ação"
          onClick={() => navigate("/workflows")}
        />
        <StatCard
          title="Tempo Médio Aprovação"
          value={`${stats.tempoMedioAprovacao.toFixed(1)}d`}
          icon={Target}
          subtitle={stats.tempoMedioAprovacao <= 5 ? "✓ Dentro da meta" : "⚠ Acima da meta"}
          onClick={() => navigate("/workflows")}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* SLA Card */}
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
                <span className={cn(
                  "font-medium",
                  stats.taxaAprovacaoNoPrazo >= 80 ? "text-success" : "text-warning"
                )}>
                  {stats.taxaAprovacaoNoPrazo.toFixed(0)}%
                </span>
              </div>
              <Progress value={stats.taxaAprovacaoNoPrazo} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: 80%</span>
                <span>{stats.taxaAprovacaoNoPrazo >= 80 ? "✓ Atingida" : "⚠ Abaixo"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Renovação</span>
                <span className={cn(
                  "font-medium",
                  stats.taxaRenovacao >= 70 ? "text-success" : "text-warning"
                )}>
                  {stats.taxaRenovacao.toFixed(0)}%
                </span>
              </div>
              <Progress value={stats.taxaRenovacao} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Meta: 70%</span>
                <span>{stats.taxaRenovacao >= 70 ? "✓ Atingida" : "⚠ Abaixo"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Contratos renovados</span>
                </div>
                <Badge variant="secondary" className="text-xs">{stats.contratosRenovados}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Fornecedores */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Top Fornecedores
            </CardTitle>
            <CardDescription className="text-xs">Por valor de contratos</CardDescription>
          </CardHeader>
          <CardContent>
            {topFornecedores.length > 0 ? (
              <div className="space-y-3">
                {topFornecedores.map((fornecedor, index) => {
                  const maxValor = topFornecedores[0]?.valor || 1;
                  const percentual = (fornecedor.valor / maxValor) * 100;
                  
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                            index === 0 ? "bg-warning/20 text-warning" :
                            index === 1 ? "bg-muted text-muted-foreground" :
                            "bg-muted/50 text-muted-foreground"
                          )}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fornecedor.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {fornecedor.count} contrato{fornecedor.count > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold shrink-0">
                          {formatCompactCurrency(fornecedor.valor)}
                        </span>
                      </div>
                      <Progress value={percentual} className="h-1" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Sem dados"
                description="Nenhum fornecedor com contratos ainda"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução de Contratos
            </CardTitle>
            <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorContratos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="contratos" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorContratos)"
                  name="Contratos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Valor por Mês
            </CardTitle>
            <CardDescription className="text-xs">Em milhares (R$)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={valorMensalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="valor" 
                  fill="hsl(var(--success))" 
                  name="Valor (mil)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contratos por Tipo</CardTitle>
            <CardDescription className="text-xs">Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={tipoContratoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {tipoContratoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={riskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Contratos" radius={[0, 4, 4, 0]}>
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="Sem análises"
                description="Nenhuma análise de risco disponível"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
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
                    onClick={() => navigate(`/contratos/${contrato.id}`)}
                  >
                    <Badge 
                      variant={urgencia === "destructive" ? "destructive" : urgencia === "warning" ? "default" : "secondary"}
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
                <Button 
                  variant="ghost" 
                  className="w-full text-sm" 
                  onClick={() => navigate("/calendario")}
                >
                  Ver todos os {timelineVencimentos.length} vencimentos
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <EmptyState
              title="Nenhum vencimento próximo"
              description="Não há contratos vencendo nos próximos 90 dias"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
