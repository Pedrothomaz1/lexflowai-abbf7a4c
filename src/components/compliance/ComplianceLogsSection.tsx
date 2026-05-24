import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Eye,
  Download,
  EyeOff,
  Trash2,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComplianceLog {
  id: string;
  tipo_evento: string;
  entidade: string;
  entidade_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dados_afetados: Record<string, any> | null;
  justificativa: string | null;
  base_legal: string | null;
  user_id: string | null;
  ip_address: string | null;
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

interface ComplianceLogsSectionProps {
  logs: ComplianceLog[];
}

export function ComplianceLogsSection({ logs }: ComplianceLogsSectionProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Nenhum log registrado"
        description="Os eventos de compliance aparecerão aqui"
      />
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-base">Histórico de Eventos</CardTitle>
        <CardDescription>Últimos 100 eventos registrados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => {
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
                    <Badge variant="outline" className="text-xs">{log.entidade}</Badge>
                    {log.base_legal && (
                      <Badge variant="secondary" className="text-xs">
                        {BASE_LEGAL_OPTIONS.find((b) => b.value === log.base_legal)?.label || log.base_legal}
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
  );
}
