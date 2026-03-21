import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, LogIn, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "accepted" | "error";

interface InviteDetails {
  organization_name: string;
  role: string;
  expires_at: string;
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    checkInviteAndAuth();
  }, [token]);

  const checkInviteAndAuth = async () => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      // Fetch invite details - query without join to avoid relationship issues
      const { data: invite, error } = await supabase
        .from("organization_invites")
        .select("id, email, role_in_org, expires_at, accepted_at, organization_id")
        .eq("token", token)
        .maybeSingle();

      console.log("Invite lookup result:", { invite, error });

      if (error || !invite) {
        setStatus("invalid");
        return;
      }

      if (invite.accepted_at) {
        setStatus("accepted");
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      // Check if authenticated user's email matches invite
      if (session) {
        const userEmail = session.user.email?.toLowerCase();
        const inviteEmail = invite.email.toLowerCase();

        if (userEmail !== inviteEmail) {
          toast({
            variant: "destructive",
            title: "Email diferente",
            description: `Este convite foi enviado para ${invite.email}. Faça login com esse email.`,
          });
          setStatus("invalid");
          return;
        }
      }

      // Fetch organization name separately
      const { data: org } = await supabase
        .from("organizations")
        .select("nome")
        .eq("id", invite.organization_id)
        .single();

      setInviteDetails({
        organization_name: org?.nome || "Organização",
        role: invite.role_in_org,
        expires_at: invite.expires_at,
      });
      setStatus("valid");
    } catch (err) {
      console.error("Error checking invite:", err);
      setStatus("error");
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_organization_invite", {
        invite_token: token,
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        throw new Error(result.error || "Falha ao aceitar convite");
      }

      toast({
        title: "Convite aceito!",
        description: `Você agora faz parte de ${inviteDetails?.organization_name}`,
      });

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast({
        variant: "destructive",
        title: "Erro ao aceitar convite",
        description: err.message || "Tente novamente",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    // Store token in sessionStorage to retrieve after login
    sessionStorage.setItem("pendingInviteToken", token!);
    navigate(`/auth?redirect=/aceitar-convite?token=${token}`);
  };

  const roleLabels: Record<string, string> = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
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
          <CardTitle className="text-2xl">Convite de Organização</CardTitle>
          <CardDescription>
            {status === "loading" && "Verificando convite..."}
            {status === "valid" && "Você foi convidado para uma organização"}
            {status === "invalid" && "Convite inválido"}
            {status === "expired" && "Convite expirado"}
            {status === "accepted" && "Convite já aceito"}
            {status === "error" && "Erro ao verificar convite"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === "valid" && inviteDetails && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Organização</p>
                  <p className="font-semibold text-lg">{inviteDetails.organization_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seu papel</p>
                  <p className="font-medium">{roleLabels[inviteDetails.role] || inviteDetails.role}</p>
                </div>
              </div>

              {isAuthenticated ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAcceptInvite}
                  disabled={accepting}
                >
                  {accepting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Aceitar Convite
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Faça login ou crie uma conta para aceitar o convite
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleLoginRedirect}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar / Criar Conta
                  </Button>
                </div>
              )}
            </>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-muted-foreground">
                Este link de convite é inválido ou o email não corresponde.
              </p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Ir para Login
              </Button>
            </div>
          )}

          {status === "expired" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-muted-foreground">
                Este convite expirou. Solicite um novo convite ao administrador.
              </p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Ir para Login
              </Button>
            </div>
          )}

          {status === "accepted" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Este convite já foi aceito anteriormente.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Ir para Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-muted-foreground">
                Ocorreu um erro ao verificar o convite. Tente novamente.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
