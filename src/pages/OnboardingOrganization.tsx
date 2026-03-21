import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Scale } from "lucide-react";

const OnboardingOrganization = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nome = e.target.value;
    setFormData({
      nome,
      slug: generateSlug(nome),
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      slug: generateSlug(e.target.value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado",
      });
      return;
    }

    if (!formData.nome.trim() || !formData.slug.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome e identificador são obrigatórios",
      });
      return;
    }

    try {
      setLoading(true);

      // Garantir que a sessão atual existe e que o access_token será enviado no request.
      // (Sem o Authorization, auth.uid() pode ficar nulo no banco e disparar RLS.)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        toast({
          variant: "destructive",
          title: "Sessão expirada",
          description: "Faça login novamente para criar sua organização.",
        });
        navigate("/auth", { replace: true });
        return;
      }

      // Cliente efêmero com header Authorization explícito (evita inconsistências de sessão em iframe).
      const authedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

      // Generate org id on client to avoid RETURNING hitting RLS SELECT policy (which fails because membership does not yet exist)
      const orgId = crypto.randomUUID();

      // Create organization without RETURNING (.select())
      const { error: orgError } = await authedSupabase
        .from("organizations")
        .insert({
          id: orgId,
          nome: formData.nome.trim(),
          slug: formData.slug.trim(),
        });

      if (orgError) {
        if (orgError.code === "23505") {
          toast({
            variant: "destructive",
            title: "Identificador já existe",
            description: "Escolha outro identificador para sua organização",
          });
        } else {
          throw orgError;
        }
        return;
      }

      // Add current user as owner
      const { error: memberError } = await authedSupabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role_in_org: "owner",
          is_active: true,
        });

      if (memberError) {
        throw memberError;
      }

      toast({
        title: "Organização criada!",
        description: "Sua organização foi configurada com sucesso.",
      });

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Error creating organization:", err);
      toast({
        variant: "destructive",
        title: "Erro ao criar organização",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setLoading(false);
    }
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
          <CardTitle className="text-2xl">Criar Organização</CardTitle>
          <CardDescription>
            Configure sua organização para começar a usar o LexFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Organização</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  placeholder="Minha Empresa Ltda"
                  value={formData.nome}
                  onChange={handleNameChange}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Identificador Único</Label>
              <Input
                id="slug"
                placeholder="minha-empresa"
                value={formData.slug}
                onChange={handleSlugChange}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Usado na URL: lexflow.com.br/{formData.slug || "identificador"}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Organização"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingOrganization;
