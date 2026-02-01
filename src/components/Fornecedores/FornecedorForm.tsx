import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { DocumentInput } from "@/components/ui/document-input";
import { validateCPF, validateCNPJ, cleanDocument } from "@/utils/documentValidation";
import { FornecedorCategorias, saveFornecedorCategorias } from "./FornecedorCategorias";
import { Loader2 } from "lucide-react";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const PORTES_EMPRESA = [
  { value: "mei", label: "MEI - Microempreendedor Individual" },
  { value: "me", label: "ME - Microempresa" },
  { value: "epp", label: "EPP - Empresa de Pequeno Porte" },
  { value: "medio", label: "Médio Porte" },
  { value: "grande", label: "Grande Porte" },
];

interface FornecedorFormData {
  nome: string;
  tipo_pessoa: string;
  cnpj: string;
  cpf: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  porte_empresa: string;
  website: string;
  is_active: boolean;
  email: string;
  telefone: string;
  contato_nome: string;
  contato_cargo: string;
  contato_email: string;
  contato_telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
  titular_conta: string;
  notas: string;
}

interface FornecedorFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FornecedorForm({ onSuccess, onCancel }: FornecedorFormProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [documentValid, setDocumentValid] = useState(false);

  const [formData, setFormData] = useState<FornecedorFormData>({
    nome: "",
    tipo_pessoa: "juridica",
    cnpj: "",
    cpf: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    porte_empresa: "",
    website: "",
    is_active: true,
    email: "",
    telefone: "",
    contato_nome: "",
    contato_cargo: "",
    contato_email: "",
    contato_telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    banco: "",
    agencia: "",
    conta: "",
    pix: "",
    titular_conta: "",
    notas: "",
  });

  const handleChange = (field: keyof FornecedorFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar um fornecedor.",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
      });
      return;
    }

    // Validação de documento
    if (formData.tipo_pessoa === "juridica") {
      if (!formData.cnpj) {
        toast({
          variant: "destructive",
          title: "CNPJ obrigatório",
          description: "Para pessoa jurídica, o CNPJ é obrigatório.",
        });
        setActiveTab("basico");
        return;
      }
      if (!validateCNPJ(formData.cnpj)) {
        toast({
          variant: "destructive",
          title: "CNPJ inválido",
          description: "O CNPJ informado não é válido.",
        });
        setActiveTab("basico");
        return;
      }
    }

    if (formData.tipo_pessoa === "fisica") {
      if (!formData.cpf) {
        toast({
          variant: "destructive",
          title: "CPF obrigatório",
          description: "Para pessoa física, o CPF é obrigatório.",
        });
        setActiveTab("basico");
        return;
      }
      if (!validateCPF(formData.cpf)) {
        toast({
          variant: "destructive",
          title: "CPF inválido",
          description: "O CPF informado não é válido.",
        });
        setActiveTab("basico");
        return;
      }
    }

    setLoading(true);

    try {
      // Cria o fornecedor
      const { data: fornecedor, error } = await supabase
        .from("fornecedores")
        .insert({
          organization_id: organization.id,
          nome: formData.nome,
          tipo_pessoa: formData.tipo_pessoa,
          cnpj: formData.tipo_pessoa === "juridica" ? cleanDocument(formData.cnpj) : null,
          cpf: formData.tipo_pessoa === "fisica" ? cleanDocument(formData.cpf) : null,
          inscricao_estadual: formData.inscricao_estadual || null,
          inscricao_municipal: formData.inscricao_municipal || null,
          porte_empresa: formData.tipo_pessoa === "juridica" ? (formData.porte_empresa || null) : null,
          website: formData.website || null,
          is_active: formData.is_active,
          email: formData.email || null,
          telefone: formData.telefone || null,
          contato_nome: formData.contato_nome || null,
          contato_cargo: formData.contato_cargo || null,
          contato_email: formData.contato_email || null,
          contato_telefone: formData.contato_telefone || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          banco: formData.banco || null,
          agencia: formData.agencia || null,
          conta: formData.conta || null,
          pix: formData.pix || null,
          titular_conta: formData.titular_conta || null,
          notas: formData.notas || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para criar fornecedor. Verifique seu acesso.");
        }
        throw error;
      }

      // Salva as categorias
      if (fornecedor && selectedCategories.length > 0) {
        const result = await saveFornecedorCategorias(fornecedor.id, selectedCategories, organization.id);
        if (!result.success) {
          console.error("Error saving categories:", result.error);
        }
      }

      toast({ title: "Fornecedor criado com sucesso!" });
      onSuccess();
    } catch (error: any) {
      console.error("Error creating fornecedor:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar fornecedor",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="bancario">Bancário</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="outros">Outros</TabsTrigger>
        </TabsList>

        {/* Aba Dados Básicos */}
        <TabsContent value="basico" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Razão Social *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.tipo_pessoa}
                onValueChange={(value) => handleChange("tipo_pessoa", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_pessoa === "juridica" ? (
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <DocumentInput
                  documentType="cnpj"
                  value={formData.cnpj}
                  onChange={(value, isValid) => {
                    handleChange("cnpj", value);
                    setDocumentValid(isValid);
                  }}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>CPF *</Label>
                <DocumentInput
                  documentType="cpf"
                  value={formData.cpf}
                  onChange={(value, isValid) => {
                    handleChange("cpf", value);
                    setDocumentValid(isValid);
                  }}
                  required
                />
              </div>
            )}
          </div>

          {formData.tipo_pessoa === "juridica" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={formData.inscricao_estadual}
                  onChange={(e) => handleChange("inscricao_estadual", e.target.value)}
                  placeholder="Isento ou número"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input
                  value={formData.inscricao_municipal}
                  onChange={(e) => handleChange("inscricao_municipal", e.target.value)}
                />
              </div>
            </div>
          )}

          {formData.tipo_pessoa === "juridica" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Porte da Empresa</Label>
                <Select
                  value={formData.porte_empresa}
                  onValueChange={(value) => handleChange("porte_empresa", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTES_EMPRESA.map((porte) => (
                      <SelectItem key={porte.value} value={porte.value}>
                        {porte.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {formData.tipo_pessoa === "fisica" && (
            <div className="space-y-2">
              <Label>Website / Redes Sociais</Label>
              <Input
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
            />
            <Label htmlFor="is_active">Fornecedor Ativo</Label>
          </div>
        </TabsContent>

        {/* Aba Contato */}
        <TabsContent value="contato" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Principal</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone Principal</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Contato Secundário</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Contato</Label>
                <Input
                  value={formData.contato_nome}
                  onChange={(e) => handleChange("contato_nome", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={formData.contato_cargo}
                  onChange={(e) => handleChange("contato_cargo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contato_email}
                  onChange={(e) => handleChange("contato_email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.contato_telefone}
                  onChange={(e) => handleChange("contato_telefone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Aba Endereço */}
        <TabsContent value="endereco" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => handleChange("endereco", e.target.value)}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={formData.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleChange("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={formData.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>
        </TabsContent>

        {/* Aba Dados Bancários */}
        <TabsContent value="bancario" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                value={formData.banco}
                onChange={(e) => handleChange("banco", e.target.value)}
                placeholder="Nome ou código"
              />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.agencia}
                onChange={(e) => handleChange("agencia", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input
                value={formData.conta}
                onChange={(e) => handleChange("conta", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                value={formData.pix}
                onChange={(e) => handleChange("pix", e.target.value)}
                placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
              />
            </div>
            <div className="space-y-2">
              <Label>Titular da Conta</Label>
              <Input
                value={formData.titular_conta}
                onChange={(e) => handleChange("titular_conta", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Aba Serviços */}
        <TabsContent value="servicos" className="space-y-4 mt-4">
          <FornecedorCategorias
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
          />
        </TabsContent>

        {/* Aba Outros */}
        <TabsContent value="outros" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => handleChange("notas", e.target.value)}
              rows={5}
              placeholder="Informações adicionais sobre o fornecedor..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Criar Fornecedor"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
