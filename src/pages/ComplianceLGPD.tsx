import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  Download,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  History,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { ComplianceLogsSection } from "@/components/compliance/ComplianceLogsSection";
import { RetentionPoliciesSection } from "@/components/compliance/RetentionPoliciesSection";
import { DataSubjectRightsGrid } from "@/components/compliance/DataSubjectRightsGrid";
import { handleDbError } from "@/utils/dbErrorHandler";

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
        supabase.from("compliance_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("data_retention_policies").select("*").order("created_at", { ascending: false }),
      ]);

      if (logsResult.error) throw logsResult.error;
      if (policiesResult.error) throw policiesResult.error;

      const logsData = (logsResult.data || []) as ComplianceLog[];
      setLogs(logsData);
      setPolicies((policiesResult.data || []) as RetentionPolicy[]);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStats({
        totalAcessos: logsData.filter((l) => l.tipo_evento === "acesso_dados").length,
        exportacoes30Dias: logsData.filter(
          (l) => l.tipo_evento === "exportacao" && new Date(l.created_at) > thirtyDaysAgo
        ).length,
        anonimizacoes: logsData.filter((l) => l.tipo_evento === "anonimizacao").length,
        exclusoes: logsData.filter((l) => l.tipo_evento === "exclusao").length,
      });
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: handleDbError(error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!organization?.id) {
        toast({ variant: "destructive", title: "Organização não encontrada", description: "Finalize o onboarding ou verifique seu acesso." });
        return;
      }

      const { error } = await supabase.from("data_retention_policies").insert({
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

      toast({ title: "Política criada", description: "A política de retenção foi criada com sucesso." });
      setIsCreatingPolicy(false);
      setNewPolicy({ nome: "", entidade: "contratos", periodo_retencao_meses: 60, acao_pos_retencao: "anonimizar", base_legal: "obrigacao_legal", descricao: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao criar política", description: handleDbError(error).message, variant: "destructive" });
    }
  };

  const handleTogglePolicy = async (policy: RetentionPolicy) => {
    try {
      const { error } = await supabase.from("data_retention_policies").update({ is_active: !policy.is_active }).eq("id", policy.id);
      if (error) throw error;
      toast({ title: policy.is_active ? "Política desativada" : "Política ativada" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar política", description: handleDbError(error).message, variant: "destructive" });
    }
  };

  const handleExportComplianceReport = () => {
    const reportData = {
      gerado_em: new Date().toISOString(),
      total_logs: logs.length,
      estatisticas: stats,
      politicas_ativas: policies.filter((p) => p.is_active).length,
      ultimos_eventos: logs.slice(0, 20),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-compliance-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado", description: "O relatório de compliance foi exportado com sucesso." });
  };

  const handleAccessData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data, error } = await supabase.functions.invoke("gdpr-handler", { body: { action: "access" } });
      if (error) throw error;
      toast({
        title: "Dados Acessados",
        description: `Contratos: ${data.data?.contratos_criados || 0}, Registros de auditoria: ${data.data?.registros_auditoria || 0}`,
      });
    } catch (error: any) {
      toast({ title: "Erro", description: handleDbError(error).message, variant: "destructive" });
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data, error } = await supabase.functions.invoke("gdpr-handler", { body: { action: "export" } });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dados Exportados", description: "Seus dados foram exportados com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro", description: handleDbError(error).message, variant: "destructive" });
    }
  };

  const handleErasure = async () => {
    setErasureLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data, error } = await supabase.functions.invoke("gdpr-handler", { body: { action: "erasure" } });
      if (error) throw error;
      toast({ title: "Dados Anonimizados", description: "Seus dados foram anonimizados conforme LGPD Art. 18." });
      setIsErasureDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: handleDbError(error).message, variant: "destructive" });
    } finally {
      setErasureLoading(false);
    }
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

      <Alert className="border-amber-500/50 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">Conformidade LGPD</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Este painel monitora todas as operações relacionadas a dados pessoais para garantir conformidade com a Lei Geral de Proteção de Dados (LGPD) e GDPR.
        </AlertDescription>
      </Alert>

      <StatCardGrid columns={4}>
        <StatCard title="Acessos a Dados" value={stats.totalAcessos} icon={Eye} variant="primary" />
        <StatCard title="Exportações (30 dias)" value={stats.exportacoes30Dias} icon={Download} variant="success" />
        <StatCard title="Anonimizações" value={stats.anonimizacoes} icon={EyeOff} variant="warning" />
        <StatCard title="Exclusões" value={stats.exclusoes} icon={Trash2} variant="destructive" />
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
          <ComplianceLogsSection logs={logs} />
        </TabsContent>

        <TabsContent value="retencao" className="space-y-4">
          <RetentionPoliciesSection
            policies={policies}
            isCreatingPolicy={isCreatingPolicy}
            onOpenChange={setIsCreatingPolicy}
            newPolicy={newPolicy}
            onNewPolicyChange={setNewPolicy}
            onCreatePolicy={handleCreatePolicy}
            onTogglePolicy={handleTogglePolicy}
          />
        </TabsContent>

        <TabsContent value="direitos" className="space-y-4">
          <DataSubjectRightsGrid
            isErasureDialogOpen={isErasureDialogOpen}
            onErasureDialogChange={setIsErasureDialogOpen}
            erasureLoading={erasureLoading}
            onErasure={handleErasure}
            onAccessData={handleAccessData}
            onExportData={handleExportData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
