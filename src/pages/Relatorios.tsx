import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { 
  FileText, 
  Plus, 
  Download, 
  Calendar, 
  Filter,
  Table,
  BarChart3,
  PieChart,
  Trash2,
  Play,
  Save,
  Share2,
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportContratosPDF } from "@/utils/pdfExport";
import { handleDbError } from "@/utils/dbErrorHandler";

interface ReportConfig {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_relatorio: string;
  filtros: Record<string, any>;
  colunas: string[];
  ordenacao: Record<string, any>;
  visualizacao: string;
  agendamento: string | null;
  destinatarios: string[] | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: "contratos", label: "Contratos", icon: FileText },
  { value: "fornecedores", label: "Fornecedores", icon: FileText },
  { value: "obrigacoes", label: "Obrigações", icon: Calendar },
  { value: "vencimentos", label: "Vencimentos", icon: Clock },
  { value: "financeiro", label: "Financeiro", icon: BarChart3 },
];

const CONTRATO_COLUMNS = [
  { key: "numero_contrato", label: "Número" },
  { key: "titulo", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "valor_total", label: "Valor" },
  { key: "data_inicio", label: "Início" },
  { key: "data_fim", label: "Término" },
  { key: "created_at", label: "Criado em" },
];

const VISUALIZATION_OPTIONS = [
  { value: "tabela", label: "Tabela", icon: Table },
  { value: "grafico_barras", label: "Gráfico de Barras", icon: BarChart3 },
  { value: "grafico_pizza", label: "Gráfico de Pizza", icon: PieChart },
];

