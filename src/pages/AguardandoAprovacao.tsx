import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Clock, LogOut, Mail, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AguardandoAprovacao() {
  const { organization, refresh, loading } = useOrganization();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = "Aguardando aprovação | LexFlow";
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast.success("Status atualizado");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cadastro recebido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Sua empresa foi cadastrada com sucesso e está aguardando liberação pela equipe LexFlow.
            Você receberá um e-mail assim que o acesso for ativado.
          </p>

          {organization && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa cadastrada</p>
              <p className="font-semibold">{organization.nome}</p>
              {organization.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {organization.cnpj}</p>
              )}
            </div>
          )}

          <div className="rounded-lg bg-primary/5 p-4 flex gap-3 items-start">
            <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Precisa adiantar a liberação?</p>
              <p className="text-muted-foreground">
                Fale com a equipe comercial em{" "}
                <a href="mailto:contato@lexflowai.com.br" className="underline">
                  contato@lexflowai.com.br
                </a>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Verificar novamente
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
