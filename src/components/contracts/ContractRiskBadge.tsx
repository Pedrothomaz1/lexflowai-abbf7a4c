import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  score: number | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
}

/**
 * Badge visual de risco contratual.
 * Escala 0-10 (alinhada com contract_analysis.score_risco):
 *  - >= 7  → Alto (destructive)
 *  - 4–6.9 → Médio (warning/outline)
 *  - < 4   → Baixo (success/default)
 */
export function ContractRiskBadge({ score, size = "sm", showLabel = true }: Props) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className={cn("gap-1 text-muted-foreground", size === "sm" && "text-xs")}>
        <ShieldQuestion className="h-3 w-3" />
        {showLabel && "Sem análise"}
      </Badge>
    );
  }

  const numeric = Number(score);
  const isHigh = numeric >= 7;
  const isMedium = numeric >= 4 && numeric < 7;

  const variant = isHigh ? "destructive" : isMedium ? "outline" : "default";
  const label = isHigh ? "Alto" : isMedium ? "Médio" : "Baixo";
  const Icon = isHigh ? ShieldAlert : ShieldCheck;

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1 tabular-nums",
        size === "sm" && "text-xs",
        isMedium && "border-warning/40 text-warning bg-warning/10"
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && (
        <span>
          {label} · {numeric.toFixed(1)}
        </span>
      )}
      {!showLabel && numeric.toFixed(1)}
    </Badge>
  );
}
