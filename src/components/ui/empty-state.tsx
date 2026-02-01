import { cn } from "@/lib/utils";
import { LucideIcon, FileX, Search, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Link } from "react-router-dom";

interface SuggestionLink {
  label: string;
  href: string;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  suggestions?: SuggestionLink[];
  variant?: "default" | "search" | "error";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  suggestions,
  variant = "default",
  className,
}: EmptyStateProps) {
  const defaultIcons = {
    default: FileX,
    search: Search,
    error: AlertCircle,
  };

  const Icon = icon || defaultIcons[variant];

  const iconColors = {
    default: "text-muted-foreground",
    search: "text-primary",
    error: "text-destructive",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in",
        className
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
          variant === "error"
            ? "bg-destructive/10"
            : variant === "search"
            ? "bg-primary/10"
            : "bg-muted"
        )}
      >
        <Icon className={cn("h-8 w-8", iconColors[variant])} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mb-4">
          {action && (
            <Button onClick={action.onClick} size="sm" className="btn-cta">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Links úteis:</span>
          {suggestions.map((suggestion, index) => (
            <Link
              key={index}
              to={suggestion.href}
              className="text-primary hover:underline"
            >
              {suggestion.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
