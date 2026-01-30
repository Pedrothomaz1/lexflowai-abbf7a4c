import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
}

export function HelpTooltip({
  text,
  side = "right",
  align = "center",
  className,
  iconClassName,
}: HelpTooltipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          aria-label="Ajuda"
        >
          <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className="max-w-[280px] text-sm"
      >
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface TitleWithHelpProps {
  title: string;
  helpText: string;
  className?: string;
  titleClassName?: string;
}

export function TitleWithHelp({
  title,
  helpText,
  className,
  titleClassName,
}: TitleWithHelpProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={titleClassName}>{title}</span>
      <HelpTooltip text={helpText} />
    </span>
  );
}
