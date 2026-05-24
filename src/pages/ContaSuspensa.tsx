import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Ban, LogOut, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ContaSuspensa() {
  const { organization } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Conta suspensa | LexFlow";
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Conta suspensa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            O acesso da sua empresa ao LexFlow está suspenso no momento.
          </p>

          {organization && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
              <p className="font-semibold">{organization.nome}</p>
              {organization.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {organization.cnpj}</p>
              )}
              {organization.motivo_suspensao && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Motivo</p>
                  <p className="text-sm">{organization.motivo_suspensao}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-primary/5 p-4 flex gap-3 items-start">
            <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Para reativar o acesso</p>
              <p className="text-muted-foreground">
                Entre em contato em{" "}
                <a href="mailto:contato@lexflowai.com.br" className="underline">
                  contato@lexflowai.com.br
                </a>
                .
              </p>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
