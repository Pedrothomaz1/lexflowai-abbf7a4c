import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Eye,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  FileSignature,
  FileDown,
  Brain,
  User,
  Filter,
  Calendar,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  user_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const actionIcons: Record<string, typeof Eye> = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
  approve: CheckCircle,
  reject: XCircle,
  download: Download,
  upload: Upload,
  sign: FileSignature,
  export: FileDown,
  analyze: Brain,
};

const actionLabels: Record<string, string> = {
  view: "Visualização",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  approve: "Aprovação",
  reject: "Rejeição",
  download: "Download",
  upload: "Upload",
  sign: "Assinatura",
  export: "Exportação",
  analyze: "Análise IA",
};

const entityLabels: Record<string, string> = {
  contrato: "Contrato",
  fornecedor: "Fornecedor",
  obrigacao: "Obrigação",
  anexo: "Anexo",
  assinatura: "Assinatura",
  aprovacao: "Aprovação",
  comentario: "Comentário",
  servico: "Serviço",
  unidade: "Unidade",
  usuario: "Usuário",
  template: "Template",
  alerta: "Alerta",
};

const actionColors: Record<string, string> = {
  view: "bg-blue-500/10 text-blue-500",
  create: "bg-green-500/10 text-green-500",
  update: "bg-yellow-500/10 text-yellow-500",
  delete: "bg-red-500/10 text-red-500",
  approve: "bg-emerald-500/10 text-emerald-500",
  reject: "bg-rose-500/10 text-rose-500",
  download: "bg-indigo-500/10 text-indigo-500",
  upload: "bg-violet-500/10 text-violet-500",
  sign: "bg-purple-500/10 text-purple-500",
  export: "bg-cyan-500/10 text-cyan-500",
  analyze: "bg-orange-500/10 text-orange-500",
};

export default function AuditLogs() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({
    search: "",
    action: "all",
    entity: "all",
  });

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, roleLoading]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);

      // Fetch user names
      const userIds = [...new Set((data || []).filter(l => l.user_id).map(l => l.user_id!))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach(p => { names[p.id] = p.full_name; });
          setUserNames(names);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filters.action !== "all" && log.acao !== filters.action) return false;
    if (filters.entity !== "all" && log.entidade !== filters.entity) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const userName = log.user_id ? userNames[log.user_id]?.toLowerCase() : "";
      const actionLabel = actionLabels[log.acao]?.toLowerCase() || "";
      const entityLabel = entityLabels[log.entidade]?.toLowerCase() || "";
      
      if (!userName.includes(search) && !actionLabel.includes(search) && !entityLabel.includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (roleLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Shield}
          title="Acesso Restrito"
          description="Apenas administradores podem visualizar os logs de auditoria."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria"
        description="Histórico completo de ações realizadas no sistema"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, ação..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select
              value={filters.action}
              onValueChange={(value) => setFilters(f => ({ ...f, action: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.entity}
              onValueChange={(value) => setFilters(f => ({ ...f, entity: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {Object.entries(entityLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Atividades Recentes
            <Badge variant="secondary" className="ml-2">
              {filteredLogs.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhuma atividade encontrada"
              description="Ajuste os filtros ou aguarde novas ações no sistema."
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const ActionIcon = actionIcons[log.acao] || Activity;
                  const colorClass = actionColors[log.acao] || "bg-gray-500/10 text-gray-500";
                  
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {actionLabels[log.acao] || log.acao}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {entityLabels[log.entidade] || log.entidade}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {log.user_id && userNames[log.user_id] && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {userNames[log.user_id]}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        {/* Show changes if available */}
                        {log.dados_novos && Object.keys(log.dados_novos).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">Alterações: </span>
                            {Object.keys(log.dados_novos).slice(0, 3).join(", ")}
                            {Object.keys(log.dados_novos).length > 3 && ` +${Object.keys(log.dados_novos).length - 3}`}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground text-right shrink-0">
                        {log.entidade_id && (
                          <div className="font-mono truncate max-w-[80px]">
                            #{log.entidade_id.slice(0, 8)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
