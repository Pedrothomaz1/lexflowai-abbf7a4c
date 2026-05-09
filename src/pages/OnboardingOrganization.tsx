import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Scale, Check, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useCnpjVerification } from "@/hooks/useCnpjVerification";

type PlanoId = "free" | "pro" | "business" | "enterprise";

const PLANOS: Array<{
  id: PlanoId;
  nome: string;
  preco: string;
  usuarios: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    id: "free",
    nome: "Free",
    preco: "R$ 0",
    usuarios: "1 usuário",
    features: ["Contratos ilimitados", "Análise IA básica", "Suporte por email"],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "Sob consulta",
    usuarios: "5 usuários",
    highlight: true,
    features: ["Tudo do Free", "Workflows de aprovação", "Alertas automáticos", "Integrações"],
  },
  {
    id: "business",
    nome: "Business",
    preco: "Sob consulta",
    usuarios: "30 usuários",
    features: ["Tudo do Pro", "RBAC avançado", "Auditoria completa", "Suporte prioritário"],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Falar com vendas",
    usuarios: "Ilimitado",
    features: ["Tudo do Business", "SLA dedicado", "Onboarding assistido", "Customizações"],
  },
];

const formatCnpj = (v: string) =>
  v.replace(/\D/g, "").slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const slugify = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const OnboardingOrganization = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useOrganization();
  const { toast } = useToast();
  const { verify: verifyCnpj, loading: verifyingCnpj } = useCnpjVerification();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);

  const [empresa, setEmpresa] = useState({
    nome: "", cnpj: "", telefone: "", cidade: "", estado: "",
  });
  const [perfil, setPerfil] = useState({
    cargo: "", departamento: "",
  });
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoId>("free");
  const [enterpriseLead, setEnterpriseLead] = useState({
    num_usuarios_estimado: "", mensagem: "",
  });

  const handleCnpjBlur = async () => {
    const clean = empresa.cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return;
    const r = await verifyCnpj(clean, { silent: true });
    if (r && r.status !== "erro_consulta") {
      setEmpresa((p) => ({
        ...p,
        nome: p.nome || r.nome || r.fantasia || "",
        telefone: p.telefone || r.telefone || "",
        cidade: p.cidade || r.endereco?.municipio || "",
        estado: p.estado || r.endereco?.uf || "",
      }));
      toast({ title: "Dados preenchidos", description: "Conferimos os campos com a Receita." });
    }
  };

  const validateStep1 = () => {
    if (!empresa.nome.trim()) {
      toast({ variant: "destructive", title: "Informe o nome da empresa" });
      return false;
    }
    return true;
  };

  const submitEnterpriseLead = async () => {
    if (!user) return;
    setSubmittingLead(true);
    try {
      const { error } = await supabase.functions.invoke("lead-enterprise", {
        body: {
          nome: user.user_metadata?.full_name || user.email,
          email: user.email,
          empresa: empresa.nome || "(não informado)",
          telefone: empresa.telefone,
          cnpj: empresa.cnpj.replace(/\D/g, ""),
          num_usuarios_estimado: enterpriseLead.num_usuarios_estimado
            ? parseInt(enterpriseLead.num_usuarios_estimado, 10)
            : null,
          mensagem: enterpriseLead.mensagem,
          source: "onboarding",
        },
      });
      if (error) throw error;
      toast({
        title: "Recebemos seu pedido",
        description: "Nosso time entrará em contato em até 1 dia útil.",
      });
      setEnterpriseDialogOpen(false);
      // Cria org Free para o usuário poder usar enquanto vendas conversa
      setPlanoSelecionado("free");
      await createOrg("free");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Não foi possível enviar", description: "Tente novamente." });
    } finally {
      setSubmittingLead(false);
    }
  };

  const createOrg = async (plano: PlanoId) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session }, error: sErr } = await supabase.auth.getSession();
      if (sErr || !session?.access_token) {
        toast({ variant: "destructive", title: "Sessão expirada" });
        navigate("/auth", { replace: true });
        return;
      }

      const authedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          global: { headers: { Authorization: `Bearer ${session.access_token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }
      );

      const orgId = crypto.randomUUID();
      const slug = `${slugify(empresa.nome)}-${orgId.slice(0, 6)}`;

      const { error: orgError } = await authedSupabase.from("organizations").insert({
        id: orgId,
        nome: empresa.nome.trim(),
        slug,
        cnpj: empresa.cnpj.replace(/\D/g, "") || null,
        telefone: empresa.telefone || null,
        cidade: empresa.cidade || null,
        estado: empresa.estado || null,
        plano,
        created_by: user.id,
      });
      if (orgError) throw orgError;

      const { error: memErr } = await authedSupabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: user.id,
        role_in_org: "owner",
        is_active: true,
      });
      if (memErr) throw memErr;

      const { error: roleErr } = await authedSupabase.from("user_roles").insert({
        user_id: user.id,
        role: "administrador",
        organization_id: orgId,
      });
      if (roleErr && roleErr.code !== "23505") throw roleErr;

      // Atualiza perfil com cargo/departamento
      if (perfil.cargo || perfil.departamento) {
        await authedSupabase.from("profiles").update({
          cargo: perfil.cargo || null,
          departamento: perfil.departamento || null,
        }).eq("id", user.id);
      }

      toast({ title: "Empresa criada!", description: `${empresa.nome} está pronta para uso.` });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao criar empresa",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlano = (id: PlanoId) => {
    setPlanoSelecionado(id);
    if (id === "enterprise") {
      setEnterpriseDialogOpen(true);
    }
  };

  const handleFinalize = async () => {
    if (planoSelecionado === "enterprise") {
      setEnterpriseDialogOpen(true);
      return;
    }
    // Pro/Business hoje funcionam como Free até billing ser implementado (Fase 3)
    await createOrg(planoSelecionado);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Bem-vindo ao LexFlow</h1>
          <p className="text-muted-foreground mt-2">Configure sua empresa em 3 passos rápidos.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && <div className={`h-0.5 w-12 ${step > n ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="max-w-2xl mx-auto">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Sua empresa</CardTitle>
                <CardDescription>Preencha o CNPJ para autocompletar os dados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={empresa.cnpj}
                      onChange={(e) => setEmpresa({ ...empresa, cnpj: formatCnpj(e.target.value) })}
                      onBlur={handleCnpjBlur}
                    />
                    {verifyingCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da empresa *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      placeholder="Minha Empresa Ltda"
                      value={empresa.nome}
                      onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 99999-9999"
                    value={empresa.telefone}
                    onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={empresa.cidade}
                      onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">UF</Label>
                    <Input
                      id="estado"
                      maxLength={2}
                      value={empresa.estado}
                      onChange={(e) => setEmpresa({ ...empresa, estado: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => validateStep1() && setStep(2)}>
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Seu papel</CardTitle>
                <CardDescription>Opcional — ajuda a configurar permissões depois.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    placeholder="Ex: Diretor Jurídico"
                    value={perfil.cargo}
                    onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    placeholder="Ex: Jurídico"
                    value={perfil.departamento}
                    onChange={(e) => setPerfil({ ...perfil, departamento: e.target.value })}
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Escolha seu plano</CardTitle>
                <CardDescription>Você pode mudar a qualquer momento.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {PLANOS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlano(p.id)}
                      className={`relative text-left rounded-lg border-2 p-4 transition ${
                        planoSelecionado === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {p.highlight && (
                        <span className="absolute -top-2 right-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                          Popular
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{p.nome}</h3>
                          <p className="text-xs text-muted-foreground">{p.usuarios}</p>
                        </div>
                        {planoSelecionado === p.id && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-lg font-bold mb-2">{p.preco}</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-1">
                            <Check className="h-3 w-3 mt-0.5 text-primary shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>

                {(planoSelecionado === "pro" || planoSelecionado === "business") && (
                  <div className="bg-muted/50 rounded-md p-3 mb-4 text-sm flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      Você criará a empresa hoje. A cobrança do plano <strong>{planoSelecionado}</strong>{" "}
                      será ativada quando o billing estiver disponível — sem interrupções.
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={handleFinalize} disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando…</>
                    ) : (
                      "Finalizar e criar empresa"
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={enterpriseDialogOpen} onOpenChange={setEnterpriseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Falar com vendas</DialogTitle>
            <DialogDescription>
              Conte sobre sua operação. Respondemos em até 1 dia útil. Enquanto isso, criamos sua empresa
              no plano Free para você começar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="lead-usuarios">Quantos usuários você precisa?</Label>
              <Input
                id="lead-usuarios"
                type="number"
                min={30}
                placeholder="Ex: 50"
                value={enterpriseLead.num_usuarios_estimado}
                onChange={(e) => setEnterpriseLead({ ...enterpriseLead, num_usuarios_estimado: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-msg">Mensagem (opcional)</Label>
              <Textarea
                id="lead-msg"
                rows={3}
                placeholder="Necessidades específicas, integrações, prazos…"
                value={enterpriseLead.mensagem}
                onChange={(e) => setEnterpriseLead({ ...enterpriseLead, mensagem: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnterpriseDialogOpen(false)} disabled={submittingLead}>
              Cancelar
            </Button>
            <Button onClick={submitEnterpriseLead} disabled={submittingLead || loading}>
              {submittingLead || loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
              ) : (
                "Enviar e criar empresa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingOrganization;
