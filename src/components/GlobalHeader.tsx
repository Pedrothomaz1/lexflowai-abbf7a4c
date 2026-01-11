import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Moon, Sun, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const routeTitles: Record<string, { title: string; description?: string }> = {
  "/dashboard": { title: "Dashboard", description: "Visão geral do sistema" },
  "/contratos": { title: "Contratos", description: "Gestão de contratos" },
  "/kanban": { title: "Kanban", description: "Visualização em quadros" },
  "/templates": { title: "Templates", description: "Modelos de contratos" },
  "/workflows": { title: "Workflows", description: "Fluxos de aprovação" },
  "/alertas": { title: "Alertas", description: "Notificações e lembretes" },
  "/calendario": { title: "Calendário", description: "Agenda de vencimentos" },
  "/fornecedores": { title: "Fornecedores", description: "Cadastro de parceiros" },
  "/usuarios": { title: "Usuários", description: "Gestão de acessos" },
  "/settings": { title: "Configurações", description: "Preferências do sistema" },
};

export function GlobalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const currentRoute = routeTitles[location.pathname] || { title: "LexFlow" };

  useEffect(() => {
    // Check for system preference
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    // Fetch pending alerts count
    const fetchAlerts = async () => {
      const { count } = await supabase
        .from("contract_alerts")
        .select("*", { count: "exact", head: true })
        .eq("enviado", false);
      setPendingAlerts(count || 0);
    };
    fetchAlerts();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/contratos?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 lg:px-6">
      <SidebarTrigger className="shrink-0" />

      {/* Page Title - Hidden on Mobile */}
      <div className="hidden md:flex flex-col min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">
          {currentRoute.title}
        </h1>
        {currentRoute.description && (
          <p className="text-xs text-muted-foreground truncate">
            {currentRoute.description}
          </p>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contratos..."
              className="w-64 pl-9 pr-8 h-9 text-sm bg-muted/50 border-muted"
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Buscar</span>
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-2xs text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </div>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="sr-only">Alternar tema</span>
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {pendingAlerts > 0 && (
              <Badge
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-2xs",
                  "bg-destructive text-destructive-foreground border-0"
                )}
              >
                {pendingAlerts > 9 ? "9+" : pendingAlerts}
              </Badge>
            )}
            <span className="sr-only">Notificações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium">Notificações</span>
            {pendingAlerts > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingAlerts} pendente{pendingAlerts !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {pendingAlerts === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação pendente
            </div>
          ) : (
            <div className="py-2">
              <DropdownMenuItem
                onClick={() => navigate("/alertas")}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Ver todos os alertas</span>
                  <span className="text-xs text-muted-foreground">
                    {pendingAlerts} alerta{pendingAlerts !== 1 ? "s" : ""} aguardando ação
                  </span>
                </div>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
