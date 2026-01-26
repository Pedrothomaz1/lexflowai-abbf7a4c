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
  HelpCircle,
  Building2,
  ClipboardList,
  Wrench,
  DollarSign,
  ArrowLeftRight,
  Cog,
  Check,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useModulo, ModuloAtivo } from "@/contexts/ModuloContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logoVeridiana from "@/assets/logo-veridiana.png";
import { Badge } from "@/components/ui/badge";

// Menu items para módulo de Contratos - Blueprint structure
const contratosMenuItems = [
  // Operação
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"], group: "operacao" },
  { title: "Contratos", url: "/contratos", icon: FileText, roles: ["all"], group: "operacao" },
  // Controle
  { title: "Obrigações", url: "/obrigacoes", icon: ClipboardList, roles: ["all"], group: "controle" },
  { title: "Workflows", url: "/workflows", icon: GitBranch, roles: ["administrador"], group: "controle" },
  // Admin Central
  { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"], group: "admin" },
  { title: "Templates", url: "/templates", icon: FileStack, roles: ["all"], group: "admin" },
  { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"], group: "admin" },
];

// Menu items para módulo de Serviços - Blueprint structure
const servicosMenuItems = [
  // Operação
  { title: "Dashboard", url: "/servicos", icon: LayoutDashboard, roles: ["all"], group: "operacao" },
  { title: "Serviços", url: "/servicos", icon: Wrench, roles: ["all"], group: "operacao" },
  // Admin Central
  { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"], group: "admin" },
  { title: "Unidades", url: "/unidades", icon: Building2, roles: ["all"], group: "admin" },
  { title: "Especificações", url: "/especificacoes", icon: Cog, roles: ["all"], group: "admin" },
  { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"], group: "admin" },
];

// Menu items compartilhados (sistema)
const sistemaMenuItems = [
  { title: "Custos", url: "/custos", icon: DollarSign, roles: ["administrador"], group: "sistema" },
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"], group: "sistema" },
];

const roleLabels: Record<string, string> = {
  administrador: "Administrador",
  analista_juridico: "Analista Jurídico",
  consultoria_juridica: "Consultoria Jurídica",
};

const moduloLabels: Record<ModuloAtivo, string> = {
  contratos: "Contratos",
  servicos: "Serviços",
  ambos: "Ambos",
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
  }, []);

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

  const handleModuloChange = (novoModulo: ModuloAtivo) => {
    if (novoModulo === moduloAtivo) return;
    setModuloAtivo(novoModulo);
    navigate(novoModulo === "contratos" ? "/dashboard" : "/servicos");
  };

  // Determinar quais menus mostrar baseado no módulo ativo
  const menuItems = moduloAtivo === "contratos" ? contratosMenuItems : servicosMenuItems;

  const visibleMenuItems = menuItems.filter(
    (item) => item.roles.includes("all") || (userRole && item.roles.includes(userRole))
  );

  const visibleSistemaItems = sistemaMenuItems.filter(
    (item) => item.roles.includes("all") || (userRole && item.roles.includes(userRole))
  );

  const groupedItems = {
    operacao: visibleMenuItems.filter((item) => item.group === "operacao"),
    controle: visibleMenuItems.filter((item) => item.group === "controle"),
    admin: visibleMenuItems.filter((item) => item.group === "admin"),
    sistema: visibleSistemaItems,
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className={cn("border-r-0", collapsed ? "w-16" : "w-64")}>
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/10">
            <img src={logoVeridiana} alt="Veridiana" className="h-6 w-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">LexFlow</span>
              
              {moduloPadrao === "ambos" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 mt-0.5 group focus:outline-none">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-2xs cursor-pointer transition-colors",
                          moduloAtivo === "contratos" 
                            ? "bg-[hsl(153_13%_56%/0.2)] text-[hsl(153_13%_70%)]" 
                            : "bg-[hsl(35_58%_61%/0.2)] text-[hsl(35_58%_75%)]"
                        )}
                      >
                        {moduloLabels[moduloAtivo]}
                        <ChevronDown className="h-3 w-3 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem 
                      onClick={() => handleModuloChange("contratos")}
                      className="flex items-center justify-between"
                    >
                      <span>Contratos</span>
                      {moduloAtivo === "contratos" && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleModuloChange("servicos")}
                      className="flex items-center justify-between"
                    >
                      <span>Serviços</span>
                      {moduloAtivo === "servicos" && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-2xs w-fit mt-0.5",
                    moduloAtivo === "contratos" 
                      ? "bg-[hsl(153_13%_56%/0.2)] text-[hsl(153_13%_70%)]" 
                      : "bg-[hsl(35_58%_61%/0.2)] text-[hsl(35_58%_75%)]"
                  )}
                >
                  {moduloLabels[moduloAtivo]}
                </Badge>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 scrollbar-thin">
        {/* Operação Group */}
        {groupedItems.operacao.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Operação
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.operacao.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Controle Group - Only for Contratos module */}
        {groupedItems.controle.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Controle
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.controle.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Central Group */}
        {groupedItems.admin.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Admin Central
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.admin.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Sistema Group */}
        {groupedItems.sistema.length > 0 && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Sistema
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.sistema.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                  {getInitials(userName || "U")}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-sidebar-foreground truncate">
                      {userName}
                    </span>
                    <span className="text-xs text-sidebar-muted truncate">
                      {roleLabels[userRole || ""] || "Usuário"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-muted shrink-0" />
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
            {moduloPadrao === "ambos" && (
              <>
                <DropdownMenuItem onClick={() => handleModuloChange(moduloAtivo === "contratos" ? "servicos" : "contratos")}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Trocar Módulo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
          <div className="mt-2 flex items-center justify-center gap-1.5 text-2xs text-sidebar-muted">
            <Building2 className="h-3 w-3" />
            <span>v1.1.0</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

interface MenuItemProps {
  item: { title: string; url: string; icon: typeof LayoutDashboard; roles: string[]; group: string };
  collapsed: boolean;
  isActive: boolean;
}

function MenuItem({ item, collapsed, isActive }: MenuItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
            "hover:bg-sidebar-accent/50",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
              : "text-sidebar-foreground/80",
            collapsed && "justify-center px-2"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
