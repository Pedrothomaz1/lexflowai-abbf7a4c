import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Bell, BellOff, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoAlertaBadge = (tipo: string) => {
    const tipos: { [key: string]: { label: string; variant: any; icon: any } } = {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando alertas...</p>
      </div>
    );
  }

  const pendingAlerts = alerts.filter(a => !a.enviado);
  const urgentAlerts = alerts.filter(a => !a.enviado && isAlertUrgent(a.data_alerta));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas e Notificações</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe prazos, vencimentos e obrigações contratuais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Não enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{urgentAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Todos os alertas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Todos
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pendentes
        </Button>
        <Button
          variant={filter === "sent" ? "default" : "outline"}
          onClick={() => setFilter("sent")}
        >
          Enviados
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Alertas</CardTitle>
          <CardDescription>
            Alertas configurados para contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum alerta encontrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Antecedência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow 
                    key={alert.id}
                    className={isAlertUrgent(alert.data_alerta) && !alert.enviado ? "bg-destructive/5" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">
                        {alert.contratos?.numero_contrato}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {alert.contratos?.titulo}
                      </div>
                    </TableCell>
                    <TableCell>{getTipoAlertaBadge(alert.tipo_alerta)}</TableCell>
                    <TableCell>{alert.titulo}</TableCell>
                    <TableCell>
                      {format(new Date(alert.data_alerta), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{alert.dias_antecedencia} dias</TableCell>
                    <TableCell>
                      {alert.enviado ? (
                        <Badge variant="secondary">
                          Enviado {alert.data_envio && format(new Date(alert.data_envio), "dd/MM/yyyy")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alertas;
