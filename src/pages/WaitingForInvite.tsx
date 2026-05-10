import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, LogOut, RefreshCw, Building2, Loader2, Scale } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const WaitingForInvite = () => {
  const navigate = useNavigate();
  const { refresh } = useOrganization();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // First, check if there's a pending invite for the user
      const { data: inviteCheck, error: inviteError } = await supabase.rpc(
        "check_pending_invite_for_user"
      );

      if (!inviteError && inviteCheck?.has_invite) {
        // Auto-accept the invite
        const { data: acceptResult, error: acceptError } = await supabase.rpc(
          "accept_organization_invite",
          { invite_token: inviteCheck.token }
        );

        if (!acceptError && acceptResult?.success) {
          toast({
            title: "Convite aceito!",
            description: `Você foi adicionado a ${inviteCheck.organization_name}`,
          });
          navigate("/dashboard", { replace: true });
          return;
        }
      }

      // Refresh organization context
      await refresh();
      
      // Check if now has an organization
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (membership) {
          navigate("/dashboard", { replace: true });
          return;
        }
      }

      toast({
        title: "Nenhum convite encontrado",
        description: "Você ainda não foi convidado para nenhuma organização.",
      });
    } catch (err) {
      console.error("Error checking invites:", err);
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-8 w-8 text-primary" />
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
                  Um administrador pode convidá-lo por e-mail. Verifique sua caixa de entrada.
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
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verificar Convites
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