export default function Relatorios() {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [executingReport, setExecutingReport] = useState(false);

  // Form state for new report
  const [newReport, setNewReport] = useState({
    nome: "",
    descricao: "",
    tipo_relatorio: "contratos",
    filtros: {} as Record<string, any>,
    colunas: ["numero_contrato", "titulo", "status", "valor_total"],
    visualizacao: "tabela",
    agendamento: "",
    is_public: false,
  });

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterDataInicio, setFilterDataInicio] = useState<string>("");
  const [filterDataFim, setFilterDataFim] = useState<string>("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("report_configurations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports((data || []) as ReportConfig[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!organization?.id) {
        toast({
          variant: "destructive",
          title: "Organização não encontrada",
          description: "Finalize o onboarding ou verifique seu acesso.",
        });
        return;
      }

      const filtros = {
        // "all" is the "Todos" option in the Select — treat it as no filter
        status: filterStatus && filterStatus !== "all" ? filterStatus : undefined,
        tipo: filterTipo && filterTipo !== "all" ? filterTipo : undefined,
        data_inicio: filterDataInicio || undefined,
        data_fim: filterDataFim || undefined,
      };

      const { error } = await supabase
        .from("report_configurations")
        .insert({
          ...newReport,
          filtros,
          colunas: newReport.colunas,
          organization_id: organization.id,
          created_by: user.id,
        });

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Você não tem permissão para esta ação.");
        }
        throw error;
      }

      toast({
        title: "Relatório criado",
        description: "O relatório foi salvo com sucesso.",
      });

      setIsCreating(false);
      setNewReport({
        nome: "",
        descricao: "",
        tipo_relatorio: "contratos",
        filtros: {},
        colunas: ["numero_contrato", "titulo", "status", "valor_total"],
        visualizacao: "tabela",
        agendamento: "",
        is_public: false,
      });
      setFilterStatus("");
      setFilterTipo("");
      setFilterDataInicio("");
      setFilterDataFim("");
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Erro ao criar relatório",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    }
  };

  const handleExecuteReport = async (report: ReportConfig) => {
    setExecutingReport(true);
    setSelectedReport(report);
    
    try {
      let query = supabase.from("contratos").select("*, fornecedores(nome)");

      const filtros = report.filtros || {};
      
      if (filtros.status) {
        query = query.eq("status", filtros.status);
      }
      if (filtros.tipo) {
        query = query.eq("tipo", filtros.tipo);
      }
      if (filtros.data_inicio) {
        query = query.gte("data_inicio", filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte("data_fim", filtros.data_fim);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setReportData(data || []);
      
      // Log compliance event
      const { data: { user } } = await supabase.auth.getUser();
      if (user && organization?.id) {
        await supabase.from("compliance_logs").insert({
          tipo_evento: "exportacao",
          entidade: "relatorio",
          entidade_id: report.id,
          dados_afetados: { registros: data?.length || 0 },
          justificativa: `Execução do relatório: ${report.nome}`,
          base_legal: "interesse_legitimo",
          user_id: user.id,
          organization_id: organization.id,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao executar relatório",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    } finally {
      setExecutingReport(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData.length) return;
    
    const fornecedores = reportData.map(c => c.fornecedores).filter(Boolean);
    exportContratosPDF(reportData, fornecedores);
    
    toast({
      title: "PDF exportado",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  const handleDeleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from("report_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Relatório excluído",
        description: "O relatório foi excluído com sucesso.",
      });

      fetchReports();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir relatório",
        description: handleDbError(error).message,
        variant: "destructive",
      });
    }
  };

  const toggleColumn = (column: string) => {
    setNewReport(prev => ({
      ...prev,
      colunas: prev.colunas.includes(column)
        ? prev.colunas.filter(c => c !== column)
        : [...prev.colunas, column],
    }));
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Relatórios Customizáveis"
        description="Crie e execute relatórios personalizados"
        actions={
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="btn-cta">
                <Plus className="h-4 w-4 mr-2" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Relatório</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do Relatório</Label>
                    <Input
                      value={newReport.nome}
                      onChange={(e) => setNewReport(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Contratos Ativos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newReport.tipo_relatorio}
                      onValueChange={(value) => setNewReport(prev => ({ ...prev, tipo_relatorio: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={newReport.descricao}
                    onChange={(e) => setNewReport(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição opcional do relatório"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        <SelectItem value="prestacao_servicos">Prestação de Serviços</SelectItem>
                        <SelectItem value="fornecimento">Fornecimento</SelectItem>
                        <SelectItem value="locacao">Locação</SelectItem>
                        <SelectItem value="confidencialidade">Confidencialidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data Início (a partir de)</Label>
                      <Input
                        type="date"
                        value={filterDataInicio}
                        onChange={(e) => setFilterDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data Fim (até)</Label>
                      <Input
                        type="date"
                        value={filterDataFim}
                        onChange={(e) => setFilterDataFim(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Colunas do Relatório</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CONTRATO_COLUMNS.map(col => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={col.key}
                          checked={newReport.colunas.includes(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <label htmlFor={col.key} className="text-sm cursor-pointer">
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Visualização</Label>
                  <div className="flex gap-2">
                    {VISUALIZATION_OPTIONS.map(viz => (
                      <Button
                        key={viz.value}
                        type="button"
                        variant={newReport.visualizacao === viz.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewReport(prev => ({ ...prev, visualizacao: viz.value }))}
                        className="flex-1"
                      >
                        <viz.icon className="h-4 w-4 mr-1" />
                        {viz.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_public"
                    checked={newReport.is_public}
                    onCheckedChange={(checked) => setNewReport(prev => ({ ...prev, is_public: !!checked }))}
                  />
                  <label htmlFor="is_public" className="text-sm">
                    <Share2 className="h-4 w-4 inline mr-1" />
                    Compartilhar com todos os usuários
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateReport} disabled={!newReport.nome}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Relatório
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="meus" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meus">Meus Relatórios</TabsTrigger>
          <TabsTrigger value="compartilhados">Compartilhados</TabsTrigger>
          <TabsTrigger value="resultado">Resultado</TabsTrigger>
        </TabsList>

        <TabsContent value="meus" className="space-y-4">
          {reports.filter(r => !r.is_public).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum relatório criado"
              description="Crie seu primeiro relatório customizado"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.filter(r => !r.is_public).map(report => (
                <Card key={report.id} className="card-elevated">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{report.nome}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {report.descricao || "Sem descrição"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {REPORT_TYPES.find(t => t.value === report.tipo_relatorio)?.label || report.tipo_relatorio}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(report.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span>
                        {(report.colunas as string[])?.length || 0} colunas
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleExecuteReport(report)}
                        disabled={executingReport}
                        className="flex-1"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Executar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compartilhados" className="space-y-4">
          {reports.filter(r => r.is_public).length === 0 ? (
            <EmptyState
              icon={Share2}
              title="Nenhum relatório compartilhado"
              description="Relatórios públicos aparecerão aqui"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.filter(r => r.is_public).map(report => (
                <Card key={report.id} className="card-elevated">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{report.nome}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {report.descricao || "Sem descrição"}
                        </CardDescription>
                      </div>
                      <Badge className="text-xs">
                        <Share2 className="h-3 w-3 mr-1" />
                        Público
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => handleExecuteReport(report)}
                      disabled={executingReport}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Executar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resultado" className="space-y-4">
          {!selectedReport ? (
            <EmptyState
              icon={Eye}
              title="Nenhum relatório executado"
              description="Execute um relatório para ver os resultados"
            />
          ) : (
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedReport.nome}</CardTitle>
                  <CardDescription>
                    {reportData.length} registros encontrados
                  </CardDescription>
                </div>
                <Button onClick={handleExportPDF} disabled={!reportData.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </CardHeader>
              <CardContent>
                {reportData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado com os filtros aplicados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {(selectedReport.colunas as string[])?.map(col => (
                            <th key={col} className="text-left py-2 px-3 font-medium">
                              {CONTRATO_COLUMNS.find(c => c.key === col)?.label || col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            {(selectedReport.colunas as string[])?.map(col => (
                              <td key={col} className="py-2 px-3">
                                {col === "fornecedor" 
                                  ? row.fornecedores?.nome || "-"
                                  : col === "valor_total"
                                  ? row[col] 
                                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row[col])
                                    : "-"
                                  : col.includes("data")
                                  ? row[col] 
                                    ? format(new Date(row[col]), "dd/MM/yyyy", { locale: ptBR })
                                    : "-"
                                  : row[col] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
