import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Search,
  ChevronRight,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  Shield,
  Zap,
  Lock,
  Database,
  Globe,
  UserX,
  CreditCard,
  Server,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybookStep {
  order: number;
  action: string;
  tool: string;
}

interface Playbook {
  id: string;
  incident_type: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  steps: PlaybookStep[];
  responsible_roles: string[];
  escalation_contacts: Record<string, string>;
  time_to_respond_minutes: number;
  is_active: boolean;
  created_at: string;
}

const incidentIcons: Record<string, typeof ShieldAlert> = {
  unauthorized_access: Lock,
  data_breach: Database,
  ransomware: XCircle,
  phishing: Globe,
  privilege_escalation: Shield,
  financial_fraud: CreditCard,
  ddos: Server,
  insider_threat: UserX,
  account_takeover: Lock,
  data_corruption: HardDrive,
};

const severityConfig = {
  critical: {
    color: "bg-destructive text-destructive-foreground",
    icon: ShieldAlert,
    label: "Crítico",
  },
  high: {
    color: "bg-orange-500 text-white",
    icon: AlertTriangle,
    label: "Alto",
  },
  medium: {
    color: "bg-yellow-500 text-white",
    icon: Zap,
    label: "Médio",
  },
  low: {
    color: "bg-blue-500 text-white",
    icon: Shield,
    label: "Baixo",
  },
};

export function IncidentPlaybooks() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incident_playbooks")
        .select("*")
        .eq("is_active", true)
        .order("severity", { ascending: true });

      if (error) throw error;
      
      // Sort by severity priority
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sorted = (data || []).sort((a, b) => 
        severityOrder[a.severity as keyof typeof severityOrder] - 
        severityOrder[b.severity as keyof typeof severityOrder]
      );
      
      setPlaybooks(sorted as Playbook[]);
    } catch (error) {
      console.error("Error fetching playbooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaybooks = playbooks.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.incident_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (playbooks.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Nenhum Playbook Encontrado"
        description="Não há playbooks de resposta a incidentes configurados."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar playbook por tipo ou título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredPlaybooks.map((playbook) => {
          const severity = severityConfig[playbook.severity];
          const Icon = incidentIcons[playbook.incident_type] || ShieldAlert;

          return (
            <Card
              key={playbook.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => setSelectedPlaybook(playbook)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      playbook.severity === "critical" && "bg-destructive/10",
                      playbook.severity === "high" && "bg-orange-500/10",
                      playbook.severity === "medium" && "bg-yellow-500/10",
                      playbook.severity === "low" && "bg-blue-500/10"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        playbook.severity === "critical" && "text-destructive",
                        playbook.severity === "high" && "text-orange-500",
                        playbook.severity === "medium" && "text-yellow-600",
                        playbook.severity === "low" && "text-blue-500"
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{playbook.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {playbook.incident_type.replace(/_/g, " ")}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={severity.color}>{severity.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {playbook.time_to_respond_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {(playbook.steps as PlaybookStep[])?.length || 0} passos
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Playbook Detail Dialog */}
      <Dialog open={!!selectedPlaybook} onOpenChange={() => setSelectedPlaybook(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          {selectedPlaybook && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = incidentIcons[selectedPlaybook.incident_type] || ShieldAlert;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                  <div>
                    <DialogTitle className="text-xl">{selectedPlaybook.title}</DialogTitle>
                    <DialogDescription>
                      Procedimento de resposta a incidentes
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3">
                    <Badge className={severityConfig[selectedPlaybook.severity].color}>
                      Severidade: {severityConfig[selectedPlaybook.severity].label}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tempo de resposta: {selectedPlaybook.time_to_respond_minutes} min
                    </Badge>
                  </div>

                  {/* Responsible Roles */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      Responsáveis
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlaybook.responsible_roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Passos de Resposta</h4>
                    <div className="space-y-3">
                      {(selectedPlaybook.steps as PlaybookStep[])?.map((step, idx) => (
                        <div
                          key={step.order}
                          className="flex gap-3 p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.action}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ferramenta: <code className="bg-muted px-1 rounded">{step.tool}</code>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Escalation Contacts */}
                  {Object.keys(selectedPlaybook.escalation_contacts || {}).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4" />
                        Contatos de Escalação
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(selectedPlaybook.escalation_contacts || {}).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                            >
                              <span className="font-medium capitalize">{key}</span>
                              <span className="text-muted-foreground">{value}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedPlaybook(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
