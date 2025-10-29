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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
import { exportContratoDetalhePDF } from "@/utils/pdfExport";

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

      // Atualizar status do contrato se aprovado
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      rascunho: { variant: "secondary", icon: Clock },
      em_aprovacao: { variant: "outline", icon: Clock },
      aprovado: { variant: "default", icon: CheckCircle2 },
      assinado: { variant: "default", icon: CheckCircle2 },
      vigente: { variant: "default", icon: CheckCircle2 },
      encerrado: { variant: "outline", icon: CheckCircle2 },
      cancelado: { variant: "destructive", icon: XCircle },
    };

    const { variant, icon: Icon } = config[status] || config.rascunho;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const handleExportPDF = () => {
    if (contrato) {
      exportContratoDetalhePDF(contrato, fornecedor, aprovacoes);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">Contrato não encontrado</div>
          <Button onClick={() => navigate("/contratos")}>
            Voltar para Contratos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{contrato.titulo}</h1>
          <p className="text-muted-foreground mt-1">
            Contrato Nº {contrato.numero_contrato}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          {getStatusBadge(contrato.status)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Tipo</span>
                </div>
                <p className="font-medium capitalize">
                  {contrato.tipo.replace("_", " ")}
                </p>
              </div>

              {contrato.valor_total && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Valor Total</span>
                  </div>
                  <p className="font-medium">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: contrato.moeda || "BRL",
                    }).format(contrato.valor_total)}
                  </p>
                </div>
              )}

              {fornecedor && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>Fornecedor</span>
                  </div>
                  <p className="font-medium">{fornecedor.nome}</p>
                </div>
              )}

              {contrato.data_inicio && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Início</span>
                  </div>
                  <p className="font-medium">
                    {new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              {contrato.data_fim && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Término</span>
                  </div>
                  <p className="font-medium">
                    {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>

            {contrato.descricao && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium">Descrição</h3>
                  <p className="text-sm text-muted-foreground">{contrato.descricao}</p>
                </div>
              </>
            )}

            {contrato.observacoes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium">Observações</h3>
                  <p className="text-sm text-muted-foreground">{contrato.observacoes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Alterar Status</Label>
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
                <Label>Documento do Contrato</Label>
                {contrato.arquivo_url ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Documento anexado</p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={contrato.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Documento
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <p className="text-sm text-muted-foreground mt-2">Enviando...</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Análise com IA</Label>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleAnalisarIA}
                  disabled={isAnalyzing}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isAnalyzing ? "Analisando..." : analise ? "Reanalisar Contrato" : "Analisar Contrato"}
                </Button>
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
            </CardContent>
          </Card>

          {canApprove ? (
            <Card>
              <CardHeader>
                <CardTitle>Nova Aprovação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Status</Label>
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
                  <Label>Comentário</Label>
                  <Textarea
                    value={novaAprovacao.comentario}
                    onChange={(e) =>
                      setNovaAprovacao({ ...novaAprovacao, comentario: e.target.value })
                    }
                    rows={3}
                    placeholder="Adicione um comentário..."
                  />
                </div>

                <Button onClick={handleAddAprovacao} className="w-full">
                  Registrar Aprovação
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-muted-foreground">Aprovação de Contratos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Apenas usuários com perfil de <strong>Consultoria Jurídica</strong> ou <strong>Administrador</strong> podem aprovar contratos.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showAnalise && analise && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Análise com Inteligência Artificial
                </CardTitle>
                <CardDescription>
                  Análise realizada em {new Date(analise.analisado_em).toLocaleString("pt-BR")}
                </CardDescription>
              </div>
              {analise.score_risco !== null && (
                <Badge 
                  variant={
                    analise.score_risco >= 7 ? "destructive" : 
                    analise.score_risco >= 4 ? "outline" : 
                    "default"
                  }
                  className="text-lg px-4 py-2"
                >
                  Score: {Number(analise.score_risco).toFixed(1)}/10
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analise.riscos_identificados && analise.riscos_identificados.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Riscos Identificados
                </h3>
                <div className="space-y-2">
                  {analise.riscos_identificados.map((risco: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-destructive/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{risco.tipo}</p>
                          <p className="text-sm text-muted-foreground mt-1">{risco.descricao}</p>
                        </div>
                        <Badge variant="destructive" className="shrink-0">
                          {risco.gravidade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analise.clausulas_importantes && analise.clausulas_importantes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cláusulas Importantes
                </h3>
                <div className="space-y-2">
                  {analise.clausulas_importantes.map((clausula: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{clausula.titulo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{clausula.descricao}</p>
                      {clausula.atencao && (
                        <p className="text-sm text-amber-600 mt-2">⚠️ {clausula.atencao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analise.sugestoes_melhoria && analise.sugestoes_melhoria.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Sugestões de Melhoria
                </h3>
                <ul className="space-y-2">
                  {analise.sugestoes_melhoria.map((sugestao: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{sugestao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aprovações</CardTitle>
          <CardDescription>
            {aprovacoes.length} aprovação(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aprovacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma aprovação registrada ainda
            </div>
          ) : (
            <div className="space-y-4">
              {aprovacoes.map((aprovacao) => (
                <div
                  key={aprovacao.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
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
                        <span className="text-sm text-muted-foreground">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContratoDetalhes;
