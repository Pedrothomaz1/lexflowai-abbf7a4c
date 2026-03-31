import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { 
  ClipboardList, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Calendar,
  DollarSign,
  FileText,
  RefreshCw,
  Bell,
  Send,
  User,
  Filter,
  ArrowUpDown,
  Eye
} from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { handleDbError } from "@/utils/dbErrorHandler";

type Obligation = {
  id: string;
  contrato_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  data_vencimento: string;
  status: string | null;
  responsavel_id: string | null;
  valor: number | null;
  concluido_em: string | null;
  created_at: string;
  contratos: {
    numero_contrato: string;
    titulo: string;
    fornecedor_id: string | null;
    fornecedores: {
      nome: string;
    } | null;
  } | null;
  responsavel_nome?: string | null;
};

const tipoConfig: Record<string, { label: string; icon: typeof DollarSign; color: string }> = {
  comunicacao: { label: "Comunicação", icon: Send, color: "text-emerald-600" },
  entrega: { label: "Entrega", icon: Send, color: "text-blue-600" },
  relatorio: { label: "Relatório", icon: FileText, color: "text-purple-600" },
  renovacao: { label: "Renovação", icon: RefreshCw, color: "text-amber-600" },
  notificacao: { label: "Notificação", icon: Bell, color: "text-rose-600" },
  // Retrocompatibilidade: mapear "pagamento" antigo para Comunicação
  pagamento: { label: "Comunicação", icon: Send, color: "text-emerald-600" },
};

