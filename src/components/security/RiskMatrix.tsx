import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertTriangle,
  Shield,
  Zap,
  Users,
  Database,
  Lock,
  Activity,
  Cloud,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Risk {
  id: string;
  name: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigations: string[];
  icon: React.ReactNode;
  status: "mitigated" | "monitoring" | "open";
}

const RISKS: Risk[] = [
  {
    id: "rls-misconfig",
    name: "Configuração incorreta de RLS bloqueia operações legítimas",
    probability: "medium",
    impact: "high",
    mitigations: [
      "Testes extensivos em ambiente de staging",
      "Bypass de admin para emergências",
      "Logging detalhado de negações",
    ],
    icon: <Database className="h-5 w-5" />,
    status: "mitigated",
  },
  {
    id: "rate-limiting-power-users",
    name: "Rate limiting impacta power users",
    probability: "medium",
    impact: "medium",
    mitigations: [
      "Limites diferenciados por role",
      "Allowance de burst",
      "Override fácil pelo admin",
    ],
    icon: <Zap className="h-5 w-5" />,
    status: "mitigated",
  },
  {
    id: "audit-performance",
    name: "Audit logging impacta performance",
    probability: "low",
    impact: "medium",
    mitigations: [
      "Logging assíncrono",
      "Indexação adequada",
      "Estratégia de arquivamento",
    ],
    icon: <Activity className="h-5 w-5" />,
    status: "mitigated",
  },
  {
    id: "false-positives",
    name: "Alertas falso-positivos causam fadiga",
    probability: "medium",
    impact: "medium",
    mitigations: [
      "Tuning iterativo das regras de anomalia",
      "Classificação de severidade",
      "Loop de feedback do usuário",
    ],
    icon: <AlertTriangle className="h-5 w-5" />,
    status: "monitoring",
  },
  {
    id: "mfa-friction",
    name: "MFA cria fricção para usuários",
    probability: "high",
    impact: "low",
    mitigations: [
      "UX de onboarding suave",
      "Opção de lembrar dispositivo",
      "Comunicação clara dos benefícios",
    ],
    icon: <Lock className="h-5 w-5" />,
    status: "mitigated",
  },
  {
    id: "encryption-performance",
    name: "Criptografia degrada performance de queries",
    probability: "low",
    impact: "medium",
    mitigations: [
      "Criptografar apenas campos críticos",
      "Usar colunas indexadas para queries",
      "Cache de dados frequentemente acessados",
    ],
    icon: <Shield className="h-5 w-5" />,
    status: "mitigated",
  },
  {
    id: "external-dependency",
    name: "Falha de dependência externa (ex: Cloudflare)",
    probability: "low",
    impact: "high",
    mitigations: [
      "Degradação graceful",
      "DNS de failover",
      "Rate limiting on-prem de backup",
    ],
    icon: <Cloud className="h-5 w-5" />,
    status: "open",
  },
  {
    id: "team-expertise",
    name: "Equipe carece de expertise em segurança",
    probability: "medium",
    impact: "high",
    mitigations: [
      "Contratar/terceirizar especialista em segurança",
      "Programa de treinamento",
      "Auditorias externas",
    ],
    icon: <GraduationCap className="h-5 w-5" />,
    status: "monitoring",
  },
];

const getProbabilityColor = (probability: string) => {
  switch (probability) {
    case "high":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    case "low":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "";
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "high":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    case "low":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "mitigated":
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Mitigado</Badge>;
    case "monitoring":
      return <Badge variant="secondary">Monitorando</Badge>;
    case "open":
      return <Badge variant="destructive">Em Aberto</Badge>;
    default:
      return null;
  }
};

const getRiskScore = (probability: string, impact: string): number => {
  const probScore = probability === "high" ? 3 : probability === "medium" ? 2 : 1;
  const impactScore = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  return probScore * impactScore;
};

const getRiskLevel = (score: number): string => {
  if (score >= 6) return "Crítico";
  if (score >= 4) return "Alto";
  if (score >= 2) return "Médio";
  return "Baixo";
};

const getRiskLevelColor = (score: number): string => {
  if (score >= 6) return "text-destructive";
  if (score >= 4) return "text-warning";
  if (score >= 2) return "text-yellow-500";
  return "text-green-500";
};

