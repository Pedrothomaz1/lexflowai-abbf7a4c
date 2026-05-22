import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileSignature, 
  Send, 
  Clock, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Download,
  Plus,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { handleDbError } from "@/utils/dbErrorHandler";

type Signature = {
  id: string;
  provider: string;
  external_id: string;
  signers: any[];
  status: string;
  document_url: string | null;
  signed_document_url: string | null;
  sent_at: string | null;
  completed_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
};

type Signer = {
  name: string;
  email: string;
  role?: string;
};

interface ContractSignatureProps {
  contratoId: string;
  contratoTitulo: string;
  arquivoUrl: string | null;
}

export function ContractSignature({ contratoId, contratoTitulo, arquivoUrl }: ContractSignatureProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'zapsign',
    webhookUrl: '',
  });

  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '', role: 'Signatário' }
  ]);

  useEffect(() => {
    fetchSignatures();
    setupRealtimeSubscription();
  }, [contratoId]);

  const fetchSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSignatures(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar assinaturas:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar assinaturas",
        description: handleDbError(error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('contract-signatures')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_signatures',
          filter: `contrato_id=eq.${contratoId}`,
        },
        () => {
          fetchSignatures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '', role: 'Signatário' }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length === 1) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Deve haver pelo menos um signatário",
      });
      return;
    }
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = { ...newSigners[index], [field]: value };
    setSigners(newSigners);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivoUrl) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O contrato precisa ter um documento anexado",
      });
      return;
    }

    if (signers.some(s => !s.name || !s.email)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos dos signatários",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
      });
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // ZapSign: despacha via edge function (cria documento + signers no provedor)
      if (formData.provider === 'zapsign') {
        const { data, error } = await supabase.functions.invoke('enviar-zapsign', {
          body: {
            contrato_id: contratoId,
            signers,
            document_url: arquivoUrl,
          },
        });
        if (error) throw error;
        if (!data?.ok) {
          throw new Error(data?.error || 'Falha ao enviar para ZapSign');
        }
        toast({
          title: "Enviado ao ZapSign",
          description: "Os signatários receberão o documento por email.",
        });
        setDialogOpen(false);
        resetForm();
        fetchSignatures();
        return;
      }

      // Demais provedores: registra placeholder local; webhook atualiza external_id/status
      const { error } = await supabase
        .from("contract_signatures")
        .insert([{
          organization_id: organization.id,
          contrato_id: contratoId,
          provider: formData.provider,
          external_id: `temp-${Date.now()}`,
          signers: signers,
          status: 'pending',
          document_url: arquivoUrl,
          sent_at: new Date().toISOString(),
          created_by: user.id,
          metadata: {
            webhook_url: formData.webhookUrl,
            contract_title: contratoTitulo,
          }
        }])
        .select()
        .single();

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para criar assinatura. Verifique seu acesso.");
        }
        throw error;
      }

      toast({
        title: "Solicitação criada!",
        description: "Agora envie o documento para o serviço de assinatura e configure o webhook.",
      });

      setDialogOpen(false);
      resetForm();
      fetchSignatures();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar solicitação",
        description: handleDbError(error).message,
      });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'custom',
      webhookUrl: '',
    });
    setSigners([{ name: '', email: '', role: 'Signatário' }]);
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      sent: Send,
      viewed: Eye,
      signed: FileSignature,
      completed: CheckCircle,
      declined: XCircle,
      expired: AlertCircle,
      cancelled: XCircle,
    };
    return icons[status] || Clock;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      sent: { label: 'Enviado', variant: 'default' },
      viewed: { label: 'Visualizado', variant: 'default' },
      signed: { label: 'Assinado', variant: 'default' },
      completed: { label: 'Completo', variant: 'outline' },
      declined: { label: 'Recusado', variant: 'destructive' },
      expired: { label: 'Expirado', variant: 'secondary' },
      cancelled: { label: 'Cancelado', variant: 'secondary' },
    };
    return variants[status] || variants.pending;
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      zapsign: 'ZapSign',
      docusign: 'DocuSign',
      clicksign: 'Clicksign',
      d4sign: 'D4Sign',
      custom: 'Personalizado',
    };
    return labels[provider] || provider;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando assinaturas...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Assinatura Eletrônica
              </CardTitle>
              <CardDescription>
                Gerenciar solicitações de assinatura digital
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Assinatura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Enviar para Assinatura</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provedor de Assinatura</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData({ ...formData, provider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          <SelectItem value="zapsign">ZapSign</SelectItem>
                          <SelectItem value="docusign">DocuSign</SelectItem>
                          <SelectItem value="clicksign">Clicksign</SelectItem>
                          <SelectItem value="d4sign">D4Sign</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook">URL do Webhook (Opcional)</Label>
                      <Input
                        id="webhook"
                        value={formData.webhookUrl}
                        onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                        placeholder="https://seu-site.com/webhook"
                      />
                      <p className="text-xs text-muted-foreground">
                        Configure o webhook no seu provedor para: <br />
                        <code className="text-xs">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/signature-webhook</code>
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Signatários</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addSigner}>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      {signers.map((signer, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium">Signatário {index + 1}</p>
                              {signers.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSigner(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                  value={signer.name}
                                  onChange={(e) => updateSigner(index, 'name', e.target.value)}
                                  placeholder="Nome completo"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  value={signer.email}
                                  onChange={(e) => updateSigner(index, 'email', e.target.value)}
                                  placeholder="email@exemplo.com"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Função</Label>
                              <Input
                                value={signer.role}
                                onChange={(e) => updateSigner(index, 'role', e.target.value)}
                                placeholder="Ex: Diretor, Testemunha"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                      {sending ? "Enviando..." : "Criar Solicitação"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação de assinatura ainda
            </div>
          ) : (
            <div className="space-y-4">
              {signatures.map((signature) => {
                const StatusIcon = getStatusIcon(signature.status);
                const statusBadge = getStatusBadge(signature.status);

                return (
                  <Card key={signature.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getProviderLabel(signature.provider)}
                            </Badge>
                            <Badge variant={statusBadge.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {signature.sent_at
                              ? `Enviado ${formatDistanceToNow(new Date(signature.sent_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}`
                              : 'Não enviado'}
                          </p>
                        </div>
                        {signature.signed_document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(signature.signed_document_url!, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar Assinado
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Signatários:</p>
                        <div className="flex flex-wrap gap-2">
                          {signature.signers.map((signer: any, i: number) => (
                            <Badge key={i} variant="secondary">
                              {signer.name} ({signer.email})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
