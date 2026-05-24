import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

export function OnboardingChecklist() {
  const {
    steps,
    completedKeys,
    completedCount,
    totalSteps,
    progressPct,
    showChecklist,
    dismissChecklist,
    loading,
  } = useOnboarding();
  const [open, setOpen] = useState(true);

  if (loading || !showChecklist) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)]">
      <Card className="shadow-2xl border-primary/20 bg-card/95 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 text-left flex-1 group"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Rocket className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Configure o LexFlow</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount} de {totalSteps} concluídos
                </p>
              </div>
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
              )}
            </button>
            <button
              onClick={dismissChecklist}
              className="text-muted-foreground hover:text-foreground transition p-1 -mr-1"
              aria-label="Dispensar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={progressPct} className="h-1.5 mt-2" />
        </CardHeader>
        {open && (
          <CardContent className="pt-0 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
            {steps.map((s) => {
              const done = completedKeys.has(s.key);
              return (
                <Link
                  key={s.key}
                  to={s.href}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-2.5 transition hover:bg-accent/50",
                    done && "opacity-60"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        done && "line-through"
                      )}
                    >
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {s.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
