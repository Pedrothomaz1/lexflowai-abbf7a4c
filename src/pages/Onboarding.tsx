import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Scale,
  Building2,
  Users,
  FileText,
  Sparkles,
  SkipForward,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StepIdx = 0 | 1 | 2 | 3 | 4;

const stepMeta: { title: string; subtitle: string; icon: typeof Scale }[] = [
  { title: "Boas-vindas", subtitle: "Vamos configurar sua conta em poucos passos.", icon: Sparkles },
  { title: "Seu perfil", subtitle: "Confirme seu nome para personalizar os alertas.", icon: Building2 },
  { title: "Convide seu time", subtitle: "Adicione colegas para colaborar nos contratos.", icon: Users },
  { title: "Primeiro contrato", subtitle: "Cadastre seu primeiro contrato em segundos.", icon: FileText },
  { title: "Pronto!", subtitle: "Sua conta está configurada. Vamos ao dashboard.", icon: CheckCircle2 },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { markStep, completeOnboarding, skipOnboarding, profileFlags, loading } = useOnboarding();

  const [step, setStep] = useState<StepIdx>(0);
  const [fullName, setFullName] = useState("");
  const [inviteEmails, setInviteEmails] = useState(["", "", ""]);
  const [contratoTitulo, setContratoTitulo] = useState("");
  const [contratoNumero, setContratoNumero] = useState("");
  const [busy, setBusy] = useState(false);

  // Note: redirect when onboarding is already complete is handled by ProtectedRoute
  // before this component mounts. We intentionally do NOT navigate from here to
  // avoid races between profile refreshes and the in-flight wizard state.


  // Load existing name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user]);

  const progress = useMemo(() => Math.round(((step + 1) / stepMeta.length) * 100), [step]);
  const meta = stepMeta[step];
  const Icon = meta.icon;

  async function handleSkip() {
    setBusy(true);
    await skipOnboarding();
    toast.success("Você pode retomar o onboarding pelo checklist no dashboard.");
    navigate("/dashboard", { replace: true });
  }

  async function nextStep() {
    if (!user) return;
    setBusy(true);
    try {
      if (step === 1) {
        const name = fullName.trim();
        if (name.length < 2) {
          toast.error("Informe seu nome.");
          setBusy(false);
          return;
        }
        await supabase.from("profiles").update({ full_name: name }).eq("id", user.id).select().maybeSingle();
        await markStep("perfil", { full_name: name });
      } else if (step === 2) {
        const validEmails = inviteEmails.map((e) => e.trim()).filter((e) => e.length > 3 && e.includes("@"));
        if (validEmails.length > 0 && organization) {
          // Fire-and-forget invites
          const results = await Promise.allSettled(
            validEmails.map((email) =>
              supabase.functions.invoke("enviar-convite-organizacao", {
                body: { email, role_in_org: "member", organization_id: organization.id },
              })
            )
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          if (ok > 0) {
            toast.success(`${ok} convite${ok > 1 ? "s" : ""} enviado${ok > 1 ? "s" : ""}.`);
            await markStep("convidar_membro", { count: ok });
          }
        }
      } else if (step === 3) {
        if (contratoNumero.trim() && organization) {
          const titulo = contratoTitulo.trim() || `Contrato ${contratoNumero.trim()}`;
          const { error } = await supabase
            .from("contratos")
            .insert({
              titulo,
              numero_contrato: contratoNumero.trim(),
              status: "rascunho",
              tipo: "outro",
              organization_id: organization.id,
              created_by: user.id,
            })
            .select()
            .maybeSingle();
          if (error) {
            toast.error("Não foi possível criar o contrato: " + error.message);
            setBusy(false);
            return;
          }
          await markStep("contrato", { titulo });
          toast.success("Contrato criado! Você pode editá-lo depois.");
        }
      }

      if (step === (stepMeta.length - 1) as StepIdx) {
        await completeOnboarding();
        navigate("/dashboard", { replace: true });
        return;
      }
      setStep((s) => (s + 1) as StepIdx);
    } catch (err: any) {
      toast.error(err.message || "Erro ao avançar.");
    } finally {
      setBusy(false);
    }
  }

  async function finishNow() {
    setBusy(true);
    await completeOnboarding();
    toast.success("Bem-vindo ao LexFlow!");
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">LexFlow</span>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                Passo {step + 1} de {stepMeta.length}
              </Badge>
              <button
                onClick={handleSkip}
                disabled={busy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
              >
                <SkipForward className="h-3 w-3" />
                Pular por enquanto
              </button>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-start gap-4 pt-2">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{meta.title}</CardTitle>
                <CardDescription className="mt-1 text-base">{meta.subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {step === 0 && (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Em menos de 2 minutos sua conta estará pronta. Você pode pular qualquer passo e voltar depois pelo checklist no dashboard.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[Building2, Users, FileText].map((I, i) => (
                    <div key={i} className="rounded-xl border bg-card/50 p-4 text-center">
                      <I className="h-5 w-5 mx-auto text-primary mb-2" />
                      <p className="text-xs">{["Perfil", "Time", "Contrato"][i]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Label htmlFor="full_name">Seu nome completo</Label>
                <Input
                  id="full_name"
                  placeholder="Ex.: Maria Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">Aparece nas notificações e logs de auditoria.</p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label>E-mails para convidar (opcional)</Label>
                {inviteEmails.map((email, i) => (
                  <Input
                    key={i}
                    type="email"
                    placeholder={`colega${i + 1}@empresa.com`}
                    value={email}
                    onChange={(e) => {
                      const next = [...inviteEmails];
                      next[i] = e.target.value;
                      setInviteEmails(next);
                    }}
                  />
                ))}
                <p className="text-xs text-muted-foreground">
                  Os convidados receberão um e-mail para entrar na sua organização.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título do contrato (opcional)</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex.: Contrato de prestação de serviços"
                    value={contratoTitulo}
                    onChange={(e) => setContratoTitulo(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do contrato</Label>
                  <Input
                    id="numero"
                    placeholder="Ex.: 2026/001"
                    value={contratoNumero}
                    onChange={(e) => setContratoNumero(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Criamos um rascunho. Você completa os dados, anexa o PDF e configura alertas depois.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Tudo certo. No dashboard você verá o checklist com tarefas opcionais para extrair o máximo do LexFlow.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1) as StepIdx)}
                disabled={step === 0 || busy}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              {step === 4 ? (
                <Button onClick={finishNow} disabled={busy}>
                  Ir para o dashboard
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={nextStep} disabled={busy}>
                  {step === 0 ? "Começar" : "Continuar"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
