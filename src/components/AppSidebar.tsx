import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Kanban,
  Shield,
  FileStack,
  Bell,
  Calendar,
  GitBranch,
  ChevronDown,
  HelpCircle,
  Building2,
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
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logoVeridiana from "@/assets/logo-veridiana.png";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"], group: "principal" },
  { title: "Contratos", url: "/contratos", icon: FileText, roles: ["all"], group: "principal" },
  { title: "Kanban", url: "/kanban", icon: Kanban, roles: ["all"], group: "principal" },
  { title: "Templates", url: "/templates", icon: FileStack, roles: ["all"], group: "principal" },
  { title: "Workflows", url: "/workflows", icon: GitBranch, roles: ["administrador"], group: "gestao" },
  { title: "Alertas", url: "/alertas", icon: Bell, roles: ["all"], group: "gestao" },
  { title: "Calendário", url: "/calendario", icon: Calendar, roles: ["all"], group: "gestao" },
  { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"], group: "cadastros" },
  { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"], group: "cadastros" },
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"], group: "sistema" },
];

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
  const collapsed = state === "collapsed";
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || "");
        // Try to get profile name
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

  const visibleMenuItems = menuItems.filter(
    (item) => item.roles.includes("all") || (userRole && item.roles.includes(userRole))
  );

  const groupedItems = {
    principal: visibleMenuItems.filter((item) => item.group === "principal"),
    gestao: visibleMenuItems.filter((item) => item.group === "gestao"),
    cadastros: visibleMenuItems.filter((item) => item.group === "cadastros"),
    sistema: visibleMenuItems.filter((item) => item.group === "sistema"),
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
              <span className="text-xs text-sidebar-muted">Gestão de Contratos</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 scrollbar-thin">
        {/* Principal Group */}
        {groupedItems.principal.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Principal
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.principal.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Gestão Group */}
        {groupedItems.gestao.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Gestão
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.gestao.map((item) => (
                  <MenuItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Cadastros Group */}
        {groupedItems.cadastros.length > 0 && (
          <SidebarGroup className="mb-2">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                Cadastros
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedItems.cadastros.map((item) => (
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
            <span>v1.0.0</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

interface MenuItemProps {
  item: (typeof menuItems)[0];
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
