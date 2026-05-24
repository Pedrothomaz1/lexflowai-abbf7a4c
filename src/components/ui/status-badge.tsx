import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" }
> = {
  // Contract statuses
  rascunho: { label: "Rascunho", variant: "default" },
  em_aprovacao: { label: "Em Aprovação", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "info" },
  assinado: { label: "Assinado", variant: "success" },
  vigente: { label: "Vigente", variant: "success" },
  encerrado: { label: "Encerrado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  
  // Generic statuses
  ativo: { label: "Ativo", variant: "success" },
  inativo: { label: "Inativo", variant: "default" },
  pendente: { label: "Pendente", variant: "warning" },
  concluido: { label: "Concluído", variant: "success" },
  erro: { label: "Erro", variant: "destructive" },
  
  // Alert types
  vencimento: { label: "Vencimento", variant: "warning" },
  renovacao: { label: "Renovação", variant: "info" },
  aditivo: { label: "Aditivo", variant: "info" },
  
  // Approval statuses
  approved: { label: "Aprovado", variant: "success" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  pending: { label: "Pendente", variant: "warning" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "default" as const };
  
  const variantClasses = {
    default: "bg-muted text-muted-foreground border-muted",
    success: "badge-success",
    warning: "badge-warning",
    destructive: "badge-destructive",
    info: "badge-info",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-xs",
        variantClasses[config.variant],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

interface ContractTypeBadgeProps {
  type: string;
  className?: string;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  prestacao_servicos: { label: "Prestação de Serviços", color: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
  fornecimento: { label: "Fornecimento", color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  locacao: { label: "Locação", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  confidencialidade: { label: "Confidencialidade", color: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  parceria: { label: "Parceria", color: "bg-chart-5/10 text-chart-5 border-chart-5/20" },
  outro: { label: "Outro", color: "bg-muted text-muted-foreground border-muted" },
};

export function ContractTypeBadge({ type, className }: ContractTypeBadgeProps) {
  const config = typeConfig[type] || { label: type, color: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.color, className)}>
      {config.label}
    </Badge>
  );
}
