import { CheckCircle2, Circle, MessageSquare, FileText, Send, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkflowStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: typeof CheckCircle2;
  completed: boolean;
}

interface FranquiaRenovacaoWorkflowProps {
  consultoraInformada: boolean;
  renovacaoAceita: boolean;
  novoContratoEnviado: boolean;
  contratoNovoAssinado: boolean;
  onStepToggle?: (step: string, value: boolean) => void;
  compact?: boolean;
  interactive?: boolean;
}

export function FranquiaRenovacaoWorkflow({
  consultoraInformada,
  renovacaoAceita,
  novoContratoEnviado,
  contratoNovoAssinado,
  onStepToggle,
  compact = false,
  interactive = false,
}: FranquiaRenovacaoWorkflowProps) {
  const steps: WorkflowStep[] = [
    {
      id: "consultora_informada",
      label: "Consultora informada sobre vencimento",
      shortLabel: "Informada",
      icon: MessageSquare,
      completed: consultoraInformada,
    },
    {
      id: "renovacao_aceita",
      label: "Renovação aceita pela franqueada",
      shortLabel: "Aceita",
      icon: CheckCircle2,
      completed: renovacaoAceita,
    },
    {
      id: "novo_contrato_enviado",
      label: "Novo contrato enviado",
      shortLabel: "Enviado",
      icon: Send,
      completed: novoContratoEnviado,
    },
    {
      id: "contrato_novo_assinado",
      label: "Contrato novo assinado",
      shortLabel: "Assinado",
      icon: PenLine,
      completed: contratoNovoAssinado,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  const handleStepClick = (step: WorkflowStep) => {
    if (interactive && onStepToggle) {
      onStepToggle(step.id, !step.completed);
    }
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  step.completed
                    ? "bg-[hsl(var(--lexflow-verde-principal))]"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">Workflow de Renovação</p>
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                {step.completed ? (
                  <CheckCircle2 className="h-3 w-3 text-[hsl(var(--lexflow-verde-principal))]" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground/50" />
                )}
                <span className={step.completed ? "" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso da Renovação</span>
          <span className="font-medium">
            {completedCount} de {steps.length} etapas
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[hsl(var(--lexflow-verde-principal))] transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isClickable = interactive && onStepToggle;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                step.completed
                  ? "bg-[hsl(var(--lexflow-verde-principal)/0.1)] border-[hsl(var(--lexflow-verde-principal)/0.3)]"
                  : "bg-muted/30 border-border",
                isClickable && "cursor-pointer hover:border-[hsl(var(--lexflow-verde-principal))]"
              )}
              onClick={() => handleStepClick(step)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleStepClick(step);
                }
              }}
            >
              {/* Step Number/Icon */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors",
                  step.completed
                    ? "bg-[hsl(var(--lexflow-verde-principal))] text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.completed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Step Icon */}
              <StepIcon
                className={cn(
                  "h-4 w-4 shrink-0",
                  step.completed
                    ? "text-[hsl(var(--lexflow-verde-principal))]"
                    : "text-muted-foreground/50"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
