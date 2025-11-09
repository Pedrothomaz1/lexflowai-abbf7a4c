import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  DollarSign, 
  AlertTriangle,
  TrendingDown,
  Activity,
  Calendar as CalendarIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
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
  });
  const [contratosVencendo, setContratosVencendo] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tipoContratoData, setTipoContratoData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [valorMensalData, setValorMensalData] = useState<any[]>([]);
  const [timelineVencimentos, setTimelineVencimentos] = useState<any[]>([]);

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
    // Buscar todos os contratos
    const { data: todosContratos } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: true });

    // Buscar contratos ativos (vigentes)
    const { data: contratos } = await supabase
      .from("contratos")
      .select("*")
      .eq("status", "vigente");

    // Buscar fornecedores
    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id");

    // Buscar contratos vencendo em 30 dias
    const hoje = new Date();
    const data30Dias = new Date();
    data30Dias.setDate(hoje.getDate() + 30);

    const { data: vencendo } = await supabase
      .from("contratos")
      .select("*")
      .gte("data_fim", hoje.toISOString().split("T")[0])
      .lte("data_fim", data30Dias.toISOString().split("T")[0])
      .eq("status", "vigente");

    // Buscar aprovações pendentes
    const { data: aprovacoes } = await supabase
      .from("contract_approvals")
      .select("*")
      .is("data_aprovacao", null);

    // Buscar análises de risco
    const { data: analises } = await supabase
      .from("contract_analysis")
      .select("*, contratos(titulo)");

    // Calcular valor total e médio
    const valorTotal = contratos?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) || 0;
    const valorMedio = contratos && contratos.length > 0 ? valorTotal / contratos.length : 0;

    // Contar riscos altos (score >= 7)
    const riscosAltos = analises?.filter((a: any) => (a.score_risco || 0) >= 7).length || 0;

    setStats({
      contratosAtivos: contratos?.length || 0,
      fornecedores: fornecedores?.length || 0,
      vencendo30Dias: vencendo?.length || 0,
      aprovacoesPendentes: aprovacoes?.length || 0,
      valorTotal,
      valorMedio,
      riscosAltos,
    });

    // Contratos vencendo (para alertas)
    setContratosVencendo(vencendo || []);

    // Timeline de vencimentos (próximos 90 dias)
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

    // Processar dados para gráficos
    if (todosContratos) {
      const monthlyData: Record<string, number> = {};
      const hoje = new Date();
      
      // Inicializar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesKey = mes.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        monthlyData[mesKey] = 0;
      }

      // Contar contratos por mês
      todosContratos.forEach((contrato) => {
        const data = new Date(contrato.created_at);
        const mesKey = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (monthlyData.hasOwnProperty(mesKey)) {
          monthlyData[mesKey]++;
        }
      });

      const chartData = Object.entries(monthlyData).map(([mes, total]) => ({
        mes,
        contratos: total,
      }));
      setChartData(chartData);

      // Dados por tipo de contrato
      const tipoCount: Record<string, number> = {};
      todosContratos.forEach((contrato: any) => {
        const tipo = contrato.tipo || "outro";
        tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
      });

      const tipoLabels: Record<string, string> = {
        prestacao_servico: "Prestação de Serviço",
        fornecimento: "Fornecimento",
        locacao: "Locação",
        outro: "Outro",
      };

      setTipoContratoData(
        Object.entries(tipoCount).map(([tipo, value]) => ({
          name: tipoLabels[tipo] || tipo,
          value,
        }))
      );

      // Dados por status
      const statusCount: Record<string, number> = {};
      todosContratos.forEach((contrato: any) => {
        const status = contrato.status || "rascunho";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        rascunho: "Rascunho",
        em_analise: "Em Análise",
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

      // Dados de valor por mês
      const valorMensal: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesKey = mes.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        valorMensal[mesKey] = 0;
      }

      todosContratos.forEach((contrato: any) => {
        const data = new Date(contrato.created_at);
        const mesKey = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (valorMensal.hasOwnProperty(mesKey)) {
          valorMensal[mesKey] += Number(contrato.valor_total) || 0;
        }
      });

      setValorMensalData(
        Object.entries(valorMensal).map(([mes, valor]) => ({
          mes,
          valor: valor / 1000, // Converter para milhares
        }))
      );
    }

    // Dados de análise de risco
    if (analises && analises.length > 0) {
      const riskCategories = {
        "Baixo (0-3)": 0,
        "Médio (4-6)": 0,
        "Alto (7-8)": 0,
        "Crítico (9-10)": 0,
      };

      analises.forEach((analise: any) => {
        const score = analise.score_risco || 0;
        if (score <= 3) riskCategories["Baixo (0-3)"]++;
        else if (score <= 6) riskCategories["Médio (4-6)"]++;
        else if (score <= 8) riskCategories["Alto (7-8)"]++;
        else riskCategories["Crítico (9-10)"]++;
      });

      setRiskData(
        Object.entries(riskCategories)
          .filter(([_, value]) => value > 0)
          .map(([name, value]) => ({ name, value }))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const statsData = [
    {
      title: "Contratos Ativos",
      value: stats.contratosAtivos.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Valor Total",
      value: formatCurrency(stats.valorTotal),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "Vencendo em 30 dias",
      value: stats.vencendo30Dias.toString(),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      trend: "-5%",
      trendUp: false,
    },
    {
      title: "Riscos Altos",
      value: stats.riscosAltos.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
      trend: "+3",
      trendUp: false,
    },
    {
      title: "Fornecedores",
      value: stats.fornecedores.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
    },
    {
      title: "Valor Médio",
      value: formatCurrency(stats.valorMedio),
      icon: Activity,
      color: "text-cyan-600",
      bgColor: "bg-cyan-600/10",
    },
    {
      title: "Aprovações Pendentes",
      value: stats.aprovacoesPendentes.toString(),
      icon: CheckCircle2,
      color: "text-orange-600",
      bgColor: "bg-orange-600/10",
    },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const RISK_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#991b1b"];

  const getDaysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral e análise de contratos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/contratos")}>
            Ver Todos os Contratos
          </Button>
        </div>
      </div>

      {/* Alertas de Contratos Vencendo */}
      {contratosVencendo.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção: Contratos Vencendo!</AlertTitle>
          <AlertDescription>
            Você tem {contratosVencendo.length} contrato(s) vencendo nos próximos 30 dias:
            <ul className="mt-2 space-y-1">
              {contratosVencendo.slice(0, 3).map((contrato) => (
                <li key={contrato.id} className="text-sm">
                  • {contrato.titulo} - Vence em{" "}
                  {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                </li>
              ))}
            </ul>
            {contratosVencendo.length > 3 && (
              <Button
                variant="link"
                className="mt-2 p-0 h-auto text-destructive-foreground"
                onClick={() => navigate("/contratos")}
              >
                Ver todos os {contratosVencendo.length} contratos
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.trend && (
                    <div className={`flex items-center text-xs font-medium ${
                      stat.trendUp ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trendUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {stat.trend}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Contratos Criados por Mês
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="contratos" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Contratos"
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor dos Contratos por Mês
            </CardTitle>
            <CardDescription>Em milhares (R$)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={valorMensalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}k`}
                />
                <Legend />
                <Bar dataKey="valor" fill="#10b981" name="Valor Total (mil)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contratos por Tipo</CardTitle>
            <CardDescription>Distribuição por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tipoContratoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tipoContratoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Análise de Riscos
            </CardTitle>
            <CardDescription>Distribuição por nível de risco</CardDescription>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="value" name="Contratos" radius={[0, 8, 8, 0]}>
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhuma análise de risco disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contratos por Status</CardTitle>
            <CardDescription>Situação atual dos contratos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Quantidade" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Vencimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Timeline de Vencimentos
          </CardTitle>
          <CardDescription>Próximos 90 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineVencimentos.length > 0 ? (
            <div className="space-y-4">
              {timelineVencimentos.slice(0, 10).map((contrato, index) => {
                const dias = getDaysUntil(contrato.data_fim);
                const urgencia = dias <= 7 ? 'urgent' : dias <= 30 ? 'warning' : 'normal';
                
                return (
                  <div key={contrato.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-shrink-0 w-16">
                      <Badge 
                        variant={urgencia === 'urgent' ? 'destructive' : urgencia === 'warning' ? 'default' : 'secondary'}
                        className="w-full justify-center"
                      >
                        {dias}d
                      </Badge>
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{contrato.titulo}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence em {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="font-semibold">{formatCurrency(contrato.valor_total || 0)}</p>
                        </div>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (dias / 90 * 100))} 
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                );
              })}
              {timelineVencimentos.length > 10 && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate("/calendario")}
                >
                  Ver todos os {timelineVencimentos.length} vencimentos
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum contrato vencendo nos próximos 90 dias
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;
