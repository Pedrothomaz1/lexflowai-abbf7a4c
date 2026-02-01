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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { 
  Shield, 
  FileSearch, 
  Trash2, 
  Download, 
  AlertTriangle,
  Clock,
  Plus,
  Eye,
  EyeOff,
  UserX,
  Database,
  Lock,
  History,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComplianceLog {
  id: string;
  tipo_evento: string;
  entidade: string;
  entidade_id: string | null;
  dados_afetados: Record<string, any> | null;
  justificativa: string | null;
  base_legal: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

interface RetentionPolicy {
  id: string;
  nome: string;
  entidade: string;
  periodo_retencao_meses: number;
  acao_pos_retencao: string;
  base_legal: string | null;
  descricao: string | null;
  is_active: boolean;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
}

const EVENT_TYPES = {
  acesso_dados: { label: "Acesso a Dados", icon: Eye, color: "bg-blue-500/10 text-blue-500" },
  exportacao: { label: "Exportação", icon: Download, color: "bg-green-500/10 text-green-500" },
  anonimizacao: { label: "Anonimização", icon: EyeOff, color: "bg-purple-500/10 text-purple-500" },
  exclusao: { label: "Exclusão", icon: Trash2, color: "bg-destructive/10 text-destructive" },
  consentimento: { label: "Consentimento", icon: CheckCircle2, color: "bg-amber-500/10 text-amber-500" },
};

const BASE_LEGAL_OPTIONS = [
  { value: "consentimento", label: "Consentimento do Titular" },
  { value: "contrato", label: "Execução de Contrato" },
  { value: "obrigacao_legal", label: "Obrigação Legal" },
  { value: "interesse_legitimo", label: "Interesse Legítimo" },
  { value: "protecao_credito", label: "Proteção ao Crédito" },
];

const ENTITIES = [
  { value: "contratos", label: "Contratos" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "profiles", label: "Usuários" },
  { value: "contract_attachments", label: "Anexos" },
];

export default function ComplianceLGPD() {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [isErasureDialogOpen, setIsErasureDialogOpen] = useState(false);
  const [erasureLoading, setErasureLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAcessos: 0,
    exportacoes30Dias: 0,
    anonimizacoes: 0,
    exclusoes: 0,
  });

  // New policy form
  const [newPolicy, setNewPolicy] = useState({
    nome: "",
    entidade: "contratos",
    periodo_retencao_meses: 60,
    acao_pos_retencao: "anonimizar",
    base_legal: "obrigacao_legal",
    descricao: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsResult, policiesResult] = await Promise.all([
        supabase
          .from("compliance_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("data_retention_policies")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (logsResult.error) throw logsResult.error;
      if (policiesResult.error) throw policiesResult.error;

      const logsData = (logsResult.data || []) as ComplianceLog[];
      setLogs(logsData);
      setPolicies((policiesResult.data || []) as RetentionPolicy[]);

      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      setStats({
        totalAcessos: logsData.filter(l => l.tipo_evento === "acesso_dados").length,
        exportacoes30Dias: logsData.filter(
          l => l.tipo_evento === "exportacao" && new Date(l.created_at) > thirtyDaysAgo
        ).length,
        anonimizacoes: logsData.filter(l => l.tipo_evento === "anonimizacao").length,
        exclusoes: logsData.filter(l => l.tipo_evento === "exclusao").length,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
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

      const { error } = await supabase
        .from("data_retention_policies")
        .insert({
          ...newPolicy,
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
        title: "Política criada",
        description: "A política de retenção foi criada com sucesso.",
      });

      setIsCreatingPolicy(false);
      setNewPolicy({
        nome: "",
        entidade: "contratos",
        periodo_retencao_meses: 60,
        acao_pos_retencao: "anonimizar",
        base_legal: "obrigacao_legal",
        descricao: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar política",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTogglePolicy = async (policy: RetentionPolicy) => {
    try {
      const { error } = await supabase
        .from("data_retention_policies")
        .update({ is_active: !policy.is_active })
        .eq("id", policy.id);

      if (error) throw error;

      toast({
        title: policy.is_active ? "Política desativada" : "Política ativada",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar política",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportComplianceReport = () => {
    const reportData = {
      gerado_em: new Date().toISOString(),
      total_logs: logs.length,
      estatisticas: stats,
      politicas_ativas: policies.filter(p => p.is_active).length,
      ultimos_eventos: logs.slice(0, 20),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-compliance-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Relatório exportado",
      description: "O relatório de compliance foi exportado com sucesso.",
    });
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Compliance LGPD/GDPR"
        description="Gestão de privacidade e proteção de dados"
        actions={
          <Button onClick={handleExportComplianceReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        }
      />

      {/* Alert */}
      <Alert className="border-amber-500/50 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">Conformidade LGPD</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Este painel monitora todas as operações relacionadas a dados pessoais para garantir conformidade com a Lei Geral de Proteção de Dados (LGPD) e GDPR.
        </AlertDescription>
      </Alert>

      {/* KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Acessos a Dados"
          value={stats.totalAcessos}
          icon={Eye}
          variant="primary"
        />
        <StatCard
          title="Exportações (30 dias)"
          value={stats.exportacoes30Dias}
          icon={Download}
          variant="success"
        />
        <StatCard
          title="Anonimizações"
          value={stats.anonimizacoes}
          icon={EyeOff}
          variant="warning"
        />
        <StatCard
          title="Exclusões"
          value={stats.exclusoes}
          icon={Trash2}
          variant="destructive"
        />
      </StatCardGrid>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Logs de Compliance
          </TabsTrigger>
          <TabsTrigger value="retencao">
            <Clock className="h-4 w-4 mr-2" />
            Políticas de Retenção
          </TabsTrigger>
          <TabsTrigger value="direitos">
            <UserX className="h-4 w-4 mr-2" />
            Direitos do Titular
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {logs.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="Nenhum log registrado"
              description="Os eventos de compliance aparecerão aqui"
            />
          ) : (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-base">Histórico de Eventos</CardTitle>
                <CardDescription>Últimos 100 eventos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map(log => {
                    const eventConfig = EVENT_TYPES[log.tipo_evento as keyof typeof EVENT_TYPES] || {
                      label: log.tipo_evento,
                      icon: FileSearch,
                      color: "bg-muted text-muted-foreground",
                    };
                    const Icon = eventConfig.icon;

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${eventConfig.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{eventConfig.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.entidade}
                            </Badge>
                            {log.base_legal && (
                              <Badge variant="secondary" className="text-xs">
                                {BASE_LEGAL_OPTIONS.find(b => b.value === log.base_legal)?.label || log.base_legal}
                              </Badge>
                            )}
                          </div>
                          {log.justificativa && (
                            <p className="text-xs text-muted-foreground truncate">{log.justificativa}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                            {log.ip_address && <span>IP: {log.ip_address}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="retencao" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreatingPolicy} onOpenChange={setIsCreatingPolicy}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Política
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Política de Retenção</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da Política</Label>
                    <Input
                      value={newPolicy.nome}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Retenção de Contratos"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Entidade</Label>
                      <Select
                        value={newPolicy.entidade}
                        onValueChange={(value) => setNewPolicy(prev => ({ ...prev, entidade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITIES.map(e => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Período (meses)</Label>
                      <Input
                        type="number"
                        value={newPolicy.periodo_retencao_meses}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, periodo_retencao_meses: parseInt(e.target.value) || 60 }))}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ação Pós-Retenção</Label>
                      <Select
                        value={newPolicy.acao_pos_retencao}
                        onValueChange={(value) => setNewPolicy(prev => ({ ...prev, acao_pos_retencao: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anonimizar">Anonimizar</SelectItem>
                          <SelectItem value="excluir">Excluir</SelectItem>
                          <SelectItem value="arquivar">Arquivar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Base Legal</Label>
                      <Select
                        value={newPolicy.base_legal}
                        onValueChange={(value) => setNewPolicy(prev => ({ ...prev, base_legal: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BASE_LEGAL_OPTIONS.map(b => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={newPolicy.descricao}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Justificativa da política"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingPolicy(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePolicy} disabled={!newPolicy.nome}>
                    Criar Política
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {policies.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Nenhuma política configurada"
              description="Configure políticas de retenção de dados"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {policies.map(policy => (
                <Card key={policy.id} className="card-elevated">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{policy.nome}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {ENTITIES.find(e => e.value === policy.entidade)?.label || policy.entidade}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={() => handleTogglePolicy(policy)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Período:</span>
                        <span>{policy.periodo_retencao_meses} meses</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ação:</span>
                        <Badge variant="outline" className="capitalize">
                          {policy.acao_pos_retencao}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Legal:</span>
                        <span className="text-xs">
                          {BASE_LEGAL_OPTIONS.find(b => b.value === policy.base_legal)?.label || "-"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="direitos" className="space-y-4">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Direitos dos Titulares de Dados</AlertTitle>
            <AlertDescription>
              Gerencie solicitações de acesso, portabilidade e exclusão de dados pessoais conforme LGPD.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card 
              className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Não autenticado");
                  
                  const { data, error } = await supabase.functions.invoke('gdpr-handler', {
                    body: { action: 'access' }
                  });
                  
                  if (error) throw error;
                  
                  toast({
                    title: "Dados Acessados",
                    description: `Contratos: ${data.data?.contratos_criados || 0}, Registros de auditoria: ${data.data?.registros_auditoria || 0}`,
                  });
                } catch (error: any) {
                  toast({
                    title: "Erro",
                    description: error.message,
                    variant: "destructive"
                  });
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Direito de Acesso</h3>
                    <p className="text-xs text-muted-foreground">Solicitar cópia dos dados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="card-elevated cursor-pointer hover:border-primary/50 transition-colors"
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Não autenticado");
                  
                  const { data, error } = await supabase.functions.invoke('gdpr-handler', {
                    body: { action: 'export' }
                  });
                  
                  if (error) throw error;
                  
                  // Download the exported data
                  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `meus-dados-${format(new Date(), 'yyyy-MM-dd')}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  toast({
                    title: "Dados Exportados",
                    description: "Seus dados foram exportados com sucesso.",
                  });
                } catch (error: any) {
                  toast({
                    title: "Erro",
                    description: error.message,
                    variant: "destructive"
                  });
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Download className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Portabilidade</h3>
                    <p className="text-xs text-muted-foreground">Exportar dados em formato aberto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isErasureDialogOpen} onOpenChange={setIsErasureDialogOpen}>
              <DialogTrigger asChild>
                <Card className="card-elevated cursor-pointer hover:border-destructive/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-destructive/10">
                        <Trash2 className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-medium">Direito de Exclusão</h3>
                        <p className="text-xs text-muted-foreground">Solicitar remoção de dados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Solicitar Exclusão de Dados
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção: Ação Irreversível</AlertTitle>
                    <AlertDescription>
                      Conforme LGPD Art. 18, ao solicitar a exclusão seus dados pessoais serão anonimizados.
                      Esta ação não pode ser desfeita.
                    </AlertDescription>
                  </Alert>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Dados que serão anonimizados:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Nome completo</li>
                      <li>E-mail</li>
                      <li>Telefone</li>
                      <li>Foto de perfil</li>
                    </ul>
                    <p className="mt-2"><strong>Dados mantidos para compliance:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Registros de auditoria (marcados como anonimizados)</li>
                      <li>Contratos (por obrigação legal)</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsErasureDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    disabled={erasureLoading}
                    onClick={async () => {
                      setErasureLoading(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error("Não autenticado");
                        
                        const { data, error } = await supabase.functions.invoke('gdpr-handler', {
                          body: { action: 'erasure' }
                        });
                        
                        if (error) throw error;
                        
                        toast({
                          title: "Dados Anonimizados",
                          description: "Seus dados foram anonimizados conforme LGPD Art. 18.",
                        });
                        
                        setIsErasureDialogOpen(false);
                        fetchData();
                      } catch (error: any) {
                        toast({
                          title: "Erro",
                          description: error.message,
                          variant: "destructive"
                        });
                      } finally {
                        setErasureLoading(false);
                      }
                    }}
                  >
                    {erasureLoading ? "Processando..." : "Confirmar Exclusão"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <EyeOff className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Anonimização</h3>
                    <p className="text-xs text-muted-foreground">Remover identificação pessoal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Consentimento</h3>
                    <p className="text-xs text-muted-foreground">Gerenciar autorizações</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <FileSearch className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Correção de Dados</h3>
                    <p className="text-xs text-muted-foreground">Atualizar informações incorretas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
