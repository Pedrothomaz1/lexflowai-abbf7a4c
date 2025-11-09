import { LayoutDashboard, FileText, Users, Settings, LogOut, Scale, Kanban, Shield, FileStack, Bell, Calendar, GitBranch } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"] },
  { title: "Contratos", url: "/contratos", icon: FileText, roles: ["all"] },
  { title: "Kanban", url: "/kanban", icon: Kanban, roles: ["all"] },
  { title: "Templates", url: "/templates", icon: FileStack, roles: ["all"] },
  { title: "Workflows", url: "/workflows", icon: GitBranch, roles: ["administrador"] },
  { title: "Alertas", url: "/alertas", icon: Bell, roles: ["all"] },
  { title: "Calendário", url: "/calendario", icon: Calendar, roles: ["all"] },
  { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"] },
  { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"] },
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useUserRole();
  const collapsed = state === "collapsed";

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

  // Filtrar itens do menu baseado no role do usuário
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes("all") || 
    (userRole && item.roles.includes(userRole))
  );

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/50"
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
