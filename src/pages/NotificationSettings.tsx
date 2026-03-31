import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, Bell, Send, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleDbError } from "@/utils/dbErrorHandler";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  frequency: "immediate" | "daily" | "weekly";
  alert_types: string[];
}

const ALERT_TYPES = [
  { id: "vencimento", label: "Vencimento de Contratos", description: "Alertas sobre contratos próximos do vencimento" },
  { id: "renovacao", label: "Renovação", description: "Lembretes para renovação de contratos" },
  { id: "obrigacao", label: "Obrigações", description: "Vencimento de obrigações contratuais" },
  { id: "pagamento", label: "Pagamentos", description: "Alertas sobre pagamentos pendentes" },
];

const FREQUENCY_OPTIONS = [
  { value: "immediate", label: "Imediato", description: "Receber alertas assim que forem gerados" },
  { value: "daily", label: "Resumo Diário", description: "Receber um resumo diário às 8h" },
  { value: "weekly", label: "Resumo Semanal", description: "Receber um resumo toda segunda-feira" },
];

const NotificationSettings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: "",
    email_enabled: true,
    whatsapp_enabled: true,
    frequency: "immediate",
    alert_types: ["vencimento", "renovacao", "obrigacao", "pagamento"],
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setPreferences(prev => ({ ...prev, user_id: user.id }));

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar preferências:", error);
        return;
      }

      if (data) {
        setPreferences({
          id: data.id,
          user_id: data.user_id,
          email_enabled: data.email_enabled,
          whatsapp_enabled: data.whatsapp_enabled,
          frequency: data.frequency as "immediate" | "daily" | "weekly",
          alert_types: data.alert_types || [],
        });
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!organization?.id) {
        toast({
          variant: "destructive",
          title: "Organização não encontrada",
          description: "Finalize o onboarding ou verifique seu acesso.",
        });
        setSaving(false);
        return;
      }

      const payload = {
        user_id: user.id,
        organization_id: organization.id,
        email_enabled: preferences.email_enabled,
        whatsapp_enabled: preferences.whatsapp_enabled,
        frequency: preferences.frequency,
        alert_types: preferences.alert_types,
      };

      let error;
      if (preferences.id) {
        const result = await supabase
          .from("notification_preferences")
          .update(payload)
          .eq("id", preferences.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("notification_preferences")
          .insert(payload);
        error = result.error;
      }

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Você não tem permissão para esta ação ou sua organização não foi identificada.");
        }
        throw error;
      }

      toast({
        title: "Preferências salvas!",
        description: "Suas configurações de notificação foram atualizadas.",
      });

      // Recarregar para pegar o ID se foi insert
      if (!preferences.id) {
        fetchPreferences();
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: handleDbError(error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-notificacao-email", {
        body: {
          alertaId: "test-" + Date.now(),
          contratoId: "00000000-0000-0000-0000-000000000000",
          tipo: "vencimento",
          titulo: "Teste de Notificação",
          mensagem: "Este é um email de teste do sistema de alertas do LexFlow.",
          diasAntecedencia: 7,
          numeroContrato: "TESTE-001",
          dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
        },
      });

      if (error) throw error;

      toast({
        title: "Email de teste enviado!",
        description: `${data.emailsEnviados} email(s) enviado(s) com sucesso.`,
      });
    } catch (error: any) {
      console.error("Erro ao enviar teste:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar teste",
        description: handleDbError(error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleAlertType = (typeId: string) => {
    setPreferences(prev => ({
      ...prev,
      alert_types: prev.alert_types.includes(typeId)
        ? prev.alert_types.filter(t => t !== typeId)
        : [...prev.alert_types, typeId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Configure como deseja receber alertas sobre seus contratos
          </p>
        </div>
      </div>

      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Escolha por onde deseja receber os alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="email-toggle" className="text-base font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas no seu email cadastrado
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, email_enabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label htmlFor="whatsapp-toggle" className="text-base font-medium">WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas via WhatsApp
                </p>
              </div>
            </div>
            <Switch
              id="whatsapp-toggle"
              checked={preferences.whatsapp_enabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, whatsapp_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequência */}
      <Card>
        <CardHeader>
          <CardTitle>Frequência de Envio</CardTitle>
          <CardDescription>
            Com que frequência deseja receber os alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.frequency}
            onValueChange={(value: "immediate" | "daily" | "weekly") =>
              setPreferences(prev => ({ ...prev, frequency: value }))
            }
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tipos de Alerta */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Alerta</CardTitle>
          <CardDescription>
            Selecione quais tipos de alerta deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALERT_TYPES.map((type) => (
            <div key={type.id} className="flex items-start gap-3">
              <Checkbox
                id={type.id}
                checked={preferences.alert_types.includes(type.id)}
                onCheckedChange={() => toggleAlertType(type.id)}
              />
              <div className="space-y-1">
                <Label htmlFor={type.id} className="text-base font-medium cursor-pointer">
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Preferências"
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestEmail}
          disabled={testing || !preferences.email_enabled}
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Email de Teste
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
