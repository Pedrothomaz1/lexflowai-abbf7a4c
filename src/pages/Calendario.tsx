import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Calendar as CalendarIcon, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Obligation = {
  id: string;
  contrato_id: string;
  titulo: string;
  descricao: string;
  data_vencimento: string;
  tipo: string;
  valor: number;
  status: string;
  contratos: {
    numero_contrato: string;
    titulo: string;
  };
};

const Calendario = () => {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchObligations();
  }, [currentDate]);

  const fetchObligations = async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from("contract_obligations")
        .select(`
          *,
          contratos (
            numero_contrato,
            titulo
          )
        `)
        .gte("data_vencimento", format(start, "yyyy-MM-dd"))
        .lte("data_vencimento", format(end, "yyyy-MM-dd"))
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      setObligations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar obrigações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getObligationsForDate = (date: Date) => {
    return obligations.filter((obl) =>
      isSameDay(new Date(obl.data_vencimento), date)
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; variant: any; icon: any } } = {
      pendente: { label: "Pendente", variant: "outline", icon: Clock },
      concluido: { label: "Concluído", variant: "default", icon: CheckCircle2 },
      atrasado: { label: "Atrasado", variant: "destructive", icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: { [key: string]: { label: string; variant: any } } = {
      pagamento: { label: "Pagamento", variant: "default" },
      entrega: { label: "Entrega", variant: "secondary" },
      renovacao: { label: "Renovação", variant: "outline" },
      outro: { label: "Outro", variant: "outline" },
    };
    const config = tipos[tipo] || tipos.outro;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const selectedDateObligations = selectedDate ? getObligationsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando calendário...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendário de Obrigações</h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie prazos de obrigações contratuais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{obligations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {obligations.filter((o) => o.status === "pendente").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {obligations.filter((o) => o.status === "concluido").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {obligations.filter((o) => o.status === "atrasado").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const dayObligations = getObligationsForDate(day);
                const hasObligations = dayObligations.length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "p-2 text-center rounded-md hover:bg-accent transition-colors relative min-h-[60px]",
                      isToday(day) && "bg-primary/10 font-bold",
                      isSelected && "ring-2 ring-primary",
                      !isSameDay(day, currentDate) && "opacity-50"
                    )}
                  >
                    <div className="text-sm">{format(day, "d")}</div>
                    {hasObligations && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {dayObligations.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </CardTitle>
            <CardDescription>
              {selectedDateObligations.length > 0
                ? `${selectedDateObligations.length} obrigação(ões)`
                : "Nenhuma obrigação"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateObligations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma obrigação nesta data
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateObligations.map((obligation) => (
                  <div
                    key={obligation.id}
                    className="p-3 rounded-lg border bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{obligation.titulo}</h4>
                      {getTipoBadge(obligation.tipo)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {obligation.contratos?.numero_contrato} - {obligation.contratos?.titulo}
                    </p>
                    {obligation.valor && (
                      <p className="text-sm font-medium">
                        R$ {Number(obligation.valor).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {getStatusBadge(obligation.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calendario;
