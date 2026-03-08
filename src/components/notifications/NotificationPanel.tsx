import { useNavigate } from "react-router-dom";
import {
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "@/contexts/NotificationContext";
import { Loader2 } from "lucide-react";

export function NotificationPanel() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();

  const handleClick = async (id: string, referenciaId: string | null, referenciaTipo: string | null) => {
    await markAsRead(id);
    if (referenciaId && referenciaTipo === "contrato") {
      navigate(`/contratos/${referenciaId}`);
    } else {
      navigate("/alertas");
    }
  };

  return (
    <DropdownMenuContent align="end" className="w-80 p-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Notificações</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                onClick={markAllAsRead}
              >
                Marcar todas
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => handleClick(n.id, n.referencia_id, n.referencia_tipo)}
            />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => navigate("/alertas")}
            >
              Ver todos os alertas
            </Button>
          </div>
        </>
      )}
    </DropdownMenuContent>
  );
}
