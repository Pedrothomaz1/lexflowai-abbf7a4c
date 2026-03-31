import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Bell, BellOff, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { handleDbError } from "@/utils/dbErrorHandler";

type Alert = {
  id: string;
  contrato_id: string;
  tipo_alerta: string;
  titulo: string;
  mensagem: string;
  data_alerta: string;
  dias_antecedencia: number;
  enviado: boolean;
  data_envio: string | null;
  contratos: {
    numero_contrato: string;
    titulo: string;
  };
};

const Alertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "sent">("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAlertClick = async (alert: Alert) => {
    // Mark as sent/read if pending
    if (!alert.enviado) {
      try {
        await supabase
          .from("contract_alerts")
          .update({ 
            enviado: true, 
            data_envio: new Date().toISOString() 
          })
          .eq("id", alert.id);
        
        // Update local state
        setAlerts(prev => 
          prev.map(a => 
            a.id === alert.id 
              ? { ...a, enviado: true, data_envio: new Date().toISOString() } 
              : a
          )
        );
      } catch (error) {
        console.error("Error marking alert as read:", error);
      }
    }
    
    // Navigate to contract
    if (alert.contrato_id) {
      navigate(`/contratos/${alert.contrato_id}`);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from("contract_alerts")
        .select(`
          *,
          contratos (
            numero_contrato,
            titulo
          )
        `)
        .order("data_alerta", { ascending: true });

      if (filter === "pending") {
        query = query.eq("enviado", false);
      } else if (filter === "sent") {
        query = query.eq("enviado", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar alertas",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoAlertaBadge = (tipo: string) => {
    const tipos: { [key: string]: { label: string; variant: "destructive" | "default" | "secondary" | "outline"; icon: React.ComponentType<{ className?: string }> } } = {
      vencimento: { label: "Vencimento", variant: "destructive", icon: AlertCircle },
      renovacao: { label: "Renovação", variant: "default", icon: Calendar },
      obrigacao: { label: "Obrigação", variant: "secondary", icon: Bell },
      pagamento: { label: "Pagamento", variant: "outline", icon: Calendar },
    };
    const config = tipos[tipo] || tipos.obrigacao;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isAlertUrgent = (dataAlerta: string) => {
    const today = new Date();
    const alertDate = new Date(dataAlerta);
    const diffDays = Math.ceil((alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const pendingAlerts = alerts.filter((a) => !a.enviado);
  const urgentAlerts = alerts.filter((a) => !a.enviado && isAlertUrgent(a.data_alerta));

  const columns: DataTableColumn<Alert>[] = [
    {
      key: "contratos",
      header: "Contrato",
      render: (value) => (
        <div>
          <div className="font-medium text-foreground">{value?.numero_contrato}</div>
          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
            {value?.titulo}
          </div>
        </div>
      ),
    },
    {
      key: "tipo_alerta",
      header: "Tipo",
      render: (value) => getTipoAlertaBadge(value),
    },
    {
      key: "titulo",
      header: "Título",
      render: (value) => <span className="text-foreground">{value}</span>,
    },
    {
      key: "data_alerta",
      header: "Data",
      render: (value) => (
        <span className="text-muted-foreground">
          {format(new Date(value), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </span>
      ),
    },
    {
      key: "dias_antecedencia",
      header: "Antecedência",
      render: (value) => <span className="text-muted-foreground">{value} dias</span>,
    },
    {
      key: "enviado",
      header: "Status",
      render: (value, row) =>
        value ? (
          <Badge variant="secondary" className="gap-1">
            <BellOff className="h-3 w-3" />
            Enviado {row.data_envio && format(new Date(row.data_envio), "dd/MM/yyyy")}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            Pendente
          </Badge>
        ),
    },
  ];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Alertas e Notificações"
          description="Acompanhe prazos, vencimentos e obrigações contratuais"
        />
      </FadeIn>

      <StaggerContainer className="grid gap-4 md:grid-cols-3">
        <StaggerItem>
          <StatCard
            title="Alertas Pendentes"
            value={pendingAlerts.length}
            icon={Bell}
            subtitle="Não enviados"
            variant="default"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Alertas Urgentes"
            value={urgentAlerts.length}
            icon={AlertCircle}
            subtitle="Próximos 7 dias"
            variant="error"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Total de Alertas"
            value={alerts.length}
            icon={BellOff}
            subtitle="Todos os alertas"
            variant="muted"
          />
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.2}>
        <div className="flex gap-2">
          <AnimatedButton
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todos
          </AnimatedButton>
          <AnimatedButton
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pendentes
          </AnimatedButton>
          <AnimatedButton
            variant={filter === "sent" ? "default" : "outline"}
            onClick={() => setFilter("sent")}
          >
            Enviados
          </AnimatedButton>
        </div>
      </FadeIn>

      <StaggerContainer>
        <StaggerItem>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Lista de Alertas</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Alertas configurados para contratos
              </p>
            </AnimatedCardHeader>
            <AnimatedCardContent>
              {alerts.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="Nenhum alerta encontrado"
                  description="Não há alertas configurados para os contratos no momento."
                />
              ) : (
                <DataTable
                  data={alerts}
                  columns={columns}
                  searchable
                  searchPlaceholder="Buscar alertas..."
                  searchKey="titulo"
                  onRowClick={handleAlertClick}
                  rowClassName={(row) =>
                    `cursor-pointer hover:bg-muted/50 ${
                      isAlertUrgent(row.data_alerta) && !row.enviado
                        ? "bg-destructive/5 border-l-2 border-l-destructive"
                        : ""
                    }`
                  }
                />
              )}
            </AnimatedCardContent>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
};

export default Alertas;