const Obrigacoes = () => {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pendente" | "concluido" | "atrasado">("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [periodoFilter, setPeriodoFilter] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchObligations();
  }, []);

  const fetchObligations = async () => {
    try {
      // Fetch obligations with contracts
      const { data: obligationsData, error: obligationsError } = await supabase
        .from("contract_obligations")
        .select(`
          *,
          contratos (
            numero_contrato,
            titulo,
            fornecedor_id,
            fornecedores (
              nome
            )
          )
        `)
        .order("data_vencimento", { ascending: true });

      if (obligationsError) throw obligationsError;

      // Get unique responsavel_ids to fetch their profiles
      const responsavelIds = [...new Set(
        (obligationsData || [])
          .map(o => o.responsavel_id)
          .filter((id): id is string => id !== null)
      )];

      // Fetch profiles for responsaveis
      let profilesMap: Record<string, string> = {};
      if (responsavelIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", responsavelIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine data
      const enrichedObligations: Obligation[] = (obligationsData || []).map(o => ({
        ...o,
        responsavel_nome: o.responsavel_id ? profilesMap[o.responsavel_id] || null : null,
      }));

      setObligations(enrichedObligations);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar obrigações",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (obligation: Obligation) => {
    const newStatus = obligation.status === "concluido" ? "pendente" : "concluido";
    
    try {
      const { error } = await supabase
        .from("contract_obligations")
        .update({
          status: newStatus,
          concluido_em: newStatus === "concluido" ? new Date().toISOString() : null,
        })
        .eq("id", obligation.id);

      if (error) throw error;

      setObligations(prev =>
        prev.map(o =>
          o.id === obligation.id
            ? { ...o, status: newStatus, concluido_em: newStatus === "concluido" ? new Date().toISOString() : null }
            : o
        )
      );

      toast({
        title: newStatus === "concluido" ? "Obrigação concluída" : "Obrigação reaberta",
        description: obligation.titulo,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar obrigação",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    }
  };

  const getUrgencyInfo = (dataVencimento: string, status: string | null) => {
    if (status === "concluido") {
      return { level: "completed", label: "Concluído", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" };
    }
    
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diasRestantes = differenceInDays(vencimento, hoje);
    
    if (diasRestantes < 0) {
      return { level: "overdue", label: `${Math.abs(diasRestantes)}d atrasado`, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    }
    if (diasRestantes <= 3) {
      return { level: "critical", label: `${diasRestantes}d restantes`, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    }
    if (diasRestantes <= 7) {
      return { level: "urgent", label: `${diasRestantes}d restantes`, className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
    }
    return { level: "normal", label: `${diasRestantes}d restantes`, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  };

  const isOverdue = (dataVencimento: string) => {
    return isBefore(new Date(dataVencimento), new Date());
  };

  // Filtrar obrigações
  const filteredObligations = obligations.filter(o => {
    const hoje = new Date();
    const vencimento = new Date(o.data_vencimento);
    const diasRestantes = differenceInDays(vencimento, hoje);
    
    // Status filter
    if (statusFilter === "pendente" && o.status === "concluido") return false;
    if (statusFilter === "concluido" && o.status !== "concluido") return false;
    if (statusFilter === "atrasado" && (o.status === "concluido" || diasRestantes >= 0)) return false;
    
    // Tipo filter
    if (tipoFilter !== "all" && o.tipo !== tipoFilter) return false;
    
    // Período filter
    if (periodoFilter === "hoje" && diasRestantes !== 0) return false;
    if (periodoFilter === "semana" && (diasRestantes < 0 || diasRestantes > 7)) return false;
    if (periodoFilter === "mes" && (diasRestantes < 0 || diasRestantes > 30)) return false;
    
    return true;
  });

  // Estatísticas
  const stats = {
    total: obligations.length,
    pendentes: obligations.filter(o => o.status !== "concluido").length,
    atrasadas: obligations.filter(o => o.status !== "concluido" && isOverdue(o.data_vencimento)).length,
    proximas7dias: obligations.filter(o => {
      if (o.status === "concluido") return false;
      const dias = differenceInDays(new Date(o.data_vencimento), new Date());
      return dias >= 0 && dias <= 7;
    }).length,
    concluidas: obligations.filter(o => o.status === "concluido").length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

  const columns: DataTableColumn<Obligation>[] = [
    {
      key: "status",
      header: "",
      render: (_, row) => (
        <Checkbox
          checked={row.status === "concluido"}
          onCheckedChange={() => handleToggleComplete(row)}
          className="h-5 w-5"
        />
      ),
    },
    {
      key: "titulo",
      header: "Obrigação",
      render: (value, row) => {
        const urgency = getUrgencyInfo(row.data_vencimento, row.status);
        return (
          <div className="space-y-1">
            <div className={`font-medium ${row.status === "concluido" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {value}
            </div>
            {row.descricao && (
              <div className="text-xs text-muted-foreground line-clamp-1">{row.descricao}</div>
            )}
            <Badge className={urgency.className} variant="secondary">
              {urgency.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (value) => {
        const config = tipoConfig[value || "notificacao"] || tipoConfig.notificacao;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-sm">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: "contratos",
      header: "Contrato",
      render: (value) => (
        <div className="space-y-0.5">
          <div className="font-medium text-foreground text-sm">{value?.numero_contrato || "—"}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
            {value?.fornecedores?.nome || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "data_vencimento",
      header: "Vencimento",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{format(new Date(value), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      ),
    },
    {
      key: "responsavel_nome",
      header: "Responsável",
      render: (value) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value || "Não atribuído"}</span>
        </div>
      ),
    },
    {
      key: "valor",
      header: "Valor",
      render: (value, row) => 
        row.tipo === "pagamento" && value ? (
          <span className="font-medium text-emerald-600">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "id",
      header: "",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.contrato_id && navigate(`/contratos/${row.contrato_id}`)}
          disabled={!row.contrato_id}
        >
          <Eye className="h-4 w-4" />
        </Button>
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
          title="Central de Obrigações"
          description="Visualize e gerencie todas as obrigações contratuais em um único lugar"
        />
      </FadeIn>

      {/* Stats Cards */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StaggerItem>
          <StatCard
            title="Total de Obrigações"
            value={stats.total}
            icon={ClipboardList}
            subtitle="Todas as obrigações"
            variant="default"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Pendentes"
            value={stats.pendentes}
            icon={Clock}
            subtitle="Aguardando conclusão"
            variant="warning"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Atrasadas"
            value={stats.atrasadas}
            icon={AlertTriangle}
            subtitle="Requerem ação imediata"
            variant="error"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Próximos 7 dias"
            value={stats.proximas7dias}
            icon={Calendar}
            subtitle="Vencendo em breve"
            variant="muted"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Concluídas"
            value={stats.concluidas}
            icon={CheckCircle2}
            subtitle={`${completionRate}% do total`}
            variant="success"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Progress and Summary */}
      <FadeIn delay={0.1}>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard>
            <AnimatedCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Taxa de Conclusão</h3>
                <span className="text-2xl font-bold text-primary">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {stats.concluidas} de {stats.total} obrigações concluídas
              </p>
            </AnimatedCardContent>
          </AnimatedCard>
          
          <AnimatedCard>
            <AnimatedCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Distribuição por Tipo</h3>
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tipoConfig)
                  .filter(([tipo]) => tipo !== "pagamento") // Não mostrar duplicado
                  .map(([tipo, config]) => {
                    const count = obligations.filter(o => 
                      (o.tipo === tipo || (tipo === "comunicacao" && o.tipo === "pagamento")) && 
                      o.status !== "concluido"
                    ).length;
                    if (count === 0) return null;
                    const Icon = config.icon;
                    return (
                      <Badge key={tipo} variant="outline" className="gap-1.5">
                        <Icon className={`h-3 w-3 ${config.color}`} />
                        {config.label}: {count}
                      </Badge>
                    );
                  })}
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.2}>
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="concluido">Concluídas</SelectItem>
              <SelectItem value="atrasado">Atrasadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="comunicacao">Comunicação</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="relatorio">Relatório</SelectItem>
              <SelectItem value="renovacao">Renovação</SelectItem>
              <SelectItem value="notificacao">Notificação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer data</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Próximos 7 dias</SelectItem>
              <SelectItem value="mes">Próximos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {/* Data Table */}
      <StaggerContainer>
        <StaggerItem>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Lista de Obrigações</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredObligations.length} {filteredObligations.length === 1 ? "obrigação" : "obrigações"} encontrada{filteredObligations.length !== 1 && "s"}
              </p>
            </AnimatedCardHeader>
            <AnimatedCardContent>
              {filteredObligations.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhuma obrigação encontrada"
                  description="Não há obrigações que correspondam aos filtros selecionados."
                />
              ) : (
                <DataTable
                  data={filteredObligations}
                  columns={columns}
                  searchable
                  searchPlaceholder="Buscar obrigações..."
                  searchKey="titulo"
                  rowClassName={(row) => {
                    if (row.status === "concluido") return "opacity-60";
                    const dias = differenceInDays(new Date(row.data_vencimento), new Date());
                    if (dias < 0) return "bg-destructive/5 border-l-2 border-l-destructive";
                    if (dias <= 3) return "bg-amber-500/5 border-l-2 border-l-amber-500";
                    return "";
                  }}
                />
              )}
            </AnimatedCardContent>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
};

export default Obrigacoes;
