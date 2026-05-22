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
  
  Building2,
  Cog,
  Plus,
  Briefcase,
  Monitor,
  Activity,
  BarChart3,
  ShieldCheck,
  FileInput,
  UserCog,
  Building,
  Bell,
  Database,
  Workflow,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { handleDbError } from "@/utils/dbErrorHandler";
import { SuperAdminGate } from "@/components/auth/Can";
import { ShieldAlert } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useAprovacoesPendentesCount } from "@/hooks/useAprovacoes";

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

// Menu sections para módulo de Contratos — Hierarquia enterprise CLM
const contratosMenuSections: MenuSectionType[] = [
  {
    id: "principal",
    title: "Principal",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["all"] },
      { title: "Requisições", url: "/requisicoes", icon: FileInput, roles: ["all"] },
      {
        title: "Contratos",
        url: "/contratos",
        icon: FileText,
        roles: ["all"],
        subItems: [{ title: "Novo Contrato", url: "/contratos?novo=true", icon: Plus }],
      },
      {
        title: "Franquias",
        url: "/franquias",
        icon: Building2,
        roles: ["all"],
        subItems: [{ title: "Nova Franquia", url: "/franquias?nova=true", icon: Plus }],
      },
      { title: "Minhas Aprovações", url: "/aprovacoes", icon: ShieldCheck, roles: ["all"] },
      { title: "Aprovações", url: "/workflows", icon: ShieldCheck, roles: ["all"] },
      { title: "Obrigações", url: "/obrigacoes", icon: Activity, roles: ["all"] },
      { title: "Alertas e Prazos", url: "/alertas", icon: Bell, roles: ["all"] },
    ],
  },
  {
    id: "base",
    title: "Base",
    icon: Database,
    defaultOpen: false,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"] },
      { title: "Unidades", url: "/unidades", icon: Building2, roles: ["administrador"] },
      { title: "Modelos de Contrato", url: "/templates", icon: FileStack, roles: ["administrador"] },
    ],
  },
  {
    id: "automacao",
    title: "Automação",
    icon: Workflow,
    defaultOpen: false,
    items: [
      { title: "Fluxos de Aprovação", url: "/workflows", icon: GitBranch, roles: ["administrador"] },
      { title: "Construtor de Workflows", url: "/workflows/builder", icon: GitBranch, roles: ["administrador"] },
      { title: "Construtor de Formulários", url: "/forms/builder", icon: GitBranch, roles: ["administrador"] },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios & Governança",
    icon: BarChart3,
    defaultOpen: false,
    items: [
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: ["administrador"] },
      { title: "Dashboard IA", url: "/dashboard-ia", icon: Sparkles, roles: ["administrador"] },
      { title: "Calendário", url: "/calendario", icon: Monitor, roles: ["all"] },
      { title: "Histórico de Ações", url: "/audit-logs", icon: Activity, roles: ["administrador"] },
      { title: "Segurança", url: "/security", icon: Shield, roles: ["administrador"] },
      { title: "Proteção de Dados", url: "/compliance", icon: ShieldCheck, roles: ["administrador"] },
    ],
  },
  {
    id: "portal",
    title: "Portal Externo",
    icon: Briefcase,
    defaultOpen: false,
    items: [
      { title: "Link Público de Requisição", url: "/requisicao", icon: FileInput, roles: ["administrador"] },
    ],
  },
  {
    id: "administracao",
    title: "Administração",
    icon: Cog,
    defaultOpen: false,
    items: [
      { title: "Usuários & Papéis", url: "/usuarios", icon: UserCog, roles: ["administrador"] },
      { title: "Permissões", url: "/admin/permissoes", icon: ShieldCheck, roles: ["administrador"] },
      { title: "Organização", url: "/organization/settings", icon: Building, roles: ["administrador"] },
      { title: "Membros", url: "/organization/members", icon: Users, roles: ["administrador"] },
    ],
  },
];

// Items do menu do usuário (dropdown no footer) - padrão Vektor Flow
const userSettingsItems = [
  { title: "Meu Perfil", url: "/settings", icon: Settings },
  { title: "Autenticação 2FA", url: "/settings/2fa", icon: Shield },
];

