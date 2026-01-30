import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "error" | "muted" | "info" | "critical";
  className?: string;
  onClick?: () => void;
  helpText?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  onClick,
  helpText,
}: StatCardProps) {
  // Map error and muted to existing variants
  const mappedVariant = variant === "error" ? "destructive" : variant === "muted" ? "default" : variant === "info" ? "primary" : variant === "critical" ? "critical" : variant;
  
  const variantClasses = {
    default: "stat-card",
    primary: "stat-card-primary",
    success: "stat-card-success",
    warning: "stat-card-warning",
    destructive: "stat-card-destructive",
    critical: "stat-card-critical",
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    critical: "text-[hsl(var(--critical))]",
  };

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-success"
      : trend.value < 0
      ? "text-destructive"
      : "text-muted-foreground"
    : "";

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px -8px hsl(var(--primary) / 0.1)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        variantClasses[mappedVariant as keyof typeof variantClasses],
        onClick && "cursor-pointer hover:border-primary/30 transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate flex items-center gap-1.5">
            <span>{title}</span>
            {helpText && <HelpTooltip text={helpText} />}
          </p>
          <p className={cn(
            "text-2xl font-semibold tracking-tight truncate",
            variant === "error" || variant === "destructive" ? "text-destructive" : "text-foreground"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-lg bg-background/50",
              iconColors[mappedVariant as keyof typeof iconColors]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {TrendIcon && <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />}
          <span className={cn("text-xs font-medium", trendColor)}>
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({
  children,
  columns = 4,
  className,
}: StatCardGridProps) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {children}
    </div>
  );
}
