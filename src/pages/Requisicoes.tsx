import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/components/auth/Can";
import { NovaRequisicaoDialog } from "@/components/Requisicoes/NovaRequisicaoDialog";
import { SlaBadge } from "@/components/Requisicoes/SlaBadge";
import { RequisicaoTimeline } from "@/components/Requisicoes/RequisicaoTimeline";
import { AREAS } from "@/lib/lexflow-constants";

interface ContractRequest {
  id: string;
  numero_requisicao: string;
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone: string | null;
  departamento: string;
  tipo_contrato: string;
  titulo: string;
  descricao: string;
  justificativa: string | null;
  valor_estimado: number | null;
  urgencia: string;
  data_necessidade: string | null;
  fornecedor_sugerido: string | null;
  status: string;
  analisado_por: string | null;
  analisado_em: string | null;
  contrato_id: string | null;
  observacoes_analise: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  em_analise: { label: "Em Análise", color: "bg-blue-100 text-blue-800", icon: Eye },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-800", icon: XCircle },
  convertido: { label: "Convertido", color: "bg-purple-100 text-purple-800", icon: ArrowRight },
};

const urgenciaConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-gray-100 text-gray-800" },
  media: { label: "Média", color: "bg-blue-100 text-blue-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", color: "bg-red-100 text-red-800" },
};

const tipoContratoLabels: Record<string, string> = {
  prestacao_servicos: "Prestação de Serviços",
  fornecimento: "Fornecimento",
  locacao: "Locação",
  confidencialidade: "Confidencialidade",
  parceria: "Parceria",
  outro: "Outro",
};

