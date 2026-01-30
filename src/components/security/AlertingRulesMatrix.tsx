import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  Clock,
  ShieldAlert,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertRule {
  name: string;
  description: string;
  responseTime: string;
}

interface AlertCategory {
  severity: "critical" | "high" | "medium";
  title: string;
  responseTime: string;
  icon: React.ReactNode;
  rules: AlertRule[];
}

const alertCategories: AlertCategory[] = [
  {
    severity: "critical",
    title: "Crítico (Imediato)",
    responseTime: "Resposta imediata",
    icon: <XCircle className="h-5 w-5" />,
    rules: [
      {
        name: "Alerta de Segurança Crítico",
        description: "Alerta com severity=critical detectado no sistema",
        responseTime: "< 15 min",
      },
      {
        name: "Múltiplas Violações RLS",
        description: "Várias violações de RLS policy do mesmo usuário",
        responseTime: "< 15 min",
      },
      {
        name: "Potencial Data Breach",
        description: "Detecção de potencial vazamento de dados",
        responseTime: "Imediato",
      },
      {
        name: "Conta Admin Comprometida",
        description: "Atividade suspeita em conta de system_admin",
        responseTime: "Imediato",
      },
    ],
  },
  {
    severity: "high",
    title: "Alto (Até 1 hora)",
    responseTime: "Resposta em até 1h",
    icon: <AlertTriangle className="h-5 w-5" />,
    rules: [
      {
        name: "Tentativas de Login Repetidas",
        description: "Múltiplas falhas de login do mesmo IP/usuário",
        responseTime: "< 1h",
      },
      {
        name: "Exportação de Dados Incomum",
        description: "Volume anormal de dados exportados",
        responseTime: "< 1h",
      },
      {
        name: "Tentativa de Escalação de Privilégio",
        description: "Tentativa de acessar recursos não autorizados",
        responseTime: "< 1h",
      },
      {
        name: "MFA Desabilitado para Usuário Crítico",
        description: "Usuário com role crítica desativou 2FA",
        responseTime: "< 1h",
      },
    ],
  },
  {
    severity: "medium",
    title: "Médio (Até 24 horas)",
    responseTime: "Resposta em até 24h",
    icon: <AlertCircle className="h-5 w-5" />,
    rules: [
      {
        name: "Rate Limit Frequente",
        description: "Usuário atingindo rate limit repetidamente",
        responseTime: "< 24h",
      },
      {
        name: "Padrão de Anomalia Detectado",
        description: "Sistema detectou comportamento anômalo",
        responseTime: "< 24h",
      },
      {
        name: "Tentativa de Acesso Não Autorizado",
        description: "Acesso a recurso sem permissão adequada",
        responseTime: "< 24h",
      },
    ],
  },
];

const getSeverityStyles = (severity: "critical" | "high" | "medium") => {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-destructive/10",
        border: "border-destructive/30",
        badge: "destructive" as const,
        iconColor: "text-destructive",
      };
    case "high":
      return {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        badge: "secondary" as const,
        iconColor: "text-orange-500",
      };
    case "medium":
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        badge: "outline" as const,
        iconColor: "text-yellow-500",
      };
  }
};

export function AlertingRulesMatrix() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Matriz de Regras de Alerta</h3>
      </div>

      <div className="grid gap-4">
        {alertCategories.map((category) => {
          const styles = getSeverityStyles(category.severity);
          return (
            <Card
              key={category.severity}
              className={cn("border", styles.border)}
            >
              <CardHeader className={cn("pb-3", styles.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={styles.iconColor}>{category.icon}</span>
                    <CardTitle className="text-base">{category.title}</CardTitle>
                  </div>
                  <Badge variant={styles.badge} className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {category.responseTime}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {category.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {rule.responseTime}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            SLA de Resposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3 text-sm">
            <div className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
              <span>Crítico</span>
              <Badge variant="destructive">Imediato / 15 min</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-orange-500/10">
              <span>Alto</span>
              <Badge className="bg-orange-500">1 hora</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-yellow-500/10">
              <span>Médio</span>
              <Badge className="bg-yellow-500 text-yellow-950">24 horas</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
