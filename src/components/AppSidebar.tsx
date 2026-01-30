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
  Cog,
  Plus,
  Briefcase,
  FolderCog,
  Monitor,
  Activity,
  BarChart3,
  ShieldCheck,
  FileInput,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
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

// Interface para itens com submenus
interface MenuItemType {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  subItems?: { title: string; url: string; icon: typeof LayoutDashboard }[];
}

interface MenuSectionType {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  items: MenuItemType[];
  defaultOpen?: boolean;
}

// Menu sections para módulo de Contratos
const contratosMenuSections: MenuSectionType[] = [
  {
    id: "principal",
    title: "Principal",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"] },
    ],
  },
  {
    id: "gestao",
    title: "Gestão",
    icon: Briefcase,
    defaultOpen: true,
    items: [
      { 
        title: "Contratos", 
        url: "/contratos", 
        icon: FileText, 
        roles: ["all"],
        subItems: [
          { title: "Novo Contrato", url: "/contratos?novo=true", icon: Plus },
        ]
      },
      { title: "Franquias", url: "/franquias", icon: Building2, roles: ["all"] },
      { title: "Requisições", url: "/requisicoes", icon: FileInput, roles: ["all"] },
    ],
  },
  {
    id: "cadastro",
    title: "Cadastro",
    icon: FolderCog,
    defaultOpen: false,
    items: [
      { title: "Templates", url: "/templates", icon: FileStack, roles: ["all"] },
      { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"] },
      { title: "Workflows", url: "/workflows", icon: GitBranch, roles: ["administrador"] },
      { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"] },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    icon: Monitor,
    defaultOpen: false,
    items: [
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: ["all"] },
      { title: "Segurança", url: "/security", icon: Shield, roles: ["administrador"] },
      { title: "Compliance LGPD", url: "/compliance", icon: ShieldCheck, roles: ["administrador"] },
      { title: "Trilha de Auditoria", url: "/audit-logs", icon: Activity, roles: ["administrador"] },
      { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"] },
    ],
  },
];

// Menu sections para módulo de Serviços
const servicosMenuSections: MenuSectionType[] = [
  {
    id: "principal",
    title: "Principal",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/servicos", icon: LayoutDashboard, roles: ["all"] },
    ],
  },
  {
    id: "cadastro",
    title: "Cadastro",
    icon: FolderCog,
    defaultOpen: true,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"] },
      { title: "Unidades", url: "/unidades", icon: Building2, roles: ["all"] },
      { title: "Especificações", url: "/especificacoes", icon: Cog, roles: ["all"] },
      { title: "Usuários", url: "/usuarios", icon: Shield, roles: ["administrador"] },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    icon: Monitor,
    defaultOpen: false,
    items: [
      { title: "Configurações", url: "/settings", icon: Settings, roles: ["all"] },
    ],
  },
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
  const { moduloAtivo, moduloPadrao, setModuloAtivo } = useModulo();
  const collapsed = state === "collapsed";
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  
  const menuSections = moduloAtivo === "contratos" ? contratosMenuSections : servicosMenuSections;
  
  // Initialize section states based on current route and defaults
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuSections.forEach(section => {
      const hasActiveItem = section.items.some(item => 
        location.pathname === item.url.split("?")[0]
      );
      initial[section.id] = hasActiveItem || section.defaultOpen || false;
    });
    return initial;
  });

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

  // Auto-expand section when navigating to a route within it
  useEffect(() => {
    menuSections.forEach(section => {
      const hasActiveItem = section.items.some(item => 
        location.pathname === item.url.split("?")[0]
      );
      if (hasActiveItem && !openSections[section.id]) {
        setOpenSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [location.pathname]);

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

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const filterByRole = (items: MenuItemType[]) =>
    items.filter((item) => item.roles.includes("all") || (userRole && item.roles.includes(userRole)));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (url: string) => {
    const baseUrl = url.split("?")[0];
    return location.pathname === baseUrl;
  };

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

      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {menuSections.map((section) => {
          const filteredItems = filterByRole(section.items);
          if (filteredItems.length === 0) return null;

          const SectionIcon = section.icon;
          const isOpen = openSections[section.id];
          const hasActiveItem = filteredItems.some(item => isActive(item.url));

          return (
            <SidebarGroup key={section.id} className="mb-1">
              <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                <CollapsibleTrigger className="w-full group">
                  <div 
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all duration-200",
                      "cursor-pointer select-none",
                      hasActiveItem 
                        ? "text-[hsl(var(--lexflow-off-white))]" 
                        : "text-[hsl(var(--lexflow-verde-claro)/0.6)]",
                      "hover:text-[hsl(var(--lexflow-off-white))] hover:bg-sidebar-accent/30",
                      collapsed && "justify-center"
                    )}
                  >
                    <SectionIcon className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      hasActiveItem && moduloAtivo === "contratos" && "text-[hsl(var(--lexflow-verde-principal))]",
                      hasActiveItem && moduloAtivo === "servicos" && "text-[hsl(var(--lexflow-mostarda))]"
                    )} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{section.title}</span>
                        <div className="transition-transform duration-200">
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <SidebarGroupContent className={cn(!collapsed && "mt-1")}>
                    <SidebarMenu>
                      {filteredItems.map((item) => (
                        item.subItems && item.subItems.length > 0 ? (
                          <CollapsibleMenuItem 
                            key={item.title} 
                            item={item} 
                            collapsed={collapsed} 
                            isActive={isActive(item.url)}
                            moduloAtivo={moduloAtivo}
                          />
                        ) : (
                          <MenuItem 
                            key={item.title} 
                            item={item} 
                            collapsed={collapsed} 
                            isActive={isActive(item.url)}
                            moduloAtivo={moduloAtivo}
                          />
                        )
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>

                {/* Show icons only when collapsed */}
                {collapsed && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu>
                      {filteredItems.map((item) => (
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
              </Collapsible>
            </SidebarGroup>
          );
        })}
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
  item: MenuItemType;
  collapsed: boolean;
  isActive: boolean;
  moduloAtivo: ModuloAtivo;
}

function MenuItem({ item, collapsed, isActive, moduloAtivo }: MenuItemProps) {
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
            collapsed && "justify-center px-2",
            !collapsed && "ml-2"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", isActive && iconActiveColor)} />
          {!collapsed && <span className="flex-1">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface CollapsibleMenuItemProps {
  item: MenuItemType;
  collapsed: boolean;
  isActive: boolean;
  moduloAtivo: ModuloAtivo;
}

function CollapsibleMenuItem({ item, collapsed, isActive, moduloAtivo }: CollapsibleMenuItemProps) {
  const [open, setOpen] = useState(isActive);
  const Icon = item.icon;
  const navigate = useNavigate();

  const activeStyles = moduloAtivo === "contratos"
    ? "bg-[hsl(var(--lexflow-verde-principal)/0.15)] text-[hsl(var(--lexflow-verde-principal))]"
    : "bg-[hsl(var(--lexflow-mostarda)/0.15)] text-[hsl(var(--lexflow-mostarda))]";

  const iconActiveColor = moduloAtivo === "contratos"
    ? "text-[hsl(var(--lexflow-verde-principal))]"
    : "text-[hsl(var(--lexflow-mostarda))]";

  if (!item.subItems || item.subItems.length === 0) {
    return <MenuItem item={item} collapsed={collapsed} isActive={isActive} moduloAtivo={moduloAtivo} />;
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={cn(!collapsed && "ml-2")}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                "hover:bg-sidebar-accent/50",
                isActive
                  ? cn(activeStyles, "font-medium")
                  : "text-[hsl(var(--lexflow-off-white)/0.8)]",
                collapsed && "justify-center px-2"
              )}
              onClick={(e) => {
                if (!collapsed) {
                  navigate(item.url.split("?")[0]);
                }
              }}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && iconActiveColor)} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(!open);
                    }}
                    className="p-1 hover:bg-sidebar-accent rounded transition-colors"
                  >
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                </>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        {!collapsed && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-sidebar-border/50 pl-3">
              {item.subItems.map((subItem) => (
                <NavLink
                  key={subItem.title}
                  to={subItem.url}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-200",
                    "hover:bg-sidebar-accent/50 text-[hsl(var(--lexflow-off-white)/0.7)]",
                    "hover:text-[hsl(var(--lexflow-off-white))] hover:translate-x-0.5"
                  )}
                >
                  <subItem.icon className="h-3.5 w-3.5" />
                  <span>{subItem.title}</span>
                </NavLink>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </SidebarMenuItem>
  );
}