const adminSettingsItems = [
  { title: "Usuários & Papéis", url: "/usuarios", icon: UserCog },
  { title: "Permissões", url: "/admin/permissoes", icon: ShieldCheck },
  { title: "Logs de Auditoria", url: "/audit-logs", icon: Activity },
];

// Menu sections para módulo de Serviços - Hierarquia Gestor-First
const servicosMenuSections: MenuSectionType[] = [
  {
    id: "principal",
    title: "Principal",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Visão Geral", url: "/servicos", icon: LayoutDashboard, roles: ["all"] },
      { title: "Novo Serviço", url: "/servicos?novo=true", icon: Plus, roles: ["all"] },
    ],
  },
  {
    id: "base",
    title: "Base",
    icon: Database,
    defaultOpen: true,
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: Users, roles: ["all"] },
      { title: "Unidades", url: "/unidades", icon: Building2, roles: ["all"] },
      { 
        title: "Especificações", 
        url: "/especificacoes", 
        icon: Cog, 
        roles: ["all"],
      },
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
  const { organization, isOrgAdmin } = useOrganization();
  const collapsed = state === "collapsed";
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  
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
          .select("full_name, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle();

        setUserName(profile?.full_name || data.user.email?.split("@")[0] || "");
        setUserAvatarUrl(profile?.avatar_url || null);
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
        description: handleDbError(error).message,
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
    items.filter((item) => {
      // Handle org_admin role check
      if (item.roles.includes("org_admin")) {
        return isOrgAdmin;
      }
      return item.roles.includes("all") || (userRole && item.roles.includes(userRole));
    });

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

  const accentColor = "hsl(var(--lexflow-verde-principal))";

  return (
    <Sidebar className={cn("border-r-0", collapsed ? "w-16" : "w-64")}>
      {/* Header with Logo and Module Toggle */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--lexflow-off-white)/0.1)]">
            <Scale className="h-5 w-5 text-sidebar-foreground" />
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
                      : "bg-[hsl(var(--lexflow-verde-principal))] text-white focus-visible:ring-[hsl(var(--lexflow-verde-principal))]"
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
                      : "bg-[hsl(var(--lexflow-verde-principal)/0.2)] text-[hsl(var(--lexflow-verde-principal))]"
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
                      hasActiveItem && moduloAtivo === "servicos" && "text-[hsl(var(--lexflow-verde-principal))]"
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
                 <AvatarImage src={userAvatarUrl || undefined} alt={userName || "Usuário"} />
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
            {userSettingsItems.map((item) => (
              <DropdownMenuItem key={item.url + item.title} onClick={() => navigate(item.url)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </DropdownMenuItem>
            ))}
            {userRole === "administrador" && (
              <>
                <DropdownMenuSeparator />
                {adminSettingsItems.map((item) => (
                  <DropdownMenuItem key={item.url} onClick={() => navigate(item.url)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <SuperAdminGate>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/super-admin")}>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Super Admin
              </DropdownMenuItem>
            </SuperAdminGate>
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
            <span>v1.2.0</span>
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

  const activeStyles = "bg-[hsl(var(--lexflow-verde-principal)/0.15)] text-[hsl(var(--lexflow-verde-principal))]";
  const iconActiveColor = "text-[hsl(var(--lexflow-verde-principal))]";

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
          {!collapsed && item.url === "/aprovacoes" && <AprovacoesBadge />}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AprovacoesBadge() {
  const { data: count } = useAprovacoesPendentesCount();
  if (!count) return null;
  return (
    <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-[hsl(var(--lexflow-mostarda))] text-black hover:bg-[hsl(var(--lexflow-mostarda))]">
      {count}
    </Badge>
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

  const activeStyles = "bg-[hsl(var(--lexflow-verde-principal)/0.15)] text-[hsl(var(--lexflow-verde-principal))]";

  const iconActiveColor = "text-[hsl(var(--lexflow-verde-principal))]";

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
