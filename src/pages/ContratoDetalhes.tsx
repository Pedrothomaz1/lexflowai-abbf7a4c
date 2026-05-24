import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileText,
  Building,
  CheckCircle2,
  Download,
  Brain,
  Info,
  Tag,
  Hash,
  Paperclip,
  History,
  Edit3,
  ScrollText,
} from "lucide-react";
import { exportContratoDetalhePDF } from "@/utils/pdfExport";
import { exportContratoExecutivoPDF } from "@/utils/pdfExecutiveReport";
import { ContractComments } from "@/components/ContractComments";
import { ContractSignature } from "@/components/ContractSignature";
import { ZapsignPanel } from "@/components/Assinaturas/ZapsignPanel";
import { PacoteFinalCard } from "@/components/Assinaturas/PacoteFinalCard";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ContractKPIs,
  ContractQuickActions,
  ContractTimeline,
  ContractSupplierCard,
  ContractAttachments,
  ContractObligations,
  NegotiationMetrics,
} from "@/components/ContractDetails";
import { ContractRevisionsTab } from "@/components/contracts/ContractRevisionsTab";
import { ContractInfoCard } from "@/components/ContractDetails/ContractInfoCard";
import { ContractAIAnalysis } from "@/components/ContractDetails/ContractAIAnalysis";
import { ContractApprovalCard } from "@/components/ContractDetails/ContractApprovalCard";
import { FinanceNotificationModal } from "@/components/FinanceNotificationModal";
import { PreSignatureGuard } from "@/components/Aprovacoes/PreSignatureGuard";
import { NegotiationThread } from "@/components/Negociacao/NegotiationThread";
import { AssistenteIA } from "@/components/IA/AssistenteIA";
import { RevisaoExtracoesPanel } from "@/components/IA/RevisaoExtracoesPanel";
import { PortalContraparteDialog } from "@/components/Portal/PortalContraparteDialog";
import { PortalLinksPanel } from "@/components/Portal/PortalLinksPanel";
import { IntakeGatesPanel } from "@/components/contracts/IntakeGatesPanel";
import { BlocoFinanceiroPanel } from "@/components/contracts/BlocoFinanceiroPanel";
import { ComplianceChecklistPanel } from "@/components/contracts/ComplianceChecklistPanel";
import { LegalReviewPanel } from "@/components/contracts/LegalReviewPanel";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { handleDbError } from "@/utils/dbErrorHandler";

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
  tags: string[] | null;
  created_at: string;
  updated_at: string;
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
  const { logView, logApprove, logExport, logAnalyze } = useAuditLog();
  const { organization } = useOrganization();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [mainDocument, setMainDocument] = useState<{ file_path: string; file_name: string } | null>(null);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [novaAprovacao, setNovaAprovacao] = useState({
    status: "aprovado",
    comentario: "",
  });
  const [analise, setAnalise] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalise, setShowAnalise] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userAlreadyApproved, setUserAlreadyApproved] = useState(false);

  useEffect(() => {
    // Reset analysis state when switching contracts
    setAnalise(null);
    setShowAnalise(false);

    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      if (id) {
        fetchContrato();
        fetchAprovacoes();
        fetchAnalise();
      }
    };
    initData();
  }, [id]);

  // Verificar se usuário atual já aprovou
  useEffect(() => {
    if (currentUserId && aprovacoes.length > 0) {
      const alreadyApproved = aprovacoes.some(a => a.aprovador_id === currentUserId);
      setUserAlreadyApproved(alreadyApproved);
    } else {
      setUserAlreadyApproved(false);
    }
  }, [currentUserId, aprovacoes]);

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
          description: handleDbError(error).message,
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
    } catch (error: any) {
      console.error("Erro ao buscar contrato:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: handleDbError(error).message,
      });
    } finally {
      setLoading(false);
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

  const handleAnalisarIA = async (skill: "auto" | "full" | "contract-review" | "nda-triage" | "risk-assessment" | "compliance" = "auto") => {
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
        body: { contratoId: contrato.id, conteudo, skill },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Análise concluída",
          description: `Skill aplicada: ${data.skill ?? skill}`,
        });
        setAnalise(data.analise);
        setShowAnalise(true);
      } else {
        throw new Error(data.error || "Erro na análise");
      }
    } catch (error: any) {
      toast({
        title: "Erro na análise",
        description: handleDbError(error).message,
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    // Get organization for storage RLS isolation
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const fileExt = file.name.split(".").pop();
    // Use organization.id as first folder for RLS isolation
    const filePath = orgMember?.organization_id
      ? `${orgMember.organization_id}/${user.id}/${contrato.id}-${Date.now()}.${fileExt}`
      : `${user.id}/${contrato.id}-${Date.now()}.${fileExt}`;

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
      const { error: updateError } = await supabase
        .from("contratos")
        .update({ arquivo_url: filePath })
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

    // Verificar se o usuário já aprovou este contrato
    const existingApproval = aprovacoes.find(a => a.aprovador_id === user.id);
    if (existingApproval) {
      toast({
        variant: "destructive",
        title: "Aprovação já registrada",
        description: "Você já registrou uma aprovação para este contrato.",
      });
      return;
    }

    const { error } = await supabase.from("contract_approvals").insert([
      {
        contrato_id: contrato.id,
        aprovador_id: user.id,
        status: novaAprovacao.status,
        comentario: novaAprovacao.comentario,
        data_aprovacao: new Date().toISOString(),
        organization_id: organization?.id,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar aprovação",
        description: handleDbError(error).message,
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
        // Abrir modal de notificação ao financeiro
        setShowFinanceModal(true);
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
        description: handleDbError(error).message,
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
      exportContratoDetalhePDF(contrato, null, aprovacoes);
    }
  };

  const handleExportExecutivoPDF = async () => {
    if (!contrato) return;
    try {
      toast({ title: "Gerando relatório executivo…" });
      await exportContratoExecutivoPDF({ contrato, aprovacoes });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: err?.message ?? "Tente novamente.",
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      prestacao_servicos: 'Prestação de Serviços',
      fornecimento: 'Fornecimento',
      locacao: 'Locação',
      confidencialidade: 'Confidencialidade',
      parceria: 'Parceria',
      outro: 'Outro',
    };
    return labels[tipo] || tipo;
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <AnimatedButton variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-4 w-4" />
          </AnimatedButton>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{contrato.titulo}</h1>
              <StatusBadge status={contrato.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {contrato.numero_contrato}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {getTipoLabel(contrato.tipo)}
              </span>
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                v{contrato.versao}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedButton variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </AnimatedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Exportar PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Resumo simples
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExecutivoPDF}>
                  <ScrollText className="h-4 w-4 mr-2" />
                  Relatório executivo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ContractQuickActions
              contratoId={contrato.id}
              contratoNumero={contrato.numero_contrato}
              contratoTitulo={contrato.titulo}
              status={contrato.status}
              arquivoUrl={contrato.arquivo_url}
              onRefresh={fetchContrato}
            />
          </div>
        </div>
      </FadeIn>

      {/* KPIs */}
      <FadeIn delay={0.1}>
        <ContractKPIs
          dataInicio={contrato.data_inicio}
          dataFim={contrato.data_fim}
          status={contrato.status}
          valorTotal={contrato.valor_total}
        />
      </FadeIn>

      {/* Timeline */}
      <FadeIn delay={0.15}>
        <AnimatedCard hoverScale={1}>
          <AnimatedCardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Ciclo de Vida do Contrato</h3>
          </AnimatedCardHeader>
          <AnimatedCardContent>
            <ContractTimeline
              status={contrato.status}
              createdAt={contrato.created_at}
              dataInicio={contrato.data_inicio}
              dataFim={contrato.data_fim}
              dataAssinatura={contrato.data_assinatura}
            />
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contract Info */}
        <StaggerContainer className="lg:col-span-2 space-y-6">
          {/* Contract Details */}
          <StaggerItem>
            <ContractInfoCard contrato={contrato} />
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
                  <ContractAIAnalysis analise={analise} />
                </motion.div>
              </StaggerItem>
            )}
          </AnimatePresence>

          {/* Obligations Section */}
          <StaggerItem>
            <ContractObligations contratoId={contrato.id} />
          </StaggerItem>
        </StaggerContainer>

        {/* Right Column - Sidebar */}
        <StaggerContainer className="space-y-6">
          {/* Actions Card */}
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
                  <Label className="text-muted-foreground">Documento Principal</Label>
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
                  <Label className="text-muted-foreground">Análise com IA (skills jurídicas)</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedButton variant="outline" className="w-full" disabled={isAnalyzing}>
                        <Brain className="h-4 w-4 mr-2" />
                        {isAnalyzing ? "Analisando..." : analise ? "Reanalisar contrato" : "Analisar contrato"}
                      </AnimatedButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 z-50 bg-popover">
                      <DropdownMenuLabel>Escolha a skill</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleAnalisarIA("full")}>
                        <ScrollText className="h-4 w-4 mr-2" />
                        Análise completa (recomendado)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAnalisarIA("contract-review")}>
                        Revisão cláusula a cláusula
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAnalisarIA("nda-triage")}>
                        Triagem de NDA
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAnalisarIA("risk-assessment")}>
                        Mapa de riscos jurídicos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAnalisarIA("compliance")}>
                        Compliance (LGPD, anticorrupção…)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {analise && (
                    <Button
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => setShowAnalise(!showAnalise)}
                    >
                      {showAnalise ? "Ocultar" : "Ver"} análise
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/contratos/${id}/workflow`)}
                  >
                    Workflow Kanban
                  </Button>
                </div>
              </AnimatedCardContent>
            </AnimatedCard>
          </StaggerItem>




          {/* Supplier Card */}
          <StaggerItem>
            <AnimatedCard>
              <AnimatedCardHeader>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Fornecedor</h3>
                </div>
              </AnimatedCardHeader>
              <AnimatedCardContent>
                <ContractSupplierCard fornecedorId={contrato.fornecedor_id} />
              </AnimatedCardContent>
            </AnimatedCard>
          </StaggerItem>

          {/* Attachments Card */}
          <StaggerItem>
            <AnimatedCard>
              <AnimatedCardHeader>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Anexos</h3>
                </div>
              </AnimatedCardHeader>
              <AnimatedCardContent>
                <ContractAttachments contratoId={contrato.id} />
              </AnimatedCardContent>
            </AnimatedCard>
          </StaggerItem>

          {/* Approval Card */}
          <StaggerItem>
            <ContractApprovalCard
              canApprove={canApprove}
              userAlreadyApproved={userAlreadyApproved}
              novaAprovacao={novaAprovacao}
              onNovaAprovacaoChange={setNovaAprovacao}
              onAddAprovacao={handleAddAprovacao}
            />
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Tabs Section */}
      <FadeIn delay={0.3}>
        <Tabs defaultValue="intake" className="space-y-4">
          <TabsList className="flex w-full flex-wrap h-auto">
            <TabsTrigger value="intake">Intake</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="revisao-legal">Revisão Legal</TabsTrigger>
            <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="revisoes">Revisões</TabsTrigger>
            <TabsTrigger value="negociacao">Negociação</TabsTrigger>
            <TabsTrigger value="revisao-ia">Revisão IA</TabsTrigger>
            <TabsTrigger value="ia">Assistente IA</TabsTrigger>
          </TabsList>

          <TabsContent value="intake">
            <IntakeGatesPanel
              contratoId={contrato.id}
              intakeStatus={(contrato as unknown as { intake_status?: string | null }).intake_status ?? null}
              onChanged={fetchContrato}
            />
          </TabsContent>

          <TabsContent value="financeiro">
            <BlocoFinanceiroPanel
              contratoId={contrato.id}
              intakeStatus={(contrato as unknown as { intake_status?: string | null }).intake_status ?? null}
              contratoStatus={contrato.status}
              emailFinanceiroNotificadoEm={(contrato as unknown as { email_financeiro_notificado_em?: string | null }).email_financeiro_notificado_em ?? null}
              onSaved={fetchContrato}
            />
          </TabsContent>


          <TabsContent value="compliance">
            <ComplianceChecklistPanel contratoId={contrato.id} onChanged={fetchContrato} />
          </TabsContent>

          <TabsContent value="revisao-legal">
            <LegalReviewPanel
              contratoId={contrato.id}
              nivelRisco={(contrato as unknown as { nivel_risco?: string | null }).nivel_risco ?? null}
              onChanged={fetchContrato}
            />
          </TabsContent>


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

          <TabsContent value="assinaturas" className="space-y-4">
            <PacoteFinalCard
              pacoteFinalUrl={(contrato as any).pacote_final_url ?? null}
              pacoteFinalHash={(contrato as any).pacote_final_hash ?? null}
              congeladoEm={(contrato as any).pacote_final_congelado_at ?? null}
            />
            <PreSignatureGuard contratoId={contrato.id}>
              <ZapsignPanel contratoId={contrato.id} arquivoUrl={contrato.arquivo_url} />
            </PreSignatureGuard>
          </TabsContent>


          <TabsContent value="comentarios">
            <ContractComments contratoId={contrato.id} />
          </TabsContent>

          <TabsContent value="revisoes">
            <AnimatedCard>
              <AnimatedCardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Revisões</h3>
                    <p className="text-sm text-muted-foreground">
                      Histórico de versões, devoluções de workflow e redlining em uma visão única.
                    </p>
                  </div>
                </div>
              </AnimatedCardHeader>
              <AnimatedCardContent>
                <ContractRevisionsTab
                  contratoId={contrato.id}
                  currentVersion={contrato.versao}
                  conteudoOriginal={contrato.descricao}
                  onVersionRestored={fetchContrato}
                />
              </AnimatedCardContent>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="negociacao" className="space-y-4">
            <div className="flex justify-end">
              <PortalContraparteDialog contratoId={contrato.id} />
            </div>
            <PortalLinksPanel contratoId={contrato.id} />
            <NegotiationThread contratoId={contrato.id} />
            <NegotiationMetrics contratoId={contrato.id} />
          </TabsContent>

          <TabsContent value="revisao-ia" className="space-y-4">
            <RevisaoExtracoesPanel contratoId={contrato.id} />
          </TabsContent>

          <TabsContent value="ia" className="space-y-4">
            <AssistenteIA
              contratoId={contrato.id}
              tipoContrato={contrato.tipo}
              contratoConteudo={[
                `Contrato: ${contrato.numero_contrato}`,
                `Título: ${contrato.titulo}`,
                `Tipo: ${contrato.tipo}`,
                `Valor: ${contrato.valor_total ?? "N/A"}`,
                `Descrição: ${contrato.descricao || ""}`,
                `Observações: ${contrato.observacoes || ""}`,
              ].join("\n")}
            />
          </TabsContent>
        </Tabs>
      </FadeIn>

      {/* Finance Notification Modal */}
      <FinanceNotificationModal
        isOpen={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        contratoId={contrato.id}
        tipo="contrato"
      />
    </div>
  );
};

export default ContratoDetalhes;
