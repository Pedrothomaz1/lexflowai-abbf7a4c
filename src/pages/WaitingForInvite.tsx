import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, LogOut, RefreshCw, Building2 } from "lucide-react";
import logoVeridiana from "@/assets/logo-veridiana.png";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";

const WaitingForInvite = () => {
  const navigate = useNavigate();
  const { refresh } = useOrganization();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCreateOrg = () => {
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <img src={logoVeridiana} alt="LexFlow" className="h-10 w-10 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl">Aguardando Convite</CardTitle>
          <CardDescription>
            Você ainda não faz parte de nenhuma organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Aguarde um convite</p>
                <p className="text-xs text-muted-foreground">
                  Um administrador da organização pode convidá-lo por e-mail
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleCreateOrg}
            >
              <Building2 className="h-4 w-4" />
              Criar Nova Organização
            </Button>

            <Button 
              variant="ghost" 
              className="w-full gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Verificar Novamente
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingForInvite;
