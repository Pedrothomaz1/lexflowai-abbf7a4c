import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  RefreshCcw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { FinanceNotificationModal } from "@/components/FinanceNotificationModal";
import { ServicosStats } from "@/components/Servicos/ServicosStats";
import { ServicosFilters } from "@/components/Servicos/ServicosFilters";
import { ServicoFormDialog } from "@/components/Servicos/ServicoFormDialog";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [sendingCompras, setSendingCompras] = useState<string | null>(null);
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [selectedServiceForNotification, setSelectedServiceForNotification] = useState<string | null>(null);

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

  useEffect(() => {
    if (searchParams.get("novo") === "true") {
      resetForm();
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicosRes, unidadesRes, especificacoesRes, fornecedoresRes, profilesRes] = await Promise.all([
        supabase
          .from("servicos_periodicos")
          .select(`*, unidades(nome, cidade), especificacoes_servico(nome, categoria)`)
          .order("data_validade", { ascending: true }),
        supabase.from("unidades").select("id, nome").eq("is_active", true),
        supabase.from("especificacoes_servico").select("*").eq("is_active", true),
        supabase.from("fornecedores").select("id, nome"),
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (servicosRes.error) throw servicosRes.error;
      if (unidadesRes.error) throw unidadesRes.error;
      if (especificacoesRes.error) throw especificacoesRes.error;

      const profilesMap: Record<string, string> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach((p) => { profilesMap[p.id] = p.full_name; });
      }

      const servicoIds = servicosRes.data?.map((s) => s.id) || [];
      const { data: solicitacoesData } = await supabase
        .from("solicitacoes_compras")
        .select("servico_id, status_envio, codigo_solicitacao, created_at")
        .in("servico_id", servicoIds)
        .order("created_at", { ascending: false });

      const solicitacoesMap: Record<string, { status_envio: string; codigo_solicitacao: string | null }> = {};
      if (solicitacoesData) {
        solicitacoesData.forEach((s) => {
          if (!solicitacoesMap[s.servico_id]) {
            solicitacoesMap[s.servico_id] = { status_envio: s.status_envio, codigo_solicitacao: s.codigo_solicitacao };
          }
        });
      }

      const enrichedServicos: Servico[] = (servicosRes.data || []).map((s) => ({
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
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEspecificacaoChange = (especificacaoId: string) => {
    const spec = especificacoes.find((e) => e.id === especificacaoId);
    if (spec) {
      setFormData((prev) => ({
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
      toast({ title: "Campos obrigatórios", description: "Selecione a unidade e o tipo de serviço.", variant: "destructive" });
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
        const { error } = await supabase.from("servicos_periodicos").update(payload).eq("id", editingServico.id);
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
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
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

      await supabase.from("servico_historico").insert({
        servico_id: servico.id,
        tipo_acao: "renovacao",
        data_execucao: format(hoje, "yyyy-MM-dd"),
        proxima_validade: format(novaValidade, "yyyy-MM-dd"),
      });

      toast({ title: "Serviço renovado com sucesso!" });
      fetchData();

      setSelectedServiceForNotification(servico.id);
      setShowFinanceModal(true);
    } catch (error: any) {
      toast({ title: "Erro ao renovar", description: error.message, variant: "destructive" });
    }
  };

  const filteredServicos = servicos.filter((s) => {
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

  const stats = {
    total: servicos.length,
    dentroPrazo: servicos.filter((s) => s.status === "dentro_prazo").length,
    emAlerta: servicos.filter((s) => s.status === "alerta").length,
    vencidos: servicos.filter((s) => s.status === "vencido").length,
  };

  const proximoVencimento = servicos
    .filter((s) => s.status !== "vencido")
    .sort((a, b) => new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime())[0];

  const completionRate = stats.total > 0 ? Math.round((stats.dentroPrazo / stats.total) * 100) : 0;

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
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.itens_detalhados}</div>
          )}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (_: any, row: Servico) => {
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
      render: (value: string) => {
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
        if (!value) return <span className="text-muted-foreground text-sm">-</span>;
        const statusColors: Record<string, string> = {
          pendente: "bg-yellow-100 text-yellow-800",
          enviado: "bg-blue-100 text-blue-800",
          confirmado: "bg-green-100 text-green-800",
          erro: "bg-red-100 text-red-800",
        };
        return (
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <Badge className={statusColors[value.status_envio] || "bg-gray-100"}>{value.status_envio}</Badge>
            {value.codigo_solicitacao && (
              <span className="text-xs text-muted-foreground">#{value.codigo_solicitacao}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (_: any, row: Servico) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setSendingCompras(row.id);
              try {
                const { data, error } = await supabase.functions.invoke("enviar-solicitacao-compras", {
                  body: { servicoId: row.id },
                });
                if (error) throw error;
                if (data?.success) {
                  toast({
                    title: "Solicitação enviada!",
                    description:
                      data.status === "pendente"
                        ? "Registrada como pendente (integração não configurada)."
                        : `Código: ${data.codigo_solicitacao || data.solicitacao_id}`,
                  });
                } else {
                  toast({ title: "Erro ao enviar", description: data?.message || "Erro desconhecido", variant: "destructive" });
                }
                fetchData();
              } catch (err: any) {
                toast({ title: "Erro ao enviar para compras", description: err.message, variant: "destructive" });
              } finally {
                setSendingCompras(null);
              }
            }}
            disabled={sendingCompras === row.id}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            {sendingCompras === row.id ? "Enviando..." : "Compras"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRenovar(row)}
            disabled={row.status === "dentro_prazo"}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Renovar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
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

      <ServicosStats
        stats={stats}
        completionRate={completionRate}
        proximoVencimento={proximoVencimento}
      />

      <ServicosFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        unidadeFilter={unidadeFilter}
        onUnidadeChange={setUnidadeFilter}
        categoriaFilter={categoriaFilter}
        onCategoriaChange={setCategoriaFilter}
        unidades={unidades}
      />

      <DataTable
        columns={columns}
        data={filteredServicos}
        emptyState={{
          title: "Comece a gerenciar seus serviços",
          description: "Cadastre serviços periódicos para receber alertas automáticos de vencimento e manter a conformidade operacional.",
          action: { label: "Cadastrar Primeiro Serviço", onClick: () => setIsDialogOpen(true) },
        }}
      />

      <ServicoFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingServico={editingServico}
        formData={formData}
        onFormDataChange={setFormData}
        especificacoes={especificacoes}
        unidades={unidades}
        profiles={profiles}
        fornecedores={fornecedores}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onReset={resetForm}
        onEspecificacaoChange={handleEspecificacaoChange}
      />

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