export function RiskMatrix() {
  const sortedRisks = [...RISKS].sort((a, b) => {
    const scoreA = getRiskScore(a.probability, a.impact);
    const scoreB = getRiskScore(b.probability, b.impact);
    return scoreB - scoreA;
  });

  const mitigatedCount = RISKS.filter((r) => r.status === "mitigated").length;
  const monitoringCount = RISKS.filter((r) => r.status === "monitoring").length;
  const openCount = RISKS.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Mitigados</div>
                <div className="text-2xl font-bold text-green-500">{mitigatedCount}</div>
              </div>
              <Shield className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Monitorando</div>
                <div className="text-2xl font-bold">{monitoringCount}</div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn(openCount > 0 && "bg-destructive/5 border-destructive/20")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Em Aberto</div>
                <div className={cn("text-2xl font-bold", openCount > 0 && "text-destructive")}>
                  {openCount}
                </div>
              </div>
              <AlertTriangle className={cn("h-8 w-8", openCount > 0 ? "text-destructive/50" : "text-muted-foreground/50")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Matriz de Riscos
          </CardTitle>
          <CardDescription>
            Avaliação de probabilidade × impacto para cada risco identificado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Visual Matrix Grid */}
          <div className="mb-6 overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="grid grid-cols-4 gap-1 text-center text-sm">
                <div className="p-2"></div>
                <div className="p-2 font-medium text-muted-foreground">Baixo</div>
                <div className="p-2 font-medium text-muted-foreground">Médio</div>
                <div className="p-2 font-medium text-muted-foreground">Alto</div>
                
                <div className="p-2 font-medium text-muted-foreground text-right">Alto</div>
                <div className="p-2 bg-warning/20 rounded">Médio</div>
                <div className="p-2 bg-orange-500/20 rounded">Alto</div>
                <div className="p-2 bg-destructive/20 rounded">Crítico</div>
                
                <div className="p-2 font-medium text-muted-foreground text-right">Médio</div>
                <div className="p-2 bg-yellow-500/20 rounded">Baixo</div>
                <div className="p-2 bg-warning/20 rounded">Médio</div>
                <div className="p-2 bg-orange-500/20 rounded">Alto</div>
                
                <div className="p-2 font-medium text-muted-foreground text-right">Baixo</div>
                <div className="p-2 bg-green-500/20 rounded">Baixo</div>
                <div className="p-2 bg-yellow-500/20 rounded">Baixo</div>
                <div className="p-2 bg-warning/20 rounded">Médio</div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span className="ml-16">← Impacto →</span>
                <span className="transform -rotate-90 origin-right">Probabilidade</span>
              </div>
            </div>
          </div>

          {/* Risk List */}
          <Accordion type="single" collapsible className="space-y-2">
            {sortedRisks.map((risk) => {
              const score = getRiskScore(risk.probability, risk.impact);
              const level = getRiskLevel(score);
              const levelColor = getRiskLevelColor(score);

              return (
                <AccordionItem
                  key={risk.id}
                  value={risk.id}
                  className={cn(
                    "border rounded-lg px-4",
                    risk.status === "mitigated" && "bg-green-500/5",
                    risk.status === "open" && "bg-destructive/5"
                  )}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "p-2 rounded-lg",
                        risk.status === "mitigated" && "bg-green-500/10",
                        risk.status === "monitoring" && "bg-muted",
                        risk.status === "open" && "bg-destructive/10"
                      )}>
                        {risk.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{risk.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-xs", getProbabilityColor(risk.probability))}>
                            Prob: {risk.probability === "high" ? "Alta" : risk.probability === "medium" ? "Média" : "Baixa"}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getImpactColor(risk.impact))}>
                            Impacto: {risk.impact === "high" ? "Alto" : risk.impact === "medium" ? "Médio" : "Baixo"}
                          </Badge>
                          <span className={cn("text-xs font-medium", levelColor)}>
                            Risco: {level}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(risk.status)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-14">
                      <div className="text-sm font-medium mb-2 text-muted-foreground">
                        Estratégias de Mitigação:
                      </div>
                      <ul className="space-y-2">
                        {risk.mitigations.map((mitigation, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-primary mt-0.5">•</span>
                            <span>{mitigation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
