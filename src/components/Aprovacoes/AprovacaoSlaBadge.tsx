import { Badge } from "@/components/ui/badge";
import { differenceInHours } from "date-fns";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  dueAt: string | null;
  status: string;
}

/**
 * SLA do passo de aprovação. Verde >24h, amarelo <=24h, vermelho vencido.
 * Não mostra em passos já decididos.
 */
export function AprovacaoSlaBadge({ dueAt, status }: Props) {
  if (status !== "pendente") return null;
  if (!dueAt) return <Badge variant="outline" className="text-muted-foreground">Sem SLA</Badge>;

  const horas = differenceInHours(new Date(dueAt), new Date());

  if (horas < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> SLA vencido {Math.abs(horas)}h
      </Badge>
    );
  }
  if (horas <= 24) {
    return (
      <Badge variant="outline" className="gap-1 border-warning text-warning">
        <Clock className="h-3 w-3" /> SLA em risco ({horas}h)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CheckCircle2 className="h-3 w-3" /> {horas}h
    </Badge>
  );
}
