import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean } | null;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "warning" | "danger" | "muted";
}

const accentMap = {
  primary: "from-primary/10 to-primary/0 border-primary/20",
  warning: "from-amber-500/10 to-amber-500/0 border-amber-500/20",
  danger: "from-destructive/10 to-destructive/0 border-destructive/20",
  muted: "from-muted/40 to-muted/0 border-border",
};

export function KpiCard({ label, value, delta, hint, icon, accent = "primary" }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br transition-shadow hover:shadow-md",
        accentMap[accent],
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-3xl font-bold leading-none text-foreground"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          {delta && (
            <span
              className={cn(
                "text-xs font-semibold",
                delta.positive ? "text-emerald-600" : "text-destructive",
              )}
            >
              {delta.positive ? "▲" : "▼"} {delta.value}
            </span>
          )}
        </div>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
