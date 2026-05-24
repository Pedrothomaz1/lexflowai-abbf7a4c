import { ReactNode } from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface KPICardProps {
  label: string;
  icon: LucideIcon;
  value?: number | string;
  delta?: number;
  unit?: string;
  href?: string;
  loading?: boolean;
  error?: boolean;
  tone?: "default" | "warning" | "danger";
  children?: ReactNode;
}

export function KPICard({
  label, icon: Icon, value, delta, unit, href, loading, error, tone = "default", children,
}: KPICardProps) {
  const toneRing = {
    default: "border-border",
    warning: "border-amber-500/40",
    danger: "border-destructive/50",
  }[tone];

  const inner = (
    <Card className={cn(
      "p-5 transition-all hover:shadow-md hover:-translate-y-0.5 group",
      toneRing,
      href && "cursor-pointer",
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-foreground/70" strokeWidth={2} />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : error ? (
          <p className="text-2xl text-muted-foreground">—</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {value ?? 0}
            </p>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        )}
        {!loading && !error && typeof delta === "number" && delta !== 0 && (
          <div className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            delta > 0 ? "text-emerald-600" : "text-destructive",
          )}>
            {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
        {!loading && !error && delta === 0 && (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" />
            estável
          </div>
        )}
      </div>
      {children}
    </Card>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}
