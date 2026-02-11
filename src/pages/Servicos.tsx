import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  RefreshCcw,
  Filter,
  ShoppingCart,
  XCircle,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton, StatCardSkeleton } from "@/components/ui/skeleton-loaders";
import { Progress } from "@/components/ui/progress";
import { FinanceNotificationModal } from "@/components/FinanceNotificationModal";

interface Servico {
  id: string;
  unidade_id: string;
  especificacao_id: string;
  itens_detalhados: string | null;
  quantidade: number;
  localizacao_fisica: string | null;
  data_ultima_troca: string;
  validade_meses: number;
  data_validade: string;
  dias_antecedencia_alerta: number;
  data_alerta: string;
  status: string;
  prioridade: string;
  responsavel_id: string | null;
  valor_estimado: number | null;
  fornecedor_preferencial_id: string | null;
  observacoes: string | null;
  tags: string[] | null;
  created_at: string;
  unidades: {
    nome: string;
    cidade: string | null;
  } | null;
  especificacoes_servico: {
    nome: string;
    categoria: string;
  } | null;
  responsavel_nome?: string | null;
  ultima_solicitacao?: {
    status_envio: string;
    codigo_solicitacao: string | null;
  } | null;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Especificacao {
  id: string;
  nome: string;
  categoria: string;
  validade_padrao_meses: number;
  dias_alerta_padrao: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const categoriaConfig: Record<string, { label: string; color: string }> = {
  seguranca: { label: "Segurança", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  manutencao: { label: "Manutenção", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  higiene: { label: "Higiene", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  infraestrutura: { label: "Infraestrutura", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  veiculos: { label: "Veículos", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  outros: { label: "Outros", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  dentro_prazo: { label: "No prazo", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  alerta: { label: "Em alerta", color: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
  vencido: { label: "Vencido", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  em_execucao: { label: "Em execução", color: "bg-primary/10 text-primary border-primary/20", icon: RefreshCcw },
};

export default function Servicos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [especificacoes, setEspecificacoes] = useState<Especificacao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unidadeFilter, setUnidadeFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  
  // Finance notification modal state
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [selectedServiceForNotification, setSelectedServiceForNotification] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    unidade_id: "",
    especificacao_id: "",
    itens_detalhados: "",
    quantidade: 1,
    localizacao_fisica: "",
    data_ultima_troca: format(new Date(), "yyyy-MM-dd"),
    validade_meses: 12,
    dias_antecedencia_alerta: 30,
    prioridade: "normal",
    responsavel_id: "",
    valor_estimado: "",
    fornecedor_preferencial_id: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [servicosRes, unidadesRes, especificacoesRes, fornecedoresRes, profilesRes] = await Promise.all([
        supabase
          .from("servicos_periodicos")
          .select(`
            *,
            unidades(nome, cidade),
            especificacoes_servico(nome, categoria)
          `)
          .order("data_validade", { ascending: true }),
        supabase.from("unidades").select("id, nome").eq("is_active", true),
        supabase.from("especificacoes_servico").select("*").eq("is_active", true),
        supabase.from("fornecedores").select("id, nome"),
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (servicosRes.error) throw servicosRes.error;
      if (unidadesRes.error) throw unidadesRes.error;
      if (especificacoesRes.error) throw especificacoesRes.error;

      // Get responsavel names
      const profilesMap: Record<string, string> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach(p => {
          profilesMap[p.id] = p.full_name;
        });
      }

      // Get latest solicitacoes for each servico
      const servicoIds = servicosRes.data?.map(s => s.id) || [];
      const { data: solicitacoesData } = await supabase
        .from("solicitacoes_compras")
        .select("servico_id, status_envio, codigo_solicitacao, created_at")
        .in("servico_id", servicoIds)
        .order("created_at", { ascending: false });

      // Group by servico_id and get latest
      const solicitacoesMap: Record<string, { status_envio: string; codigo_solicitacao: string | null }> = {};
      if (solicitacoesData) {
        solicitacoesData.forEach(s => {
          if (!solicitacoesMap[s.servico_id]) {
            solicitacoesMap[s.servico_id] = {
              status_envio: s.status_envio,
              codigo_solicitacao: s.codigo_solicitacao,
            };
          }
        });
      }

      // Enrich servicos
      const enrichedServicos: Servico[] = (servicosRes.data || []).map(s => ({
        ...s,
        responsavel_nome: s.responsavel_id ? profilesMap[s.responsavel_id] : null,
        ultima_solicitacao: solicitacoesMap[s.id] || null,
      }));

      setServicos(enrichedServicos);
      setUnidades(unidadesRes.data || []);
      setEspecificacoes(especificacoesRes.data || []);
      setFornecedores(fornecedoresRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEspecificacaoChange = (especificacaoId: string) => {
    const spec = especificacoes.find(e => e.id === especificacaoId);
    if (spec) {
      setFormData(prev => ({
        ...prev,
        especificacao_id: especificacaoId,
        validade_meses: spec.validade_padrao_meses,
        dias_antecedencia_alerta: spec.dias_alerta_padrao,
      }));
    }
  };

  const calculateDates = () => {
    const dataUltimaTroca = new Date(formData.data_ultima_troca);
    const dataValidade = addMonths(dataUltimaTroca, formData.validade_meses);
    const dataAlerta = new Date(dataValidade);
    dataAlerta.setDate(dataAlerta.getDate() - formData.dias_antecedencia_alerta);
    return {
      data_validade: format(dataValidade, "yyyy-MM-dd"),
      data_alerta: format(dataAlerta, "yyyy-MM-dd"),
    };
  };

  const handleSubmit = async () => {
    if (!formData.unidade_id || !formData.especificacao_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a unidade e o tipo de serviço.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const dates = calculateDates();

    const payload = {
      unidade_id: formData.unidade_id,
      especificacao_id: formData.especificacao_id,
      itens_detalhados: formData.itens_detalhados || null,
      quantidade: formData.quantidade,
      localizacao_fisica: formData.localizacao_fisica || null,
      data_ultima_troca: formData.data_ultima_troca,
      validade_meses: formData.validade_meses,
      data_validade: dates.data_validade,
      dias_antecedencia_alerta: formData.dias_antecedencia_alerta,
      data_alerta: dates.data_alerta,
      prioridade: formData.prioridade,
      responsavel_id: formData.responsavel_id || null,
      valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
      fornecedor_preferencial_id: formData.fornecedor_preferencial_id || null,
      observacoes: formData.observacoes || null,
      organization_id: organization?.id,
      created_by: user?.id,
    };

    try {
      if (editingServico) {
        const { error } = await supabase
          .from("servicos_periodicos")
          .update(payload)
          .eq("id", editingServico.id);
        if (error) throw error;
        toast({ title: "Serviço atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("servicos_periodicos").insert(payload);
        if (error) throw error;
        toast({ title: "Serviço cadastrado com sucesso!" });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      unidade_id: "",
      especificacao_id: "",
      itens_detalhados: "",
      quantidade: 1,
      localizacao_fisica: "",
      data_ultima_troca: format(new Date(), "yyyy-MM-dd"),
      validade_meses: 12,
      dias_antecedencia_alerta: 30,
      prioridade: "normal",
      responsavel_id: "",
      valor_estimado: "",
      fornecedor_preferencial_id: "",
      observacoes: "",
    });
    setEditingServico(null);
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      unidade_id: servico.unidade_id,
      especificacao_id: servico.especificacao_id,
      itens_detalhados: servico.itens_detalhados || "",
      quantidade: servico.quantidade,
      localizacao_fisica: servico.localizacao_fisica || "",
      data_ultima_troca: servico.data_ultima_troca,
      validade_meses: servico.validade_meses,
      dias_antecedencia_alerta: servico.dias_antecedencia_alerta,
      prioridade: servico.prioridade,
      responsavel_id: servico.responsavel_id || "",
      valor_estimado: servico.valor_estimado?.toString() || "",
      fornecedor_preferencial_id: servico.fornecedor_preferencial_id || "",
      observacoes: servico.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleRenovar = async (servico: Servico) => {
    const hoje = new Date();
    const novaValidade = addMonths(hoje, servico.validade_meses);
    const novoAlerta = new Date(novaValidade);
    novoAlerta.setDate(novoAlerta.getDate() - servico.dias_antecedencia_alerta);

    try {
      // Update servico
      const { error: updateError } = await supabase
        .from("servicos_periodicos")
        .update({
          data_ultima_troca: format(hoje, "yyyy-MM-dd"),
          data_validade: format(novaValidade, "yyyy-MM-dd"),
          data_alerta: format(novoAlerta, "yyyy-MM-dd"),
          status: "dentro_prazo",
        })
        .eq("id", servico.id);

      if (updateError) throw updateError;

      // Insert history
      await supabase.from("servico_historico").insert({
        servico_id: servico.id,
        tipo_acao: "renovacao",
        data_execucao: format(hoje, "yyyy-MM-dd"),
        proxima_validade: format(novaValidade, "yyyy-MM-dd"),
      });

      toast({ title: "Serviço renovado com sucesso!" });
      fetchData();
      
      // Abrir modal de notificação ao financeiro
      setSelectedServiceForNotification(servico.id);
      setShowFinanceModal(true);
    } catch (error: any) {
      toast({
        title: "Erro ao renovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter logic
  const filteredServicos = servicos.filter(s => {
    const matchesSearch = 
      !searchQuery ||
      s.especificacoes_servico?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.unidades?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.itens_detalhados?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesUnidade = unidadeFilter === "all" || s.unidade_id === unidadeFilter;
    const matchesCategoria = categoriaFilter === "all" || s.especificacoes_servico?.categoria === categoriaFilter;

    return matchesSearch && matchesStatus && matchesUnidade && matchesCategoria;
  });

  // Stats
  const stats = {
    total: servicos.length,
    dentroPrazo: servicos.filter(s => s.status === "dentro_prazo").length,
    emAlerta: servicos.filter(s => s.status === "alerta").length,
    vencidos: servicos.filter(s => s.status === "vencido").length,
  };

  const proximoVencimento = servicos
    .filter(s => s.status !== "vencido")
    .sort((a, b) => new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime())[0];

  const completionRate = stats.total > 0 
    ? Math.round((stats.dentroPrazo / stats.total) * 100) 
    : 0;

  const columns: DataTableColumn<Servico>[] = [
    {
      key: "status",
      header: "Status",
      render: (value: string) => {
        const config = statusConfig[value] || statusConfig.dentro_prazo;
        const Icon = config.icon;
        return (
          <Badge variant="outline" className={config.color}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "especificacoes_servico",
      header: "Serviço",
      render: (value: any, row: Servico) => (
        <div>
          <div className="font-medium">{value?.nome || "-"}</div>
          {row.itens_detalhados && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.itens_detalhados}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (_, row: Servico) => {
        const cat = row.especificacoes_servico?.categoria || "outros";
        const config = categoriaConfig[cat] || categoriaConfig.outros;
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      key: "unidades",
      header: "Unidade",
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{value?.nome || "-"}</span>
        </div>
      ),
    },
    {
      key: "data_validade",
      header: "Vencimento",
      render: (value: string, row: Servico) => {
        const dias = differenceInDays(new Date(value), new Date());
        return (
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(value), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className={`text-xs ${dias < 0 ? "text-destructive" : dias <= 30 ? "text-warning" : "text-muted-foreground"}`}>
              {dias < 0 ? `${Math.abs(dias)} dias atrás` : dias === 0 ? "Hoje" : `em ${dias} dias`}
            </div>
          </div>
        );
      },
    },
    {
      key: "ultima_solicitacao",
      header: "Compras",
      render: (value: Servico["ultima_solicitacao"]) => {
        if (!value) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        const statusColors: Record<string, string> = {
          pendente: "bg-yellow-100 text-yellow-800",
          enviado: "bg-blue-100 text-blue-800",
          confirmado: "bg-green-100 text-green-800",
          erro: "bg-red-100 text-red-800",
        };
        return (
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <Badge className={statusColors[value.status_envio] || "bg-gray-100"}>
              {value.status_envio}
            </Badge>
            {value.codigo_solicitacao && (
              <span className="text-xs text-muted-foreground">
                #{value.codigo_solicitacao}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (_, row: Servico) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRenovar(row)}
            disabled={row.status === "dentro_prazo"}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Renovar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços Periódicos"
        description="Gerencie serviços com vencimento como extintores, manutenções e certificados."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total de Serviços"
          value={stats.total}
          icon={Wrench}
        />
        <StatCard
          title="No Prazo"
          value={stats.dentroPrazo}
          icon={CheckCircle2}
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Em Alerta"
          value={stats.emAlerta}
          icon={AlertTriangle}
          className="border-l-4 border-l-warning"
        />
        <StatCard
          title="Vencidos"
          value={stats.vencidos}
          icon={XCircle}
          className="border-l-4 border-l-destructive"
        />
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Taxa de Conformidade</span>
            <span className="text-lg font-bold">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          {proximoVencimento && (
            <p className="text-xs text-muted-foreground mt-2">
              Próximo: {proximoVencimento.especificacoes_servico?.nome} em{" "}
              {format(new Date(proximoVencimento.data_validade), "dd/MM", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="dentro_prazo">No prazo</SelectItem>
            <SelectItem value="alerta">Em alerta</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="em_execucao">Em execução</SelectItem>
          </SelectContent>
        </Select>
        <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
          <SelectTrigger className="w-[180px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas unidades</SelectItem>
            {unidades.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoriaConfig).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredServicos}
        emptyState={{ 
          title: "Comece a gerenciar seus serviços", 
          description: "Cadastre serviços periódicos para receber alertas automáticos de vencimento e manter a conformidade operacional.",
          action: {
            label: "Cadastrar Primeiro Serviço",
            onClick: () => setIsDialogOpen(true),
          },
        }}
      />

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingServico ? "Editar Serviço" : "Novo Serviço Periódico"}
            </DialogTitle>
            <DialogDescription>
              Cadastre um serviço com prazo de validade para acompanhamento automático.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unidade_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="especificacao">Tipo de Serviço *</Label>
                <Select
                  value={formData.especificacao_id}
                  onValueChange={handleEspecificacaoChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {especificacoes.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} ({categoriaConfig[e.categoria]?.label})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itens">Itens/Detalhamento</Label>
              <Input
                id="itens"
                value={formData.itens_detalhados}
                onChange={(e) => setFormData(prev => ({ ...prev, itens_detalhados: e.target.value }))}
                placeholder="Ex: 2 Extintores CO2 6kg + 1 PQS 4kg"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  value={formData.localizacao_fisica}
                  onChange={(e) => setFormData(prev => ({ ...prev, localizacao_fisica: e.target.value }))}
                  placeholder="Ex: 2º andar, corredor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, prioridade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_ultima_troca">Data Última Execução *</Label>
                <Input
                  id="data_ultima_troca"
                  type="date"
                  value={formData.data_ultima_troca}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_ultima_troca: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validade_meses">Validade (meses)</Label>
                <Input
                  id="validade_meses"
                  type="number"
                  min={1}
                  value={formData.validade_meses}
                  onChange={(e) => setFormData(prev => ({ ...prev, validade_meses: parseInt(e.target.value) || 12 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dias_alerta">Dias Antecedência Alerta</Label>
                <Input
                  id="dias_alerta"
                  type="number"
                  min={1}
                  value={formData.dias_antecedencia_alerta}
                  onChange={(e) => setFormData(prev => ({ ...prev, dias_antecedencia_alerta: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, responsavel_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor Preferencial</Label>
                <Select
                  value={formData.fornecedor_preferencial_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, fornecedor_preferencial_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Estimado (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor_estimado}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_estimado: e.target.value }))}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingServico ? "Salvar Alterações" : "Cadastrar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finance Notification Modal */}
      <FinanceNotificationModal
        isOpen={showFinanceModal}
        onClose={() => {
          setShowFinanceModal(false);
          setSelectedServiceForNotification(null);
        }}
        servicoId={selectedServiceForNotification || undefined}
        tipo="servico"
      />
    </div>
  );
}
