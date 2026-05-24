import { differenceInCalendarDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SLA_DIAS_POR_URGENCIA } from "@/lib/lexflow-constants";

interface Props {
  createdAt: string;
  dataNecessidade?: string | null;
  urgencia: string;
  status: string;
}

/**
 * Badge de SLA: dias restantes até a data desejada (ou estimada pela urgência).
 * Verde >5d, amarelo 1-5d, vermelho atrasado. Oculto quando concluído/cancelado.
 */
export function SlaBadge({ createdAt, dataNecessidade, urgencia, status }: Props) {
  if (["aprovado", "rejeitado", "convertido"].includes(status)) return null;

  const alvo = dataNecessidade
    ? new Date(dataNecessidade)
    : new Date(new Date(createdAt).getTime() + (SLA_DIAS_POR_URGENCIA[urgencia] ?? 10) * 86400000);

  const dias = differenceInCalendarDays(alvo, new Date());

  if (dias < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {Math.abs(dias)}d atraso
      </Badge>
    );
  }
  if (dias <= 5) {
    return (
      <Badge variant="outline" className="gap-1 border-warning text-warning">
        <Clock className="h-3 w-3" />
        SLA {dias}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CheckCircle2 className="h-3 w-3" />
      {dias}d
    </Badge>
  );
}
