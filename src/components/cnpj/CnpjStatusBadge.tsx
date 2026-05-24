import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CnpjStatus =
  | "ativa"
  | "baixada"
  | "suspensa"
  | "inapta"
  | "nula"
  | "nao_verificado"
  | "erro_consulta"
  | "rate_limited"
  | string
  | null
  | undefined;

const MAP: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ativa: { label: "CNPJ Ativo", cls: "bg-green-500/15 text-green-600 border-green-500/30", Icon: CheckCircle2 },
  baixada: { label: "CNPJ Baixado", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  suspensa: { label: "CNPJ Suspenso", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  inapta: { label: "CNPJ Inapto", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  nula: { label: "CNPJ Nulo", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  erro_consulta: { label: "Erro na consulta", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  rate_limited: { label: "Limite de consultas", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  nao_verificado: { label: "Não verificado", cls: "bg-muted text-muted-foreground border-border", Icon: HelpCircle },
};

export function isCnpjProblem(status?: CnpjStatus) {
  return ["baixada", "suspensa", "inapta", "nula"].includes(String(status));
}

export function CnpjStatusBadge({ status, className }: { status: CnpjStatus; className?: string }) {
  const cfg = MAP[String(status || "nao_verificado")] ?? MAP.nao_verificado;
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", cfg.cls, className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
