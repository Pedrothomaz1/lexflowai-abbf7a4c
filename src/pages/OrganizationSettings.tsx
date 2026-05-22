import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Save, ArrowLeft } from "lucide-react";
import { CnpjAutoFillInput } from "@/components/ui/cnpj-autofill-input";

const OrganizationSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization, isOwner, isOrgAdmin, refresh } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    email_contato: "",
    email_financeiro: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        nome: organization.nome || "",
        cnpj: organization.cnpj || "",
        email_contato: organization.email_contato || "",
        telefone: organization.telefone || "",
        endereco: organization.endereco || "",
        cidade: organization.cidade || "",
        estado: organization.estado || "",
        cep: organization.cep || "",
      });
    }
  }, [organization]);

  // Redirect if not owner/admin
  useEffect(() => {
    if (!isOwner && !isOrgAdmin) {
      navigate("/dashboard");
    }
  }, [isOwner, isOrgAdmin, navigate]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("organizations")
        .update({
          nome: formData.nome.trim(),
          cnpj: formData.cnpj.trim() || null,
          email_contato: formData.email_contato.trim() || null,
          telefone: formData.telefone.trim() || null,
          endereco: formData.endereco.trim() || null,
          cidade: formData.cidade.trim() || null,
          estado: formData.estado.trim() || null,
          cep: formData.cep.trim() || null,
        })
        .eq("id", organization.id);

      if (error) throw error;

      await refresh();

      toast({
        title: "Configurações salvas",
        description: "As informações da organização foram atualizadas.",
      });
    } catch (err) {
      console.error("Error updating organization:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!organization) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações da Organização"
        description="Gerencie as informações da sua organização"
        actions={
          <Button variant="outline" onClick={() => navigate("/settings")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Gerais
              </CardTitle>
              <CardDescription>
                Dados básicos da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Organização *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={handleChange("nome")}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <CnpjAutoFillInput
                  value={formData.cnpj}
                  onChange={(v) => setFormData((p) => ({ ...p, cnpj: v }))}
                  disabled={loading}
                  onDataFetched={(data) => {
                    setFormData((p) => ({
                      ...p,
                      nome: p.nome || data.nome || p.nome,
                      email_contato: p.email_contato || data.email || p.email_contato,
                      telefone: p.telefone || data.telefone || p.telefone,
                      endereco: p.endereco || data.endereco || p.endereco,
                      cidade: p.cidade || data.cidade || p.cidade,
                      estado: p.estado || data.uf || p.estado,
                      cep: p.cep || data.cep || p.cep,
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_contato">E-mail de Contato</Label>
                <Input
                  id="email_contato"
                  type="email"
                  value={formData.email_contato}
                  onChange={handleChange("email_contato")}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={handleChange("telefone")}
                  placeholder="(00) 00000-0000"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>
                Localização da sede da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={handleChange("endereco")}
                  placeholder="Rua, número, complemento"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={handleChange("cidade")}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={handleChange("estado")}
                    maxLength={2}
                    placeholder="SP"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={handleChange("cep")}
                  placeholder="00000-000"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Plano</CardTitle>
          <CardDescription>
            Detalhes sobre o plano atual da organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium">Plano Atual</p>
              <p className="text-2xl font-bold capitalize">{organization.plano || "Básico"}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Identificador</p>
              <p className="text-muted-foreground">{organization.slug}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Status</p>
              <p className={organization.is_active ? "text-green-600" : "text-red-600"}>
                {organization.is_active ? "Ativo" : "Inativo"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSettings;
