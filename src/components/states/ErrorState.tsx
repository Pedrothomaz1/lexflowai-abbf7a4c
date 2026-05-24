import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SYSTEM_MESSAGES } from "@/lib/system-messages";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = SYSTEM_MESSAGES.GENERIC_ERROR,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-destructive/30 bg-destructive/5",
        className,
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-5">
          <RefreshCw className="h-4 w-4 mr-2" />
          {SYSTEM_MESSAGES.TRY_AGAIN}
        </Button>
      )}
    </div>
  );
}
