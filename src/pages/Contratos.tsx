import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download, Calendar, Eye, FileText, ArrowUpRight, Upload, List, Kanban as KanbanIcon } from "lucide-react";
import { exportContratosPDF } from "@/utils/pdfExport";
import { BuscaAvancada, FiltrosAvancados } from "@/components/BuscaAvancada";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge, ContractTypeBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { ContractImport } from "@/components/ContractImport/ContractImport";
import { KanbanBoard } from "@/components/contracts/KanbanBoard";
import { CalendarView, CalendarObligation } from "@/components/contracts/CalendarView";

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
};

const Contratos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAvancados>({
    busca: searchParams.get("search") || "",
  });
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "calendario">("lista");
  const [obligations, setObligations] = useState<CalendarObligation[]>([]);

  useEffect(() => {
    fetchContratos();
    fetchFornecedores();
    fetchObligations();
    generateNextContractNumber();
  }, [filtros]);

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
        description: error.message,
      });
    } else {
      setContratos(data || []);
    }
    setLoading(false);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome, cnpj, cpf")
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
        description: error.message,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsAnalyzing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contratos-documentos')
        .upload(fileName, file);

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar arquivo",
          description: uploadError.message,
        });
        setIsAnalyzing(false);
        return;
      }

      toast({
        title: "Arquivo enviado com sucesso!",
        description: "Preencha as datas de início e término do contrato",
      });

    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!formData.fornecedor_id || !formData.data_inicio || !formData.data_fim) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos marcados com *",
      });
      return;
    }

    const { error } = await supabase.from("contratos").insert([
      {
        ...formData,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
        fornecedor_id: formData.fornecedor_id,
        created_by: user.id,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar contrato",
        description: error.message,
      });
    } else {
      toast({
        title: "Contrato criado com sucesso!",
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
      setUploadedFile(null);
      fetchContratos();
      generateNextContractNumber();
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
        title="Contratos"
        description={`${contratos.length} contrato(s) cadastrado(s)`}
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="btn-cta">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Novo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Contrato</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do contrato
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero_contrato">Número do Contrato *</Label>
                      <Input
                        id="numero_contrato"
                        value={formData.numero_contrato}
                        onChange={(e) =>
                          setFormData({ ...formData, numero_contrato: e.target.value })
                        }
                        required
                        placeholder="Ex: CT-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prestacao_servicos">Prestação de Serviço</SelectItem>
                          <SelectItem value="fornecimento">Fornecimento</SelectItem>
                          <SelectItem value="locacao">Locação</SelectItem>
                          <SelectItem value="confidencialidade">Confidencialidade</SelectItem>
                          <SelectItem value="parceria">Parceria</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arquivo">Anexar Contrato (PDF)</Label>
                    <Input
                      id="arquivo"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isAnalyzing}
                    />
                    {isAnalyzing && (
                      <p className="text-sm text-muted-foreground">
                        Enviando arquivo...
                      </p>
                    )}
                    {uploadedFile && !isAnalyzing && (
                      <p className="text-sm text-success flex items-center gap-1">
                        ✓ Arquivo anexado: {uploadedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fornecedor">Fornecedor *</Label>
                    <Select
                      value={formData.fornecedor_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fornecedor_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((fornecedor) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valor_total">Valor Total</Label>
                      <Input
                        id="valor_total"
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) =>
                          setFormData({ ...formData, valor_total: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moeda">Moeda</Label>
                      <Select
                        value={formData.moeda}
                        onValueChange={(value) =>
                          setFormData({ ...formData, moeda: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">BRL (R$)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data_inicio">Data de Início *</Label>
                      <Input
                        id="data_inicio"
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) =>
                          setFormData({ ...formData, data_inicio: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_fim">Data de Término *</Label>
                      <Input
                        id="data_fim"
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) =>
                          setFormData({ ...formData, data_fim: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Contrato</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