export default function Requisicoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ContractRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"aprovar" | "rejeitar" | "em_analise" | "devolver" | null>(null);
  const [observacoes, setObservacoes] = useState("");

  // Fetch requests
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["contract-requests", statusFilter, urgenciaFilter, areaFilter],
    queryFn: async () => {
      let query = supabase
        .from("contract_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (urgenciaFilter !== "all") query = query.eq("urgencia", urgenciaFilter);
      if (areaFilter !== "all") query = query.eq("departamento", areaFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as ContractRequest[];
    },
  });

  // Realtime: invalida ao mudar qualquer requisição da org (RLS filtra)
  useEffect(() => {
    const channel = supabase
      .channel("contract_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_requests" },
        () => queryClient.invalidateQueries({ queryKey: ["contract-requests"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: string; observacoes?: string }) => {
      const { data, error } = await supabase
        .from("contract_requests")
        .update({
          status,
          observacoes_analise: observacoes || null,
          analisado_por: user?.id,
          analisado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Você não tem permissão para alterar esta requisição.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      toast({ title: "Status atualizado", description: "A requisição foi atualizada." });
      setIsActionDialogOpen(false);
      setObservacoes("");
      setActionType(null);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  // Converter requisição aprovada em contrato (cria minuta e marca como convertida)
  const convertMutation = useMutation({
    mutationFn: async (req: ContractRequest) => {
      const { data: orgId } = await supabase.rpc("current_user_org");
      const { data: contrato, error: insErr } = await supabase
        .from("contratos")
        .insert({
          organization_id: orgId as unknown as string,
          titulo: req.titulo,
          descricao: req.descricao,
          tipo: req.tipo_contrato as never,
          status: "rascunho" as never,
          valor_total: req.valor_estimado,
          observacoes: req.justificativa,
          created_by: user?.id,
          numero_contrato: `CTR-${Date.now()}`,
        })
        .select("id")
        .maybeSingle();
      if (insErr) throw insErr;
      if (!contrato) throw new Error("Sem permissão para criar contrato.");

      const { error: updErr } = await supabase
        .from("contract_requests")
        .update({ status: "convertido", contrato_id: contrato.id })
        .eq("id", req.id);
      if (updErr) throw updErr;
      return contrato.id;
    },
    onSuccess: (contratoId) => {
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      toast({ title: "Contrato criado", description: "Abrindo minuta..." });
      navigate(`/contratos/${contratoId}`);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Conversão falhou", description: err.message }),
  });

  const handleAction = (
    request: ContractRequest,
    action: "aprovar" | "rejeitar" | "em_analise" | "devolver",
  ) => {
    setSelectedRequest(request);
    setActionType(action);
    setObservacoes(request.observacoes_analise || "");
    setIsActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;
    if ((actionType === "rejeitar" || actionType === "devolver") && observacoes.trim().length < 5) {
      toast({
        variant: "destructive",
        title: "Motivo obrigatório",
        description: "Descreva o motivo (mín. 5 caracteres).",
      });
      return;
    }
    const statusMap: Record<string, string> = {
      aprovar: "aprovado",
      rejeitar: "rejeitado",
      em_analise: "em_analise",
      devolver: "pendente",
    };
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: statusMap[actionType],
      observacoes,
    });
  };

  const filteredRequests = requests?.filter((req) =>
    req.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.solicitante_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.numero_requisicao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: requests?.length || 0,
    pendentes: requests?.filter((r) => r.status === "pendente").length || 0,
    emAnalise: requests?.filter((r) => r.status === "em_analise").length || 0,
    aprovados: requests?.filter((r) => r.status === "aprovado").length || 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisições de Contratos"
        description="Gerencie as solicitações de contratos recebidas"
        actions={
          <Can permission="contracts.create" fallback={null}>
            <NovaRequisicaoDialog />
          </Can>
        }
      />


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Em Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.emAnalise}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.aprovados}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, nome ou protocolo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger className="w-[180px]">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Urgências</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const status = statusConfig[request.status] || statusConfig.pendente;
                  const urgencia = urgenciaConfig[request.urgencia] || urgenciaConfig.media;
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        {request.numero_requisicao}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {request.titulo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.solicitante_nome}</p>
                          <p className="text-xs text-muted-foreground">{request.solicitante_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{request.departamento}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={urgencia.color}>
                          {urgencia.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SlaBadge
                          createdAt={request.created_at}
                          dataNecessidade={request.data_necessidade}
                          urgencia={request.urgencia}
                          status={request.status}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${status.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "pendente" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(request, "em_analise")}
                            >
                              Analisar
                            </Button>
                          )}
                          {request.status === "em_analise" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(request, "devolver")}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-1" />
                                Devolver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-success border-success/40"
                                onClick={() => handleAction(request, "aprovar")}
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/40"
                                onClick={() => handleAction(request, "rejeitar")}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {request.status === "aprovado" && !request.contrato_id && (
                            <Can permission="contracts.create">
                              <Button
                                size="sm"
                                onClick={() => convertMutation.mutate(request)}
                                disabled={convertMutation.isPending}
                              >
                                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                Converter em contrato
                              </Button>
                            </Can>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma requisição encontrada</h3>
              <p className="text-muted-foreground">
                Não há requisições que correspondam aos filtros selecionados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedRequest?.numero_requisicao}
            </DialogTitle>
            <DialogDescription>
              Detalhes da requisição de contrato
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Badge variant="outline" className={statusConfig[selectedRequest.status]?.color}>
                  {statusConfig[selectedRequest.status]?.label}
                </Badge>
                <Badge variant="outline" className={urgenciaConfig[selectedRequest.urgencia]?.color}>
                  Urgência: {urgenciaConfig[selectedRequest.urgencia]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p className="font-medium">{selectedRequest.solicitante_nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.solicitante_email}</p>
                  {selectedRequest.solicitante_telefone && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.solicitante_telefone}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Departamento</Label>
                  <p className="font-medium">{selectedRequest.departamento}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedRequest.titulo}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Tipo de Contrato</Label>
                <p className="font-medium">{tipoContratoLabels[selectedRequest.tipo_contrato]}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.descricao}</p>
              </div>

              {selectedRequest.justificativa && (
                <div>
                  <Label className="text-muted-foreground">Justificativa</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.justificativa}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedRequest.valor_estimado && (
                  <div>
                    <Label className="text-muted-foreground">Valor Estimado</Label>
                    <p className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(selectedRequest.valor_estimado)}
                    </p>
                  </div>
                )}
                {selectedRequest.data_necessidade && (
                  <div>
                    <Label className="text-muted-foreground">Data de Necessidade</Label>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.data_necessidade), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.fornecedor_sugerido && (
                <div>
                  <Label className="text-muted-foreground">Fornecedor Sugerido</Label>
                  <p className="font-medium">{selectedRequest.fornecedor_sugerido}</p>
                </div>
              )}

              {selectedRequest.observacoes_analise && (
                <div>
                  <Label className="text-muted-foreground">Observações da Análise</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.observacoes_analise}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Criado em: {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "aprovar" && "Aprovar Requisição"}
              {actionType === "rejeitar" && "Rejeitar Requisição"}
              {actionType === "em_analise" && "Iniciar Análise"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "aprovar" && "Confirme a aprovação desta requisição de contrato."}
              {actionType === "rejeitar" && "Informe o motivo da rejeição desta requisição."}
              {actionType === "em_analise" && "Marcar esta requisição como em análise."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre a análise..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
              className={
                actionType === "aprovar"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "rejeitar"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
