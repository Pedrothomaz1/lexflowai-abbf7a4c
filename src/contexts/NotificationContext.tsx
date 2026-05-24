import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notification {
  id: string;
  tipo: "vencimento" | "status_change" | "aprovacao" | "obrigacao" | "geral";
  titulo: string;
  mensagem: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  lida: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  loading: true,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Canal Realtime — padrão já usado em ContractComments e ContractSignature
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nova = payload.new as Notification;
          setNotifications((prev) => [nova, ...prev]);
          toast(nova.titulo, {
            description: nova.mensagem ?? undefined,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const atualizada = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === atualizada.id ? atualizada : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, loading }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
