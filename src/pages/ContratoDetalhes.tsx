import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Upload,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Brain,
  AlertTriangle,
  Info,
} from "lucide-react";
import { exportContratoDetalhePDF } from "@/utils/pdfExport";
import { ContractComments } from "@/components/ContractComments";
import { ContractSignature } from "@/components/ContractSignature";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { StatusBadge } from "@/components/ui/status-badge";

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
  data_assinatura: string | null;
  fornecedor_id: string | null;
  arquivo_url: string | null;
  observacoes: string | null;
  versao: number;
  created_at: string;
  updated_at: string;
};

type Fornecedor = {
  id: string;
  nome: string;
};

type Aprovacao = {
  id: string;
  status: string | null;
  comentario: string | null;
  data_aprovacao: string | null;
  aprovador_id: string | null;
};

const ContratoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canApprove } = useUserRole();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [novaAprovacao, setNovaAprovacao] = useState({
    status: "aprovado",
    comentario: "",
  });
  const [analise, setAnalise] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalise, setShowAnalise] = useState(false);

  useEffect(() => {
    if (id) {
      fetchContrato();
      fetchAprovacoes();
      fetchAnalise();
    }
  }, [id]);

  const fetchContrato = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar contrato:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar contrato",
          description: error.message,
        });
        return;
      }
      
      if (!data) {
        console.error("Contrato não encontrado para ID:", id);
        toast({
          variant: "destructive",
          title: "Contrato não encontrado",
          description: "O contrato solicitado não existe.",
        });
        return;
      }
      
      setContrato(data);
      
      if (data.fornecedor_id) {
        fetchFornecedor(data.fornecedor_id);
      }
    } catch (error: any) {
      console.error("Erro ao buscar contrato:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedor = async (fornecedorId: string) => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("id", fornecedorId)
      .maybeSingle();

    if (data) {
      setFornecedor(data);
    }
  };

  const fetchAprovacoes = async () => {
    const { data } = await supabase
      .from("contract_approvals")
      .select("*")
      .eq("contrato_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setAprovacoes(data);
    }
  };

  const fetchAnalise = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("contract_analysis")
      .select("*")
      .eq("contrato_id", id)
      .order("analisado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setAnalise(data);
    }
  };

  const handleAnalisarIA = async () => {
    if (!contrato) return;

    setIsAnalyzing(true);
    try {
      const conteudo = `
        Contrato: ${contrato.numero_contrato}
        Título: ${contrato.titulo}
        Tipo: ${contrato.tipo}
        Valor: R$ ${contrato.valor_total?.toLocaleString("pt-BR") || "N/A"}
        Descrição: ${contrato.descricao || ""}
        Observações: ${contrato.observacoes || ""}
      `;

      const { data, error } = await supabase.functions.invoke("analisar-contrato-ia", {
        body: { contratoId: contrato.id, conteudo },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Análise concluída!",
          description: "O contrato foi analisado com sucesso pela IA.",
        });
        setAnalise(data.analise);
        setShowAnalise(true);
      } else {
        throw new Error(data.error || "Erro na análise");
      }
    } catch (error: any) {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !contrato) return;

    const file = e.target.files[0];
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${contrato.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("contratos-documentos")
      .upload(filePath, file);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: uploadError.message,
      });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from("contratos-documentos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("contratos")
        .update({ arquivo_url: publicUrl })
        .eq("id", contrato.id);

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar contrato",
          description: updateError.message,
        });
      } else {
        toast({
          title: "Documento enviado com sucesso!",
        });
        fetchContrato();
      }
    }

    setUploading(false);
  };

  const handleAddAprovacao = async () => {
    if (!contrato) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("contract_approvals").insert([
      {
        contrato_id: contrato.id,
        aprovador_id: user.id,
        status: novaAprovacao.status,
        comentario: novaAprovacao.comentario,
        data_aprovacao: new Date().toISOString(),
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar aprovação",
        description: error.message,
      });
    } else {
      toast({
        title: "Aprovação registrada com sucesso!",
      });
      setNovaAprovacao({ status: "aprovado", comentario: "" });
      fetchAprovacoes();

      if (novaAprovacao.status === "aprovado") {
        await supabase
          .from("contratos")
          .update({ status: "vigente" })
          .eq("id", contrato.id);
        fetchContrato();
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!contrato) return;

    const { error } = await supabase
      .from("contratos")
      .update({ status: newStatus })
      .eq("id", contrato.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } else {
      toast({
        title: "Status atualizado com sucesso!",
      });
      fetchContrato();
    }
  };

  const handleExportPDF = () => {
    if (contrato) {
      exportContratoDetalhePDF(contrato, fornecedor, aprovacoes);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!contrato) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={FileText}
          title="Contrato não encontrado"
          description="O contrato solicitado não existe ou foi removido."
          action={{
            label: "Voltar para Contratos",
            onClick: () => navigate("/contratos"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-4">
          <AnimatedButton variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-4 w-4" />
          </AnimatedButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{contrato.titulo}</h1>
            <p className="text-sm text-muted-foreground">
              Contrato Nº {contrato.numero_contrato}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedButton variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </AnimatedButton>
            <StatusBadge status={contrato.status} />
          </div>
        </div>
      </FadeIn>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contract Info */}
        <StaggerContainer className="lg:col-span-2 space-y-6">
          <StaggerItem>
            <AnimatedCard>
              <AnimatedCardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Informações do Contrato</h3>
                </div>
              </AnimatedCardHeader>
              <AnimatedCardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <InfoItem
                    icon={FileText}
                    label="Tipo"
                    value={contrato.tipo.replace(/_/g, " ")}
                    capitalize
                  />
                  {contrato.valor_total && (
                    <InfoItem
                      icon={DollarSign}
                      label="Valor Total"
                      value={new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: contrato.moeda || "BRL",
                      }).format(contrato.valor_total)}
                      highlight
                    />
                  )}
                  {fornecedor && (
                    <InfoItem
                      icon={Building}
                      label="Fornecedor"
                      value={fornecedor.nome}
                    />
                  )}
                  {contrato.data_inicio && (
                    <InfoItem
                      icon={Calendar}
                      label="Data de Início"
                      value={new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}
                    />
                  )}
                  {contrato.data_fim && (
                    <InfoItem
                      icon={Calendar}
                      label="Data de Término"
                      value={new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                    />
                  )}
                  <InfoItem
                    icon={Info}
                    label="Versão"
                    value={`v${contrato.versao}`}
                  />
                </div>

                {contrato.descricao && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Descrição</h4>
                      <p className="text-sm leading-relaxed">{contrato.descricao}</p>
                    </div>
                  </>
                )}

                {contrato.observacoes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Observações</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{contrato.observacoes}</p>
                    </div>
                  </>
                )}
              </AnimatedCardContent>
            </AnimatedCard>
          </StaggerItem>

          {/* AI Analysis Card */}
          <AnimatePresence>
            {showAnalise && analise && (
              <StaggerItem>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AnimatedCard className="border-primary/20">
                    <AnimatedCardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="text-lg font-semibold">Análise com IA</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(analise.analisado_em).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        {analise.score_risco !== null && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Badge 
                              variant={
                                analise.score_risco >= 7 ? "destructive" : 
                                analise.score_risco >= 4 ? "outline" : 
                                "default"
                              }
                              className="text-base px-4 py-1.5"
                            >
                              Score: {Number(analise.score_risco).toFixed(1)}/10
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                    </AnimatedCardHeader>
                    <AnimatedCardContent className="space-y-6">
                      {analise.riscos_identificados?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            Riscos Identificados
                          </h4>
                          <div className="space-y-2">
                            {analise.riscos_identificados.map((risco: any, i: number) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{risco.tipo}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{risco.descricao}</p>
                                  </div>
                                  <Badge variant="destructive" className="shrink-0">
                                    {risco.gravidade}
                                  </Badge>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analise.clausulas_importantes?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Cláusulas Importantes
                          </h4>
                          <div className="space-y-2">
                            {analise.clausulas_importantes.map((clausula: any, i: number) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-lg border bg-muted/30"
                              >
                                <p className="font-medium text-sm">{clausula.titulo}</p>
                                <p className="text-sm text-muted-foreground mt-1">{clausula.descricao}</p>
                                {clausula.atencao && (
                                  <p className="text-sm text-warning mt-2 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {clausula.atencao}
                                  </p>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analise.sugestoes_melhoria?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Sugestões de Melhoria
                          </h4>
                          <ul className="space-y-2">
                            {analise.sugestoes_melhoria.map((sugestao: string, i: number) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                                <span>{sugestao}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AnimatedCardContent>
                  </AnimatedCard>
                </motion.div>
              </StaggerItem>
            )}
          </AnimatePresence>
        </StaggerContainer>

        {/* Right Column - Actions */}
        <StaggerContainer className="space-y-6">
          <StaggerItem>
            <AnimatedCard>
              <AnimatedCardHeader>
                <h3 className="text-lg font-semibold">Ações</h3>
              </AnimatedCardHeader>
              <AnimatedCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Alterar Status</Label>
                  <Select value={contrato.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="assinado">Assinado</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Documento</Label>
                  {contrato.arquivo_url ? (
                    <AnimatedButton variant="outline" className="w-full" asChild>
                      <a href={contrato.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Documento
                      </a>
                    </AnimatedButton>
                  ) : (
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                      {uploading && (
                        <p className="text-xs text-muted-foreground mt-2">Enviando...</p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Análise com IA</Label>
                  <AnimatedButton 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleAnalisarIA}
                    disabled={isAnalyzing}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {isAnalyzing ? "Analisando..." : analise ? "Reanalisar" : "Analisar Contrato"}
                  </AnimatedButton>
                  {analise && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs" 
                      onClick={() => setShowAnalise(!showAnalise)}
                    >
                      {showAnalise ? "Ocultar" : "Ver"} Análise
                    </Button>
                  )}
                </div>
              </AnimatedCardContent>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            {canApprove ? (
              <AnimatedCard>
                <AnimatedCardHeader>
                  <h3 className="text-lg font-semibold">Nova Aprovação</h3>
                </AnimatedCardHeader>
                <AnimatedCardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status</Label>
                    <Select
                      value={novaAprovacao.status}
                      onValueChange={(value) =>
                        setNovaAprovacao({ ...novaAprovacao, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Comentário</Label>
                    <Textarea
                      value={novaAprovacao.comentario}
                      onChange={(e) =>
                        setNovaAprovacao({ ...novaAprovacao, comentario: e.target.value })
                      }
                      rows={3}
                      placeholder="Adicione um comentário..."
                      className="resize-none"
                    />
                  </div>

                  <AnimatedButton onClick={handleAddAprovacao} className="w-full">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Registrar Aprovação
                  </AnimatedButton>
                </AnimatedCardContent>
              </AnimatedCard>
            ) : (
              <AnimatedCard className="border-muted">
                <AnimatedCardHeader>
                  <h3 className="text-lg font-semibold text-muted-foreground">Aprovação</h3>
                </AnimatedCardHeader>
                <AnimatedCardContent>
                  <p className="text-sm text-muted-foreground">
                    Apenas usuários com perfil de <strong>Consultoria Jurídica</strong> ou <strong>Administrador</strong> podem aprovar contratos.
                  </p>
                </AnimatedCardContent>
              </AnimatedCard>
            )}
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Tabs Section */}
      <FadeIn delay={0.3}>
        <Tabs defaultValue="aprovacoes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          </TabsList>

          <TabsContent value="aprovacoes">
            <AnimatedCard>
              <AnimatedCardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Histórico de Aprovações</h3>
                    <p className="text-sm text-muted-foreground">
                      {aprovacoes.length} aprovação(ões) registrada(s)
                    </p>
                  </div>
                </div>
              </AnimatedCardHeader>
              <AnimatedCardContent>
                {aprovacoes.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Nenhuma aprovação"
                    description="Ainda não há aprovações registradas para este contrato."
                  />
                ) : (
                  <div className="space-y-3">
                    {aprovacoes.map((aprovacao, index) => (
                      <motion.div
                        key={aprovacao.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                aprovacao.status === "aprovado"
                                  ? "default"
                                  : aprovacao.status === "rejeitado"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {aprovacao.status}
                            </Badge>
                            {aprovacao.data_aprovacao && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(aprovacao.data_aprovacao).toLocaleString("pt-BR")}
                              </span>
                            )}
                          </div>
                          {aprovacao.comentario && (
                            <p className="text-sm text-muted-foreground">
                              {aprovacao.comentario}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatedCardContent>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="assinaturas">
            <ContractSignature 
              contratoId={contrato.id} 
              contratoTitulo={contrato.titulo}
              arquivoUrl={contrato.arquivo_url}
            />
          </TabsContent>

          <TabsContent value="comentarios">
            <ContractComments contratoId={contrato.id} />
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
};

// Helper component for info items
const InfoItem = ({
  icon: Icon,
  label,
  value,
  capitalize = false,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
  highlight?: boolean;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <p className={`font-medium ${capitalize ? "capitalize" : ""} ${highlight ? "text-primary text-lg" : ""}`}>
      {value}
    </p>
  </div>
);

export default ContratoDetalhes;
