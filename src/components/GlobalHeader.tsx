import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Moon, Sun, X, Calendar, Settings, LogOut, User, Building2, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { CommandPalette } from "@/components/CommandPalette";

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
  "/organization/settings": { title: "Configurações da Organização", description: "Dados da organização" },
  "/organization/members": { title: "Membros", description: "Gestão de membros" },
};

export function GlobalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);
  const currentRoute = routeTitles[location.pathname] || { title: "LexFlow" };

  useEffect(() => {
    // Check for system preference
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile) {
          setUserProfile(profile);
        }

        // Fetch 2FA status
        const { data: twoFA } = await supabase
          .from("user_2fa_settings")
          .select("is_enabled")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setIs2FAEnabled(twoFA?.is_enabled ?? false);
      }
      
      // Alertas agora gerenciados pelo NotificationContext
    };
    fetchData();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

      {/* Organization Badge */}
      {organization && (
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground truncate max-w-32">
            {organization.nome}
          </span>
        </div>
      )}

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

      {/* 2FA Security Indicator */}
      {is2FAEnabled !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings/two-factor")}
              className={cn(
                "h-9 w-9",
                is2FAEnabled
                  ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  : "text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
              )}
            >
              {is2FAEnabled ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              <span className="sr-only">Status 2FA</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {is2FAEnabled
              ? "2FA ativo — sua conta está protegida"
              : "2FA inativo — clique para ativar e proteger sua conta"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Calendar - Quick Access */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/calendario")}
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Calendar className="h-4 w-4" />
        <span className="sr-only">Calendário</span>
      </Button>

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
            {unreadCount > 0 && (
              <Badge
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-2xs",
                  "bg-destructive text-destructive-foreground border-0"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            <span className="sr-only">Notificações</span>
          </Button>
        </DropdownMenuTrigger>
        <NotificationPanel />
      </DropdownMenu>

      {/* User Avatar Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={userProfile?.avatar_url || undefined} 
                alt={userProfile?.full_name || "Usuário"} 
              />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getInitials(userProfile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={userProfile?.avatar_url || undefined} 
                alt={userProfile?.full_name || "Usuário"} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userProfile?.full_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {userProfile?.full_name || "Usuário"}
              </span>
              <span className="text-xs text-muted-foreground">Perfil</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
