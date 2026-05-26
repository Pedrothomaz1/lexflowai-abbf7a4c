import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  FileSignature,
  Bell,
  DollarSign
} from "lucide-react";
import { AvatarUpload } from "@/components/Settings/AvatarUpload";
import { ChangePasswordCard } from "@/components/Settings/ChangePasswordCard";
import { SettingsIntegracaoCard } from "@/components/Settings/SettingsIntegracaoCard";
import { handleDbError } from "@/utils/dbErrorHandler";

interface IntegracaoConfig {
  id: string;
  tipo: string;
  nome: string;
  url_api: string | null;
  tipo_autenticacao: string | null;
  headers_customizados: Record<string, string> | null;
  is_active: boolean;
  ultimo_teste: string | null;
  status_ultimo_teste: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const { userRole, isAnalista, isAdmin } = useUserRole();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    avatar_url: null as string | null,
  });

  // Integration state
  const [integracaoConfig, setIntegracaoConfig] = useState<IntegracaoConfig | null>(null);
  const [loadingIntegracao, setLoadingIntegracao] = useState(true);
  const [savingIntegracao, setSavingIntegracao] = useState(false);
  const [testingIntegracao, setTestingIntegracao] = useState(false);
  const [integracaoForm, setIntegracaoForm] = useState({
    url_api: "",
    tipo_autenticacao: "api_key",
    is_active: false,
  });

  useEffect(() => {
    fetchProfile();
    if (isAdmin) {
      fetchIntegracaoConfig();
    } else {
      setLoadingIntegracao(false);
    }
  }, [isAdmin]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
        avatar_url: profile.avatar_url || null,
      });
    }
  };

  const fetchIntegracaoConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("integracao_config")
        .select("*")
        .eq("tipo", "sistema_compras")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setIntegracaoConfig(data);
        setIntegracaoForm({
          url_api: data.url_api || "",
          tipo_autenticacao: data.tipo_autenticacao || "api_key",
          is_active: data.is_active,
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar configuração:", error);
    } finally {
      setLoadingIntegracao(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        department: formData.department,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: handleDbError(error).message,
      });
    } else {
      toast({
        title: "Perfil atualizado com sucesso!",
      });
    }

    setLoading(false);
  };

  const handleSaveIntegracao = async () => {
    setSavingIntegracao(true);
    try {
      const payload: any = {
        tipo: "sistema_compras",
        nome: "Sistema de Compras Interno",
        url_api: integracaoForm.url_api || null,
        tipo_autenticacao: integracaoForm.tipo_autenticacao,
        is_active: integracaoForm.is_active,
      };

      // Check if record already exists
      const { data: existing } = await supabase
        .from("integracao_config")
        .select("id")
        .eq("tipo", "sistema_compras")
        .eq("organization_id", organization?.id)
        .maybeSingle();

      const recordId = existing?.id || integracaoConfig?.id;
      if (recordId) {
        const { error } = await supabase
          .from("integracao_config")
          .update(payload)
          .eq("id", recordId);
        if (error) throw error;
      } else {
        payload.organization_id = organization?.id;
        const { data: inserted, error } = await supabase
          .from("integracao_config")
          .insert(payload)
          .select("id")
          .maybeSingle();
        if (error) {
          // If duplicate key, try updating instead
          if (error.code === '23505') {
            const { error: updateError } = await supabase
              .from("integracao_config")
              .update(payload)
              .eq("tipo", "sistema_compras")
              .eq("organization_id", organization?.id);
            if (updateError) throw updateError;
          } else {
            throw error;
          }
        }
      }

      toast({ title: "Configuração salva com sucesso!" });
      fetchIntegracaoConfig();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: handleDbError(error).message,
      });
    } finally {
      setSavingIntegracao(false);
    }
  };

  const handleTestIntegracao = async () => {
    if (!integracaoForm.url_api) {
      toast({
        variant: "destructive",
        title: "URL não configurada",
        description: "Informe a URL da API antes de testar.",
      });
      return;
    }

    setTestingIntegracao(true);
    try {
      const { data, error } = await supabase.functions.invoke("testar-conexao-compras", {
        body: {
          url: integracaoForm.url_api,
          tipo_autenticacao: integracaoForm.tipo_autenticacao,
          organization_id: organization?.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Conexão testada com sucesso!", description: data.message });
      } else {
        toast({
          variant: "destructive",
          title: "Falha na conexão",
          description: data?.message || "Não foi possível conectar à API.",
        });
      }
      fetchIntegracaoConfig();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Não foi possível conectar à API. Verifique a URL e tente novamente.",
      });
      fetchIntegracaoConfig();
    } finally {
      setTestingIntegracao(false);
    }
  };

  const getRoleBadge = () => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      analista_juridico: { label: "Analista Jurídico", variant: "secondary" },
      administrador: { label: "Administrador", variant: "outline" },
    };

    if (!userRole) return null;
    const { label, variant } = config[userRole];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e dados pessoais
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil do Usuário</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          {user && (
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={formData.avatar_url}
              userName={formData.full_name || "Usuário"}
              onAvatarChange={(newUrl) => setFormData({ ...formData, avatar_url: newUrl })}
            />
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado por aqui
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="Jurídico, Compras, etc."
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Perfil de Permissões
          </CardTitle>
          <CardDescription>
            Suas permissões de acesso no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Perfil Atual:</span>
            {getRoleBadge()}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold text-sm">Permissões do seu perfil:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Visualizar contratos e fornecedores
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Cadastrar contratos e fornecedores
              </li>
              {isAnalista && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Editar apenas contratos em rascunho criados por você
                </li>
              )}
              {isAdmin && (
                <>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Aprovar contratos
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Editar qualquer contrato
                  </li>
                </>
              )}
              {isAdmin && (
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Gerenciar usuários e permissões
                </li>
              )}
            </ul>
          </div>

          {isAnalista && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Para solicitar alteração de perfil, entre em contato com um administrador.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança com verificação TOTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => navigate('/settings/2fa')}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Configurar 2FA
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como receber alertas sobre seus contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => navigate('/notification-settings')}
          >
            <Bell className="h-4 w-4 mr-2" />
            Configurar Notificações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura Eletrônica</CardTitle>
          <CardDescription>
            Configure provedores de assinatura digital
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => navigate('/signature-settings')}
          >
            <FileSignature className="h-4 w-4 mr-2" />
            Configurar Provedores de Assinatura
          </Button>
        </CardContent>
      </Card>

      {/* Custos - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Custos Operacionais
            </CardTitle>
            <CardDescription>
              Acompanhe o consumo de recursos e custos da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => navigate('/custos')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Ver Custos e Consumo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Integrações - Admin Only */}
      {isAdmin && (
        <SettingsIntegracaoCard
          loadingIntegracao={loadingIntegracao}
          integracaoConfig={integracaoConfig}
          integracaoForm={integracaoForm}
          onIntegracaoFormChange={setIntegracaoForm}
          savingIntegracao={savingIntegracao}
          testingIntegracao={testingIntegracao}
          onSave={handleSaveIntegracao}
          onTest={handleTestIntegracao}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
          <CardDescription>
            Dados sobre sua conta no LexFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">ID do Usuário</span>
            <span className="font-mono text-sm">{user?.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Conta criada em</span>
            <span>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("pt-BR")
                : "-"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
