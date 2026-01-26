import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { GlobalHeader } from "./GlobalHeader";
import { useModulo } from "@/contexts/ModuloContext";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { moduloAtivo } = useModulo();
  
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
