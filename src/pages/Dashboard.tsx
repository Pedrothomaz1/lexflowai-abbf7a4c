import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Clock, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  });
  const [contratosVencendo, setContratosVencendo] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tipoContratoData, setTipoContratoData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

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
      .lte("data_fim", data30Dias.toISOString().split("T")[0]);

    // Buscar aprovações pendentes
    const { data: aprovacoes } = await supabase
      .from("contract_approvals")
      .select("*")
      .is("data_aprovacao", null);

    setStats({
      contratosAtivos: contratos?.length || 0,
      fornecedores: fornecedores?.length || 0,
      vencendo30Dias: vencendo?.length || 0,
      aprovacoesPendentes: aprovacoes?.length || 0,
    });

    // Contratos vencendo (para alertas)
    setContratosVencendo(vencendo || []);

      // Dados para gráfico de linha (últimos 6 meses)
    const { data: todosContratos } = await supabase
      .from("contratos")
      .select("created_at, status, tipo")
      .order("created_at", { ascending: true });

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

      setStatusData(
        Object.entries(statusCount).map(([name, value]) => ({
          name,
          value,
        }))
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

  const statsData = [
    {
      title: "Contratos Ativos",
      value: stats.contratosAtivos.toString(),
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Fornecedores",
      value: stats.fornecedores.toString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Vencendo em 30 dias",
      value: stats.vencendo30Dias.toString(),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
    },
    {
      title: "Aprovações Pendentes",
      value: stats.aprovacoesPendentes.toString(),
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/15",
    },
  ];

  const COLORS = ["#7F9C90", "#9CB8AC", "#668879", "#4D6B60", "#B3CCC3"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta, {user?.email}
        </p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-elevated transition-smooth hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Contratos por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="contratos" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Contratos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contratos por Tipo</CardTitle>
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
                  outerRadius={80}
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contratos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma atividade recente
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
