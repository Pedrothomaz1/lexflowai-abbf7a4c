import { cn } from "@/lib/utils";
import { Bell, Clock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import type { Notification } from "@/contexts/NotificationContext";

const tipoConfig = {
  vencimento: { icon: Clock, color: "text-amber-500" },
  status_change: { icon: FileText, color: "text-blue-500" },
  aprovacao: { icon: CheckCircle2, color: "text-green-500" },
  obrigacao: { icon: AlertTriangle, color: "text-red-500" },
  geral: { icon: Bell, color: "text-muted-foreground" },
};

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = tipoConfig[notification.tipo] ?? tipoConfig.geral;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors",
        !notification.lida && "bg-primary/5"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", !notification.lida && "font-medium")}>
          {notification.titulo}
        </p>
        {notification.mensagem && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.mensagem}
          </p>
        )}
        <p className="text-2xs text-muted-foreground mt-1">
          {new Date(notification.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {!notification.lida && (
        <div className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  );
}
