import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2, ShieldAlert } from "lucide-react";
import OrganizacoesTab from "./OrganizacoesTab";
import UsuariosTab from "./UsuariosTab";
import MetricasTab from "./MetricasTab";

export default function SuperAdminPage() {
  const { isSuperAdmin, loading } = useSuperAdmin();

  useEffect(() => {
    document.title = "Super Admin | LexFlow";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-muted-foreground">
            Esta área é exclusiva para gestores da plataforma LexFlow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Painel Super Admin</h1>
          <p className="text-muted-foreground">
            Gerencie todas as organizações e usuários da plataforma LexFlow.
          </p>
        </header>

        <Tabs defaultValue="organizacoes">
          <TabsList>
            <TabsTrigger value="organizacoes">Organizações</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
          </TabsList>
          <TabsContent value="organizacoes" className="mt-6">
            <OrganizacoesTab />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-6">
            <UsuariosTab />
          </TabsContent>
          <TabsContent value="metricas" className="mt-6">
            <MetricasTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
