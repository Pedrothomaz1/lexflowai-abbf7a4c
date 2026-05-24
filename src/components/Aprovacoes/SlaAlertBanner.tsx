import { AlertTriangle, Clock } from "lucide-react";
import { differenceInHours } from "date-fns";
import { Card } from "@/components/ui/card";
import type { ApprovalStep } from "@/hooks/useAprovacoes";

interface Props {
  steps?: ApprovalStep[];
}

export function SlaAlertBanner({ steps }: Props) {
  if (!steps?.length) return null;
  const pendentes = steps.filter((s) => s.status === "pendente");
  if (!pendentes.length) return null;

  const now = new Date();
  let vencidos = 0;
  let emRisco = 0;
  for (const s of pendentes) {
    if (!s.due_at) continue;
    const due = new Date(s.due_at);
    const h = differenceInHours(due, now);
    if (h < 0) vencidos++;
    else if (h <= 4) emRisco++;
  }

  if (!vencidos && !emRisco) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {vencidos > 0 && (
        <Card className="p-3 border-destructive/40 bg-destructive/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">{vencidos} aprovação{vencidos > 1 ? "ões" : ""} vencida{vencidos > 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">SLA estourado — decisão imediata necessária.</p>
          </div>
        </Card>
      )}
      {emRisco > 0 && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">{emRisco} em risco</p>
            <p className="text-xs text-muted-foreground">Vencem nas próximas 4 horas.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
