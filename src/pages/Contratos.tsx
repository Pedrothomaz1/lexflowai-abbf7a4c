import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calendar, Eye, Upload, List, Kanban as KanbanIcon } from "lucide-react";
import { exportContratosPDF } from "@/utils/pdfExport";
import { BuscaAvancada, FiltrosAvancados } from "@/components/BuscaAvancada";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge, ContractTypeBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { ContractImport } from "@/components/ContractImport/ContractImport";
import { KanbanBoard } from "@/components/contracts/KanbanBoard";
import { CalendarView, CalendarObligation } from "@/components/contracts/CalendarView";
import { ContratoFormDialog } from "@/components/contracts/ContratoFormDialog";
import { helpTexts } from "@/lib/help-texts";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { handleDbError } from "@/utils/dbErrorHandler";
import { ContractRiskBadge } from "@/components/contracts/ContractRiskBadge";

type Contrato = {
  id: string;
  numero_contrato: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: string;
  valor_total: number | null;
  moeda: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  fornecedor_id: string | null;
  created_at: string;
};

type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string | null;
  cpf?: string | null;
  cnpj_status?: string | null;
};

const Contratos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [riskScores, setRiskScores] = useState<Record<string, number | null>>({});
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    numero_contrato: "",
    titulo: "",
    descricao: "",
    tipo: "outro",
    valor_total: "",
    moeda: "BRL",
    data_inicio: "",
    data_fim: "",
    fornecedor_id: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAvancados>({
    busca: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
  });
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "calendario">("lista");
  const [obligations, setObligations] = useState<CalendarObligation[]>([]);

  useEffect(() => {
    fetchContratos();
    fetchFornecedores();
    fetchObligations();
    generateNextContractNumber();
  }, [filtros]);

  // Open dialog if ?novo=true in URL
  useEffect(() => {
    if (searchParams.get("novo") === "true") {
      setDialogOpen(true);
    }
  }, [searchParams]);

  const generateNextContractNumber = async () => {
    const { data } = await supabase
      .from("contratos")
      .select("numero_contrato")
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastNumber = data[0].numero_contrato;
      const match = lastNumber.match(/(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        const prefix = lastNumber.substring(0, lastNumber.length - match[1].length);
        setFormData(prev => ({ ...prev, numero_contrato: `${prefix}${nextNum.toString().padStart(match[1].length, '0')}` }));
      } else {
        setFormData(prev => ({ ...prev, numero_contrato: `CT-${new Date().getFullYear()}-001` }));
      }
    } else {
      setFormData(prev => ({ ...prev, numero_contrato: `CT-${new Date().getFullYear()}-001` }));
    }
  };

  const fetchContratos = async () => {
    setLoading(true);
    
    let query = supabase.from("contratos").select("*");

    if (filtros.busca) {
      query = query.or(`numero_contrato.ilike.%${filtros.busca}%,titulo.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
    }
    if (filtros.tipo) {
      query = query.eq("tipo", filtros.tipo);
    }
    if (filtros.status) {
      query = query.eq("status", filtros.status);
    }
    if (filtros.fornecedor) {
      query = query.eq("fornecedor_id", filtros.fornecedor);
    }
    if (filtros.valorMin) {
      query = query.gte("valor_total", parseFloat(filtros.valorMin));
    }
    if (filtros.valorMax) {
      query = query.lte("valor_total", parseFloat(filtros.valorMax));
    }
    if (filtros.dataInicioMin) {
      query = query.gte("data_inicio", filtros.dataInicioMin);
    }
    if (filtros.dataInicioMax) {
      query = query.lte("data_inicio", filtros.dataInicioMax);
    }
    if (filtros.dataFimMin) {
      query = query.gte("data_fim", filtros.dataFimMin);
    }
    if (filtros.dataFimMax) {
      query = query.lte("data_fim", filtros.dataFimMax);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar contratos",
        description: handleDbError(error).message,
      });
    } else {
      setContratos(data || []);
      const ids = (data || []).map((c: any) => c.id);
      if (ids.length > 0) {
        const { data: analises } = await supabase
          .from("contract_analysis")
          .select("contrato_id, score_risco, analisado_em")
          .in("contrato_id", ids)
          .order("analisado_em", { ascending: false });
        const map: Record<string, number | null> = {};
        (analises || []).forEach((a: any) => {
          if (!(a.contrato_id in map)) {
            map[a.contrato_id] = a.score_risco !== null ? Number(a.score_risco) : null;
          }
        });
        setRiskScores(map);
      } else {
        setRiskScores({});
      }
    }
    setLoading(false);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome, cnpj, cpf, cnpj_status")
      .order("nome");
    
    setFornecedores(data || []);
  };

  const fetchObligations = async () => {
    const { data, error } = await supabase
      .from("contract_obligations")
      .select(`
        *,
        contratos (
          numero_contrato,
          titulo
        )
      `)
      .order("data_vencimento", { ascending: true });

    if (!error && data) {
      setObligations(data as CalendarObligation[]);
    }
  };

  const handleStatusChange = async (contratoId: string, newStatus: string) => {
    const { error } = await supabase
      .from("contratos")
      .update({ status: newStatus })
      .eq("id", contratoId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: handleDbError(error).message,
      });
      fetchContratos();
    } else {
      const statusLabels: Record<string, string> = {
        rascunho: "Rascunho",
        em_aprovacao: "Em Aprovação",
        aprovado: "Aprovado",
        assinado: "Assinado",
        vigente: "Vigente",
        encerrado: "Encerrado",
        cancelado: "Cancelado",
      };
      toast({
        title: "Status atualizado!",
        description: `Contrato movido para "${statusLabels[newStatus] || newStatus}"`,
      });
      fetchContratos();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
      });
      return;
    }

    if (!formData.fornecedor_id || !formData.data_inicio || !formData.data_fim) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos marcados com *",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("contratos").insert([
        {
          ...formData,
          organization_id: organization.id,
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
          fornecedor_id: formData.fornecedor_id,
          created_by: user.id,
        },
      ]).select("id").single();

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          toast({
            variant: "destructive",
            title: "Sem permissão",
            description: "Você não tem permissão para criar contratos. Verifique seu acesso.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao criar contrato",
            description: handleDbError(error).message,
          });
        }
        return;
      }

      // Upload attachments to Storage and insert into contract_attachments
      if (data && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${organization.id}/${user.id}/${Date.now()}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('contratos-documentos')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          await supabase.from("contract_attachments").insert({
            organization_id: organization.id,
            contrato_id: data.id,
            nome_arquivo: file.name,
            arquivo_url: fileName,
            tipo_documento: file.type,
            tamanho_bytes: file.size,
            uploaded_by: user.id,
          });
        }
      }

      toast({
        title: "Contrato criado com sucesso!",
        description: uploadedFiles.length > 0 ? `${uploadedFiles.length} anexo(s) adicionado(s)` : undefined,
      });
      setDialogOpen(false);
      setFormData({
        numero_contrato: "",
        titulo: "",
        descricao: "",
        tipo: "outro",
        valor_total: "",
        moeda: "BRL",
        data_inicio: "",
        data_fim: "",
        fornecedor_id: "",
      });
      setUploadedFiles([]);
      fetchContratos();
      generateNextContractNumber();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    exportContratosPDF(contratos, fornecedores);
  };

  const formatCurrency = (value: number | null, moeda: string | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda || "BRL",
    }).format(value);
  };

  const columns: Column<Contrato>[] = [
    {
      key: "numero_contrato",
      header: "Número",
      cell: (contrato) => (
        <span className="font-mono text-sm font-medium">{contrato.numero_contrato}</span>
      ),
      className: "w-[120px]",
    },
    {
      key: "titulo",
      header: "Título",
      cell: (contrato) => (
        <div className="min-w-0">
          <p className="font-medium truncate max-w-[250px]">{contrato.titulo}</p>
          {contrato.descricao && (
            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
              {contrato.descricao}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (contrato) => <ContractTypeBadge type={contrato.tipo} />,
      className: "w-[140px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (contrato) => <StatusBadge status={contrato.status} />,
      className: "w-[120px]",
    },
    {
      key: "risco",
      header: "Risco",
      cell: (contrato) => <ContractRiskBadge score={riskScores[contrato.id] ?? null} />,
      className: "w-[140px]",
    },
    {
      key: "valor_total",
      header: "Valor",
      cell: (contrato) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(contrato.valor_total, contrato.moeda)}
        </span>
      ),
      className: "w-[130px] text-right",
    },
    {
      key: "vigencia",
      header: "Vigência",
      cell: (contrato) => (
        contrato.data_inicio && contrato.data_fim ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(contrato.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              {" - "}
              {new Date(contrato.data_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
      className: "w-[180px]",
    },
    {
      key: "acoes",
      header: "",
      cell: (contrato) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/contratos/${contrato.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contratos de Serviço"
        description={`Gestão de contratos com fornecedores e terceiros · ${contratos.length} cadastrado(s)`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importar XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar
            </Button>
            <ContratoFormDialog
              open={dialogOpen}
              onOpenChange={(open) => { setDialogOpen(open); if (!open) setUploadedFiles([]); }}
              formData={formData}
              onFormDataChange={setFormData}
              uploadedFiles={uploadedFiles}
              onFileSelect={handleFileSelect}
              onRemoveFile={removeFile}
              fornecedores={fornecedores}
              onSubmit={handleSubmit}
              submitting={submitting}
              onFornecedorCreated={(newFornecedor) => {
                setFornecedores(prev => [...prev, newFornecedor].sort((a, b) => a.nome.localeCompare(b.nome)));
              }}
            />
          </div>
        }
      />

      <BuscaAvancada 
        filtros={filtros} 
        onFiltrosChange={setFiltros}
        fornecedores={fornecedores}
      />

      {/* Unified View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="space-y-4">
        <TabsList className="bg-[hsl(var(--lexflow-off-white))] p-1">
          <TabsTrigger 
            value="lista" 
            className={cn(
              "gap-2 data-[state=active]:text-white transition-all",
              "data-[state=active]:bg-[hsl(var(--lexflow-verde-principal))] data-[state=active]:shadow-sm"
            )}
          >
            <List className="h-4 w-4" />
            Lista
            <HelpTooltip text={helpTexts.contratos.vistaLista} />
          </TabsTrigger>
          <TabsTrigger 
            value="kanban" 
            className={cn(
              "gap-2 data-[state=active]:text-white transition-all",
              "data-[state=active]:bg-[hsl(var(--lexflow-verde-principal))] data-[state=active]:shadow-sm"
            )}
          >
            <KanbanIcon className="h-4 w-4" />
            Kanban
            <HelpTooltip text={helpTexts.contratos.vistaKanban} />
          </TabsTrigger>
          <TabsTrigger 
            value="calendario" 
            className={cn(
              "gap-2 data-[state=active]:text-white transition-all",
              "data-[state=active]:bg-[hsl(var(--lexflow-verde-principal))] data-[state=active]:shadow-sm"
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendário
            <HelpTooltip text={helpTexts.contratos.vistaCalendario} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <DataTable
            data={contratos}
            columns={columns}
            loading={loading}
            onRowClick={(contrato) => navigate(`/contratos/${contrato.id}`)}
            emptyState={{
              title: "Nenhum contrato encontrado",
              description: "Clique em 'Novo Contrato' para começar",
              action: {
                label: "Novo Contrato",
                onClick: () => setDialogOpen(true),
              },
            }}
          />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard
            contratos={contratos}
            fornecedores={fornecedores}
            onStatusChange={handleStatusChange}
            onViewContrato={(id) => navigate(`/contratos/${id}`)}
          />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CalendarView obligations={obligations} />
        </TabsContent>
      </Tabs>

      <ContractImport
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          fetchContratos();
          fetchFornecedores();
        }}
        fornecedores={fornecedores}
      />
    </div>
  );
};

export default Contratos;
