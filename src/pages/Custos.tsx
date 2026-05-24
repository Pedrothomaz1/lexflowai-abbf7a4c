import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion-container";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIModelComparison } from "@/components/custos/AIModelComparison";
import { PremiumAreaChart, PremiumBarChart, PremiumDonutChart } from "@/components/charts";
import { 
  DollarSign, 
  Cpu, 
  Mail, 
  ShoppingCart, 
  Database,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type UsageRecord = {
  id: string;
  tipo: string;
  recurso: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const tipoConfig: Record<string, { label: string; icon: typeof Cpu; color: string }> = {
  ai_tokens: { label: "Tokens IA", icon: Cpu, color: "hsl(var(--chart-1))" },
  email: { label: "Emails", icon: Mail, color: "hsl(var(--chart-2))" },
  api_compras: { label: "API Compras", icon: ShoppingCart, color: "hsl(var(--chart-3))" },
  storage: { label: "Armazenamento", icon: Database, color: "hsl(var(--chart-4))" },
  edge_function: { label: "Edge Functions", icon: Cpu, color: "hsl(var(--chart-5))" },
};

const Custos = () => {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodoFilter, setPeriodoFilter] = useState("mes_atual");

  useEffect(() => {
    fetchUsage();
  }, [periodoFilter]);

  const getDateRange = () => {
    const hoje = new Date();
    switch (periodoFilter) {
      case "mes_atual":
        return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
      case "mes_anterior":
        const mesAnterior = subMonths(hoje, 1);
        return { start: startOfMonth(mesAnterior), end: endOfMonth(mesAnterior) };
      case "ultimos_3_meses":
        return { start: startOfMonth(subMonths(hoje, 2)), end: endOfMonth(hoje) };
      case "ultimos_6_meses":
        return { start: startOfMonth(subMonths(hoje, 5)), end: endOfMonth(hoje) };
      default:
        return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
    }
  };

  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from("uso_sistema")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsage((data as UsageRecord[]) || []);
    } catch (error) {
      console.error("Erro ao buscar dados de uso:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculos de estatísticas
  const aiUsage = usage.filter(u => u.tipo === "ai_tokens");
  const stats = {
    custoTotal: usage.reduce((sum, u) => sum + Number(u.custo_total), 0),
    totalTokens: aiUsage.reduce((sum, u) => sum + u.quantidade, 0),
    custoTokens: aiUsage.reduce((sum, u) => sum + Number(u.custo_total), 0),
    totalEmails: usage.filter(u => u.tipo === "email").reduce((sum, u) => sum + u.quantidade, 0),
    totalApiCompras: usage.filter(u => u.tipo === "api_compras").reduce((sum, u) => sum + u.quantidade, 0),
    totalEdgeFunctions: usage.filter(u => u.tipo === "edge_function").reduce((sum, u) => sum + u.quantidade, 0),
  };

  // Detectar modelo atual baseado nos registros
  const modeloAtual = aiUsage.length > 0 
    ? (aiUsage[0].metadata as { modelo?: string })?.modelo || "google/gemini-2.5-flash"
    : "google/gemini-2.5-flash";

  // Dados para gráfico de evolução por dia
  const evolucaoPorDia = usage.reduce((acc, u) => {
    const dia = format(new Date(u.created_at), "dd/MM");
    if (!acc[dia]) {
      acc[dia] = { dia, custo: 0 };
    }
    acc[dia].custo += Number(u.custo_total);
    return acc;
  }, {} as Record<string, { dia: string; custo: number }>);

  const chartEvolucao = Object.values(evolucaoPorDia).sort((a, b) => 
    a.dia.localeCompare(b.dia)
  );

  // Dados para gráfico de distribuição por tipo
  const distribuicaoPorTipo = Object.entries(
    usage.reduce((acc, u) => {
      acc[u.tipo] = (acc[u.tipo] || 0) + Number(u.custo_total);
      return acc;
    }, {} as Record<string, number>)
  ).map(([tipo, valor]) => ({
    name: tipoConfig[tipo]?.label || tipo,
    value: valor,
    color: tipoConfig[tipo]?.color || "hsl(var(--muted-foreground))",
  }));

  // Dados para gráfico de barras por recurso
  const usoPorRecurso = Object.entries(
    usage.reduce((acc, u) => {
      acc[u.recurso] = (acc[u.recurso] || 0) + u.quantidade;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([recurso, quantidade]) => ({ recurso, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  const columns: DataTableColumn<UsageRecord>[] = [
    {
      key: "created_at",
      header: "Data",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </span>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (value) => {
        const config = tipoConfig[value] || { label: value, icon: Cpu, color: "hsl(var(--muted-foreground))" };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: config.color }} />
            <span className="text-sm">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: "recurso",
      header: "Recurso",
      render: (value) => (
        <Badge variant="outline" className="font-mono text-xs">
          {value}
        </Badge>
      ),
    },
    {
      key: "quantidade",
      header: "Quantidade",
      render: (value) => (
        <span className="font-medium">{value.toLocaleString("pt-BR")}</span>
      ),
    },
    {
      key: "custo_total",
      header: "Custo",
      render: (value) => (
        <span className="font-medium text-emerald-600">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))}
        </span>
      ),
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <PageHeader
            title="Custos Operacionais"
            description="Acompanhe o consumo de recursos e custos da plataforma"
          />
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
              <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
              <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
              <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StaggerItem>
          <StatCard
            title="Custo Total"
            value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.custoTotal)}
            icon={DollarSign}
            subtitle="No período selecionado"
            variant="primary"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Tokens IA"
            value={stats.totalTokens.toLocaleString("pt-BR")}
            icon={Cpu}
            subtitle="Tokens consumidos"
            variant="default"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Emails Enviados"
            value={stats.totalEmails.toLocaleString("pt-BR")}
            icon={Mail}
            subtitle="Via Resend"
            variant="default"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="API Compras"
            value={stats.totalApiCompras.toLocaleString("pt-BR")}
            icon={ShoppingCart}
            subtitle="Solicitações enviadas"
            variant="default"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Edge Functions"
            value={stats.totalEdgeFunctions.toLocaleString("pt-BR")}
            icon={Cpu}
            subtitle="Invocações"
            variant="default"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Charts Grid - Premium Style */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evolução de Custos */}
        <FadeIn delay={0.1}>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h3 className="text-lg font-semibold">Evolução de Custos</h3>
                </div>
                {chartEvolucao.length > 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                )}
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[300px]">
                {chartEvolucao.length > 0 ? (
                  <PremiumAreaChart
                    data={chartEvolucao}
                    dataKey="custo"
                    xAxisKey="dia"
                    height={300}
                    formatter={formatCurrency}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>

        {/* Distribuição por Tipo */}
        <FadeIn delay={0.2}>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <h3 className="text-lg font-semibold">Distribuição por Tipo</h3>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[300px]">
                {distribuicaoPorTipo.length > 0 ? (
                  <PremiumDonutChart
                    data={distribuicaoPorTipo}
                    height={300}
                    formatter={formatCurrency}
                    centerLabel={{
                      value: formatCurrency(stats.custoTotal),
                      label: "Total"
                    }}
                    showLabels={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>

        {/* Uso por Recurso */}
        <FadeIn delay={0.3}>
          <AnimatedCard hoverScale={1} className="lg:col-span-2">
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-lg font-semibold">Top 10 Recursos Mais Usados</h3>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[300px]">
                {usoPorRecurso.length > 0 ? (
                  <PremiumBarChart
                    data={usoPorRecurso}
                    dataKey="quantidade"
                    yAxisKey="recurso"
                    layout="vertical"
                    height={300}
                    formatter={(v) => v.toLocaleString("pt-BR")}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>
      </div>

      {/* Comparação de Modelos IA */}
      {stats.totalTokens > 0 && (
        <AIModelComparison
          totalTokens={stats.totalTokens}
          custoAtual={stats.custoTokens}
          modeloAtual={modeloAtual}
        />
      )}

      {/* Histórico Detalhado */}
      <FadeIn delay={0.4}>
        <AnimatedCard hoverScale={1}>
          <AnimatedCardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Histórico Detalhado</h3>
            </div>
          </AnimatedCardHeader>
          <AnimatedCardContent>
            <DataTable
              columns={columns}
              data={usage}
              emptyState={{
                title: "Nenhum registro de uso encontrado",
                description: "Os registros de uso aparecerão aqui conforme o sistema for utilizado.",
              }}
            />
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>
    </div>
  );
};

export default Custos;
