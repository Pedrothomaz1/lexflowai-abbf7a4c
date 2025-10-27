import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Clock, CheckCircle2 } from "lucide-react";

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
    // Buscar contratos ativos
    const { data: contratos } = await supabase
      .from("contratos")
      .select("*")
      .eq("status", "ativo");

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
      color: "text-blue-600",
      bgColor: "bg-blue-600/10",
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
      color: "text-green-600",
      bgColor: "bg-green-600/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta, {user?.email}
        </p>
      </div>

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
