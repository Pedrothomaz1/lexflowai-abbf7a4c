import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityAlert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: string;
  status: string;
  user_id: string | null;
  details: Record<string, any> | null;
  timestamp: string;
  resolution_notes: string | null;
  resolved_at: string | null;
}

interface SecurityAlertsListProps {
  onUpdate?: () => void;
}

const SEVERITY_CONFIG = {
  critical: { label: "Crítico", icon: ShieldAlert, color: "bg-red-500/10 text-red-500 border-red-500/30" },
  high: { label: "Alto", icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  medium: { label: "Médio", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  low: { label: "Baixo", icon: ShieldCheck, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
};

const STATUS_CONFIG = {
  open: { label: "Aberto", color: "bg-red-500/10 text-red-500" },
  investigating: { label: "Investigando", color: "bg-yellow-500/10 text-yellow-500" },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-500" },
  false_positive: { label: "Falso Positivo", color: "bg-gray-500/10 text-gray-500" },
};

export function SecurityAlertsList({ onUpdate }: SecurityAlertsListProps) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: "all", status: "all" });
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; alert: SecurityAlert | null; action: string }>({
    open: false,
    alert: null,
    action: "resolved",
  });
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("security_alerts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      toast({
        title: "Erro ao carregar alertas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialog.alert) return;

    try {
      const { error } = await supabase
        .from("security_alerts")
        .update({
          status: resolveDialog.action,
          resolution_notes: resolutionNotes || null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", resolveDialog.alert.id);

      if (error) throw error;

      toast({
        title: "Alerta atualizado",
        description: `Status alterado para ${STATUS_CONFIG[resolveDialog.action as keyof typeof STATUS_CONFIG]?.label || resolveDialog.action}`,
      });

      setResolveDialog({ open: false, alert: null, action: "resolved" });
      setResolutionNotes("");
      fetchAlerts();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter.severity !== "all" && alert.severity !== filter.severity) return false;
    if (filter.status !== "all" && alert.status !== filter.status) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Alertas de Segurança
                <Badge variant="secondary">{filteredAlerts.length}</Badge>
              </CardTitle>
              <CardDescription>Monitoramento de incidentes e anomalias</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={filter.severity}
                onValueChange={(value) => setFilter((f) => ({ ...f, severity: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filter.status}
                onValueChange={(value) => setFilter((f) => ({ ...f, status: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="investigating">Investigando</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                  <SelectItem value="false_positive">Falso Positivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nenhum alerta encontrado"
              description="Não há alertas de segurança com os filtros selecionados"
            />
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const severityConfig = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                  const statusConfig = STATUS_CONFIG[alert.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
                  const SeverityIcon = severityConfig.icon;

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                        alert.status === "open" ? "bg-red-500/5 border-red-500/20" : "bg-card"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", severityConfig.color)}>
                        <SeverityIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{alert.rule_name}</span>
                          <Badge variant="outline" className={severityConfig.color}>
                            {severityConfig.label}
                          </Badge>
                          <Badge variant="secondary" className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(alert.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          {alert.user_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {alert.user_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>

                        {alert.details && Object.keys(alert.details).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                            {JSON.stringify(alert.details, null, 2).slice(0, 150)}
                            {JSON.stringify(alert.details).length > 150 && "..."}
                          </div>
                        )}

                        {alert.resolution_notes && (
                          <div className="mt-2 text-xs text-muted-foreground italic">
                            Resolução: {alert.resolution_notes}
                          </div>
                        )}
                      </div>

                      {alert.status === "open" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResolveDialog({ open: true, alert, action: "investigating" })}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => setResolveDialog({ open: true, alert, action: "resolved" })}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-500"
                            onClick={() => setResolveDialog({ open: true, alert, action: "false_positive" })}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog((d) => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveDialog.action === "investigating"
                ? "Iniciar Investigação"
                : resolveDialog.action === "resolved"
                ? "Resolver Alerta"
                : "Marcar como Falso Positivo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notas de Resolução</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Descreva as ações tomadas ou justificativa..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, alert: null, action: "resolved" })}>
              Cancelar
            </Button>
            <Button onClick={handleResolve}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
