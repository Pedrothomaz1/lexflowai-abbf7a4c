import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The Supabase client automatically handles the code exchange
        // when it detects the hash fragment in the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Erro ao obter sessão:", sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        if (!session) {
          // No session yet, wait for the auth state to change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (event === "SIGNED_IN" && newSession) {
                subscription.unsubscribe();
                await handlePostAuth(newSession.user.id);
              } else if (event === "SIGNED_OUT") {
                subscription.unsubscribe();
                navigate("/auth");
              }
            }
          );

          // Timeout if no auth event after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            navigate("/auth");
          }, 10000);
          return;
        }

        // Session exists, handle post-authentication
        await handlePostAuth(session.user.id);
      } catch (err) {
        console.error("Erro no callback de autenticação:", err);
        setError("Erro ao processar autenticação");
        setTimeout(() => navigate("/auth"), 3000);
      }
    };

    const handlePostAuth = async (userId: string) => {
      try {
        // Check if user has an organization membership
        const { data: membership, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (membershipError) {
          console.error("Erro ao verificar organização:", membershipError);
        }

        // If user has no organization, redirect to waiting page
        if (!membership) {
          navigate("/waiting-for-invite", { replace: true });
          return;
        }

        // User has organization, redirect based on module preference
        await redirectByModule(userId);
      } catch (err) {
        console.error("Erro no pós-autenticação:", err);
        navigate("/dashboard", { replace: true });
      }
    };

    const redirectByModule = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("modulo_padrao")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Erro ao buscar módulo:", error);
          navigate("/dashboard");
          return;
        }

        const modulo = data?.modulo_padrao || "contratos";

        switch (modulo) {
          case "servicos":
            navigate("/servicos", { replace: true });
            break;
          case "ambos":
            navigate("/seletor-modulo", { replace: true });
            break;
          case "contratos":
          default:
            navigate("/dashboard", { replace: true });
            break;
        }
      } catch (err) {
        console.error("Erro ao redirecionar:", err);
        navigate("/dashboard", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-destructive text-lg font-medium">
            Erro ao fazer login
          </div>
          <p className="text-muted-foreground text-sm">{error}</p>
          <p className="text-muted-foreground text-xs">
            Redirecionando para a página de login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground text-sm">
          Finalizando autenticação...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
