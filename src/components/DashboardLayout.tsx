import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { GlobalHeader } from "./GlobalHeader";
import { useModulo } from "@/contexts/ModuloContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { moduloAtivo } = useModulo();
  const { organization, loading } = useOrganization();

  // Show loading while fetching organization
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className={cn(
        "min-h-screen flex w-full bg-background",
        moduloAtivo === "servicos" && "modulo-servicos"
      )}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <GlobalHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
