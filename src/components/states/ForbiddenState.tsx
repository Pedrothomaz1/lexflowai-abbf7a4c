import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SYSTEM_MESSAGES } from "@/lib/system-messages";

interface ForbiddenStateProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: "block" | "module";
}

export function ForbiddenState({
  title,
  description,
  className,
  variant = "block",
}: ForbiddenStateProps) {
  const resolvedTitle =
    title ??
    (variant === "module" ? SYSTEM_MESSAGES.FORBIDDEN_MODULE : SYSTEM_MESSAGES.FORBIDDEN_BLOCK);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-border bg-muted/30",
        className,
      )}
    >
      <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{resolvedTitle}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  );
}
