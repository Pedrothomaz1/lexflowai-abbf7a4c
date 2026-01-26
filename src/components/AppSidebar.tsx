import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield,
  FileStack,
  GitBranch,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Building2,
  ClipboardList,
  Wrench,
  Cog,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useModulo, ModuloAtivo } from "@/contexts/ModuloContext";
import { cn } from "@/lib/utils";
import logoVeridiana from "@/assets/logo-veridiana.png";
import { Badge } from "@/components/ui/badge";

// Menu items para módulo de Contratos
const contratosMenuItems = {
  principal: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"], hasBadge: false },
    { title: "Contratos", url: "/contratos", icon: FileText, roles: ["all"], hasBadge: false },
  ],
  gestao: [
    { title: "Obrigações", url: "/obrigacoes", icon: ClipboardList, roles: ["all"], hasBadge: true },
    { title: "Workflows", url: "/workflows", icon: GitBranch, roles: ["administrador"], hasBadge: false },
  ],
  configuracoes: [
    { title: "Templates", url: "/templates", icon: FileStack, roles: ["all"], hasBadge: false },
    { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"], hasBadge: false },
    { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"], hasBadge: false },
  ],
};

// Menu items para módulo de Serviços
const servicosMenuItems = {
  principal: [
    { title: "Dashboard", url: "/servicos", icon: LayoutDashboard, roles: ["all"], hasBadge: false },
    { title: "Serviços", url: "/servicos", icon: Wrench, roles: ["all"], hasBadge: false },
  ],
  gestao: [] as { title: string; url: string; icon: typeof LayoutDashboard; roles: string[]; hasBadge: boolean }[],
  configuracoes: [
    { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"], hasBadge: false },
    { title: "Unidades", url: "/unidades", icon: Building2, roles: ["all"], hasBadge: false },
    { title: "Especificações", url: "/especificacoes", icon: Cog, roles: ["all"], hasBadge: false },
    { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"], hasBadge: false },
  ],
};

const roleLabels: Record<string, string> = {
  administrador: "Administrador",
  analista_juridico: "Analista Jurídico",
  consultoria_juridica: "Consultoria Jurídica",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { userRole } = useUserRole();
  const { moduloAtivo, moduloPadrao, setModuloAtivo } = useModulo();
  const collapsed = state === "collapsed";
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [pendingObligations, setPendingObligations] = useState<number>(0);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single();
        setUserName(profile?.full_name || data.user.email?.split("@")[0] || "");
      }
    };
    getUser();
    fetchPendingObligations();
  }, []);

  const fetchPendingObligations = async () => {
    const { count } = await supabase
      .from("contract_obligations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");
    setPendingObligations(count || 0);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    } else {
      navigate("/auth");
    }
  };

  const handleModuloToggle = () => {
    const novoModulo: ModuloAtivo = moduloAtivo === "contratos" ? "servicos" : "contratos";
    setModuloAtivo(novoModulo);
    navigate(novoModulo === "contratos" ? "/dashboard" : "/servicos");
  };

  const menuItems = moduloAtivo === "contratos" ? contratosMenuItems : servicosMenuItems;

  const filterByRole = (items: typeof contratosMenuItems.principal) =>
    items.filter((item) => item.roles.includes("all") || (userRole && item.roles.includes(userRole)));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (url: string) => location.pathname === url;

  const accentColor = moduloAtivo === "contratos" 
    ? "hsl(var(--lexflow-verde-principal))" 
    : "hsl(var(--lexflow-mostarda))";

  return (
    <Sidebar className={cn("border-r-0", collapsed ? "w-16" : "w-64")}>
      {/* Header with Logo and Module Toggle */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--lexflow-off-white)/0.1)]">
            <img src={logoVeridiana} alt="Veridiana" className="h-6 w-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-sidebar-foreground">LexFlow</span>
              
              {moduloPadrao === "ambos" ? (
                <button
                  onClick={handleModuloToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    moduloAtivo === "contratos"
                      ? "bg-[hsl(var(--lexflow-verde-principal))] text-white focus-visible:ring-[hsl(var(--lexflow-verde-principal))]"
                      : "bg-[hsl(var(--lexflow-mostarda))] text-white focus-visible:ring-[hsl(var(--lexflow-mostarda))]"
                  )}
                >
                  <span className="text-[10px] opacity-80 uppercase tracking-wide">Módulo:</span>
                  <span>{moduloAtivo === "contratos" ? "Jurídico" : "Operacional"}</span>
                </button>
              ) : (
                <Badge 
                  className={cn(
                    "text-xs w-fit",
                    moduloAtivo === "contratos" 
                      ? "bg-[hsl(var(--lexflow-verde-principal)/0.2)] text-[hsl(var(--lexflow-verde-principal))]" 
                      : "bg-[hsl(var(--lexflow-mostarda)/0.2)] text-[hsl(var(--lexflow-mostarda))]"
                  )}
                >
                  {moduloAtivo === "contratos" ? "Jurídico" : "Operacional"}
                </Badge>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 scrollbar-thin">
        {/* Principal Group */}
        <SidebarGroup className="mb-2">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-medium text-[hsl(var(--lexflow-verde-claro)/0.6)] uppercase tracking-wider">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(menuItems.principal).map((item) => (
                <MenuItem 
                  key={item.title} 
                  item={item} 
                  collapsed={collapsed} 
                  isActive={isActive(item.url)}
                  moduloAtivo={moduloAtivo}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestão Group - Only for Contratos module */}
        {filterByRole(menuItems.gestao).length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-[hsl(var(--lexflow-verde-claro)/0.6)] uppercase tracking-wider">
                Gestão
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(menuItems.gestao).map((item) => (
                  <MenuItem 
                    key={item.title} 
                    item={item} 
                    collapsed={collapsed} 
                    isActive={isActive(item.url)}
                    moduloAtivo={moduloAtivo}
                    badge={item.hasBadge && pendingObligations > 0 ? pendingObligations : undefined}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configurações Group - Collapsible */}
        {filterByRole(menuItems.configuracoes).length > 0 && (
          <SidebarGroup className="mb-2">
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              {!collapsed && (
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="px-3 text-xs font-medium text-[hsl(var(--lexflow-verde-claro)/0.6)] uppercase tracking-wider flex items-center justify-between cursor-pointer hover:text-[hsl(var(--lexflow-verde-claro))] transition-colors">
                    <span>Cadastro</span>
                    {configOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filterByRole(menuItems.configuracoes).map((item) => (
                      <MenuItem 
                        key={item.title} 
                        item={item} 
                        collapsed={collapsed} 
                        isActive={isActive(item.url)}
                        moduloAtivo={moduloAtivo}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
            {/* Show items when collapsed */}
            {collapsed && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterByRole(menuItems.configuracoes).map((item) => (
                    <MenuItem 
                      key={item.title} 
                      item={item} 
                      collapsed={collapsed} 
                      isActive={isActive(item.url)}
                      moduloAtivo={moduloAtivo}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Sistema Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-medium text-[hsl(var(--lexflow-verde-claro)/0.6)] uppercase tracking-wider">
              Sistema
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem 
                item={{ title: "Configurações", url: "/settings", icon: Settings, roles: ["all"] }} 
                collapsed={collapsed} 
                isActive={isActive("/settings")}
                moduloAtivo={moduloAtivo}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                "hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback 
                  className="text-xs font-medium"
                  style={{ 
                    backgroundColor: accentColor,
                    color: 'white'
                  }}
                >
                  {getInitials(userName || "U")}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-sidebar-foreground truncate">
                      {userName}
                    </span>
                    <span className="text-xs text-[hsl(var(--lexflow-verde-claro))] truncate">
                      {roleLabels[userRole || ""] || "Usuário"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[hsl(var(--lexflow-verde-claro))] shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={collapsed ? "center" : "end"}
            side="top"
            className="w-56"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open("https://docs.lexflow.com.br", "_blank")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Central de Ajuda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Version */}
        {!collapsed && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-2xs text-[hsl(var(--lexflow-verde-claro)/0.5)]">
            <Building2 className="h-3 w-3" />
            <span>v1.1.0</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

interface MenuItemProps {
  item: { title: string; url: string; icon: typeof LayoutDashboard; roles: string[] };
  collapsed: boolean;
  isActive: boolean;
  moduloAtivo: ModuloAtivo;
  badge?: number;
}

function MenuItem({ item, collapsed, isActive, moduloAtivo, badge }: MenuItemProps) {
  const Icon = item.icon;

  const activeStyles = moduloAtivo === "contratos"
    ? "bg-[hsl(var(--lexflow-verde-principal)/0.15)] text-[hsl(var(--lexflow-verde-principal))]"
    : "bg-[hsl(var(--lexflow-mostarda)/0.15)] text-[hsl(var(--lexflow-mostarda))]";

  const iconActiveColor = moduloAtivo === "contratos"
    ? "text-[hsl(var(--lexflow-verde-principal))]"
    : "text-[hsl(var(--lexflow-mostarda))]";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
            "hover:bg-sidebar-accent/50",
            isActive
              ? cn(activeStyles, "font-medium")
              : "text-[hsl(var(--lexflow-off-white)/0.8)]",
            collapsed && "justify-center px-2"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", isActive && iconActiveColor)} />
          {!collapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {badge !== undefined && badge > 0 && (
                <Badge 
                  className="bg-[hsl(var(--lexflow-vinho))] text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center"
                >
                  {badge}
                </Badge>
              )}
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
