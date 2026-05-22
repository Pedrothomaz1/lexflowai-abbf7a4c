import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { DynamicFormRenderer, type FormField } from "@/components/Requisicoes/DynamicFormRenderer";

const RequisicaoFormPublica = () => {
  const { formId } = useParams<{ formId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formMeta, setFormMeta] = useState<{
    nome: string;
    descricao: string | null;
    organization_id: string;
    versao_id: string;
    fields: FormField[];
  } | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [departamento, setDepartamento] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!formId) return;
      const { data: form, error: fErr } = await supabase
        .from("request_forms")
        .select("id, nome, descricao, organization_id, current_version, is_active")
        .eq("id", formId)
        .maybeSingle();
      if (fErr || !form || !form.is_active) {
        setLoading(false);
        return;
      }
      const { data: ver, error: vErr } = await supabase
        .from("request_form_versions")
        .select("id, schema_campos")
        .eq("form_id", form.id)
        .eq("versao", form.current_version)
        .maybeSingle();
      if (vErr || !ver) {
        setLoading(false);
        return;
      }
      setFormMeta({
        nome: form.nome,
        descricao: form.descricao,
        organization_id: form.organization_id,
        versao_id: ver.id,
        fields: Array.isArray(ver.schema_campos) ? (ver.schema_campos as FormField[]) : [],
      });
      setLoading(false);
    };
    load();
  }, [formId]);

  const enviar = async (respostas: Record<string, any>) => {
    if (!formMeta) return;
    if (!nome.trim() || !email.trim()) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const titulo = String(respostas.titulo || formMeta.nome).slice(0, 200);
      const descricao = String(respostas.descricao || JSON.stringify(respostas)).slice(0, 2000);
      const numero = `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from("contract_requests").insert({
        organization_id: formMeta.organization_id,
        form_version_id: formMeta.versao_id,
        numero_requisicao: numero,
        titulo,
        descricao,
        departamento: departamento || "Não informado",
        solicitante_nome: nome,
        solicitante_email: email,
        respostas: respostas as any,
        tipo_contrato: "outro" as any,
        status: "pendente",
        urgencia: "normal",
      });
      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Formulário indisponível</p>
            <p className="text-sm text-muted-foreground mt-1">
              O link expirou ou o formulário foi desativado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
            <p className="font-medium text-lg">Requisição enviada!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sua solicitação foi registrada e será analisada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {formMeta.nome}
            </CardTitle>
            {formMeta.descricao && (
              <p className="text-sm text-muted-foreground">{formMeta.descricao}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Seu nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} />
              </div>
              <div>
                <Label>Seu e-mail *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Departamento</Label>
                <Input
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <DynamicFormRenderer
                fields={formMeta.fields}
                onSubmit={enviar}
                submitting={submitting}
                submitLabel="Enviar requisição"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequisicaoFormPublica;
