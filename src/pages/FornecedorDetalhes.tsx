import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { FornecedorAnexos } from "@/components/Fornecedores/FornecedorAnexos";
import { FornecedorCategorias } from "@/components/Fornecedores/FornecedorCategorias";
import { formatCNPJ, formatCPF } from "@/utils/documentValidation";
import {
import { handleDbError } from "@/utils/dbErrorHandler";
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Fornecedor {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cnpj: string | null;
  cpf: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  porte_empresa: string | null;
  website: string | null;
  is_active: boolean | null;
  email: string | null;
  telefone: string | null;
  contato_nome: string | null;
  contato_cargo: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  pix: string | null;
  titular_conta: string | null;
  notas: string | null;
  created_at: string;
}

const PORTES_LABEL: Record<string, string> = {
  mei: "MEI",
  me: "Microempresa",
  epp: "Pequeno Porte",
  medio: "Médio Porte",
  grande: "Grande Porte",
};

const FornecedorDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchFornecedor();
    }
  }, [id]);

  const fetchFornecedor = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setFornecedor(data);
    } catch (error: any) {
      console.error("Error fetching fornecedor:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar fornecedor",
        description: handleDbError(error).message,
      });
      navigate("/fornecedores");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!fornecedor) {
    return null;
  }

  const documento = fornecedor.cnpj
    ? formatCNPJ(fornecedor.cnpj)
    : fornecedor.cpf
    ? formatCPF(fornecedor.cpf)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fornecedor.nome}
        description={`${fornecedor.tipo_pessoa === "juridica" ? "Pessoa Jurídica" : "Pessoa Física"} • ${fornecedor.is_active ? "Ativo" : "Inativo"}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/fornecedores")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Dados Básicos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados Básicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Documento</span>
                  <p className="font-mono">{documento || "—"}</p>
                </div>
                {fornecedor.inscricao_estadual && (
                  <div>
                    <span className="text-sm text-muted-foreground">Inscrição Estadual</span>
                    <p>{fornecedor.inscricao_estadual}</p>
                  </div>
                )}
                {fornecedor.inscricao_municipal && (
                  <div>
                    <span className="text-sm text-muted-foreground">Inscrição Municipal</span>
                    <p>{fornecedor.inscricao_municipal}</p>
                  </div>
                )}
                {fornecedor.porte_empresa && (
                  <div>
                    <span className="text-sm text-muted-foreground">Porte</span>
                    <p>{PORTES_LABEL[fornecedor.porte_empresa] || fornecedor.porte_empresa}</p>
                  </div>
                )}
                {fornecedor.website && (
                  <div>
                    <span className="text-sm text-muted-foreground">Website</span>
                    <p>
                      <a
                        href={fornecedor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {fornecedor.website}
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fornecedor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{fornecedor.email}</span>
                  </div>
                )}
                {fornecedor.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{fornecedor.telefone}</span>
                  </div>
                )}
                {fornecedor.contato_nome && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Contato Secundário</span>
                      <p className="font-medium">{fornecedor.contato_nome}</p>
                      {fornecedor.contato_cargo && (
                        <p className="text-sm text-muted-foreground">{fornecedor.contato_cargo}</p>
                      )}
                    </div>
                    {fornecedor.contato_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{fornecedor.contato_email}</span>
                      </div>
                    )}
                    {fornecedor.contato_telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{fornecedor.contato_telefone}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fornecedor.endereco || fornecedor.cidade || fornecedor.estado ? (
                  <div className="space-y-1">
                    {fornecedor.endereco && <p>{fornecedor.endereco}</p>}
                    <p>
                      {fornecedor.cidade}
                      {fornecedor.cidade && fornecedor.estado && " - "}
                      {fornecedor.estado}
                      {fornecedor.cep && ` - CEP: ${fornecedor.cep}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Endereço não informado</p>
                )}
              </CardContent>
            </Card>

            {/* Dados Bancários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Dados Bancários
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fornecedor.banco || fornecedor.pix ? (
                  <div className="space-y-2">
                    {fornecedor.banco && (
                      <p>
                        <span className="text-muted-foreground">Banco:</span> {fornecedor.banco}
                        {fornecedor.agencia && ` | Ag: ${fornecedor.agencia}`}
                        {fornecedor.conta && ` | Conta: ${fornecedor.conta}`}
                      </p>
                    )}
                    {fornecedor.titular_conta && (
                      <p>
                        <span className="text-muted-foreground">Titular:</span>{" "}
                        {fornecedor.titular_conta}
                      </p>
                    )}
                    {fornecedor.pix && (
                      <p>
                        <span className="text-muted-foreground">PIX:</span> {fornecedor.pix}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Dados bancários não informados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Observações */}
          {fornecedor.notas && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{fornecedor.notas}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="servicos">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Serviço</CardTitle>
              <CardDescription>
                Categorias de serviços oferecidos por este fornecedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FornecedorCategorias
                fornecedorId={fornecedor.id}
                selectedCategories={categories}
                onCategoriesChange={setCategories}
                readOnly
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anexos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos e Anexos</CardTitle>
              <CardDescription>
                Certidões, contratos e outros documentos do fornecedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FornecedorAnexos fornecedorId={fornecedor.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FornecedorDetalhes;
