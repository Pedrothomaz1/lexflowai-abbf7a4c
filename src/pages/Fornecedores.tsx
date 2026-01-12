import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, Phone, MapPin, Download, Building2 } from "lucide-react";
import { exportFornecedoresPDF } from "@/utils/pdfExport";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { AnimatedButton } from "@/components/ui/animated-button";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { DocumentInput } from "@/components/ui/document-input";
import { validateCPF, validateCNPJ, cleanDocument, formatCPF, formatCNPJ } from "@/utils/documentValidation";

type Fornecedor = {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cnpj: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  notas: string | null;
  created_at: string;
};

const Fornecedores = () => {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    tipo_pessoa: "juridica",
    cnpj: "",
    cpf: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    notas: "",
  });
  const [documentValid, setDocumentValid] = useState(false);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar fornecedores",
        description: error.message,
      });
    } else {
      setFornecedores(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validação de documento obrigatório
    if (formData.tipo_pessoa === "juridica") {
      if (!formData.cnpj) {
        toast({
          variant: "destructive",
          title: "CNPJ obrigatório",
          description: "Para pessoa jurídica, o CNPJ é obrigatório",
        });
        return;
      }
      if (!validateCNPJ(formData.cnpj)) {
        toast({
          variant: "destructive",
          title: "CNPJ inválido",
          description: "O CNPJ informado não é válido. Verifique os dígitos.",
        });
        return;
      }
    }

    if (formData.tipo_pessoa === "fisica") {
      if (!formData.cpf) {
        toast({
          variant: "destructive",
          title: "CPF obrigatório",
          description: "Para pessoa física, o CPF é obrigatório",
        });
        return;
      }
      if (!validateCPF(formData.cpf)) {
        toast({
          variant: "destructive",
          title: "CPF inválido",
          description: "O CPF informado não é válido. Verifique os dígitos.",
        });
        return;
      }
    }

    // Limpa formatação antes de salvar
    const { error } = await supabase.from("fornecedores").insert([
      {
        ...formData,
        cnpj: formData.tipo_pessoa === "juridica" ? cleanDocument(formData.cnpj) : null,
        cpf: formData.tipo_pessoa === "fisica" ? cleanDocument(formData.cpf) : null,
        created_by: user.id,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar fornecedor",
        description: error.message,
      });
    } else {
      toast({
        title: "Fornecedor criado com sucesso!",
      });
      setDialogOpen(false);
      setFormData({
        nome: "",
        tipo_pessoa: "juridica",
        cnpj: "",
        cpf: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        notas: "",
      });
      fetchFornecedores();
    }
  };

  const handleExportPDF = () => {
    exportFornecedoresPDF(fornecedores);
  };

  const columns: DataTableColumn<Fornecedor>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (value) => (
        <span className="font-medium text-foreground">{value}</span>
      ),
    },
    {
      key: "tipo_pessoa",
      header: "Tipo",
      render: (value) => (
        <Badge variant="outline" className="font-mono">
          {value === "juridica" ? "PJ" : "PF"}
        </Badge>
      ),
    },
    {
      key: "cnpj",
      header: "Documento",
      render: (_, row) => {
        const doc = row.cnpj || row.cpf;
        if (!doc) return <span className="text-muted-foreground">—</span>;
        // Formata o documento para exibição
        const formatted = row.cnpj ? formatCNPJ(doc) : formatCPF(doc);
        return (
          <span className="font-mono text-sm text-muted-foreground">
            {formatted}
          </span>
        );
      },
    },
    {
      key: "email",
      header: "Contato",
      render: (_, row) => (
        <div className="space-y-1 text-sm">
          {row.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[180px]">{row.email}</span>
            </div>
          )}
          {row.telefone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {row.telefone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "cidade",
      header: "Localização",
      render: (_, row) =>
        row.cidade || row.estado ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {row.cidade}
            {row.cidade && row.estado && " - "}
            {row.estado}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Fornecedores"
          description="Gerencie seus fornecedores e parceiros"
          actions={
            <div className="flex gap-2">
              <AnimatedButton variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </AnimatedButton>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <AnimatedButton>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fornecedor
                  </AnimatedButton>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Novo Fornecedor</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do fornecedor
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome / Razão Social *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo_pessoa">Tipo de Pessoa *</Label>
                        <Select
                          value={formData.tipo_pessoa}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tipo_pessoa: value })
                          }
                          required
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
                          <Label htmlFor="cnpj">CNPJ *</Label>
                          <DocumentInput
                            id="cnpj"
                            documentType="cnpj"
                            value={formData.cnpj}
                            onChange={(value, isValid) => {
                              setFormData({ ...formData, cnpj: value });
                              setDocumentValid(isValid);
                            }}
                            required={formData.tipo_pessoa === "juridica"}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF *</Label>
                          <DocumentInput
                            id="cpf"
                            documentType="cpf"
                            value={formData.cpf}
                            onChange={(value, isValid) => {
                              setFormData({ ...formData, cpf: value });
                              setDocumentValid(isValid);
                            }}
                            required={formData.tipo_pessoa === "fisica"}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({ ...formData, telefone: e.target.value })
                          }
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) =>
                          setFormData({ ...formData, endereco: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input
                          id="cidade"
                          value={formData.cidade}
                          onChange={(e) =>
                            setFormData({ ...formData, cidade: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Input
                          id="estado"
                          value={formData.estado}
                          onChange={(e) =>
                            setFormData({ ...formData, estado: e.target.value })
                          }
                          maxLength={2}
                          placeholder="SP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                          id="cep"
                          value={formData.cep}
                          onChange={(e) =>
                            setFormData({ ...formData, cep: e.target.value })
                          }
                          placeholder="00000-000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notas">Observações</Label>
                      <Textarea
                        id="notas"
                        value={formData.notas}
                        onChange={(e) =>
                          setFormData({ ...formData, notas: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Criar Fornecedor</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
      </FadeIn>

      <StaggerContainer>
        <StaggerItem>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Lista de Fornecedores</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {fornecedores.length} fornecedor(es) cadastrado(s)
              </p>
            </AnimatedCardHeader>
            <AnimatedCardContent>
              {fornecedores.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Nenhum fornecedor cadastrado"
                  description="Cadastre seu primeiro fornecedor para começar a gerenciar suas parcerias."
                  action={{
                    label: "Novo Fornecedor",
                    onClick: () => setDialogOpen(true),
                  }}
                />
              ) : (
                <DataTable
                  data={fornecedores}
                  columns={columns}
                  searchable
                  searchPlaceholder="Buscar por nome, documento..."
                  searchKey="nome"
                />
              )}
            </AnimatedCardContent>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
};

export default Fornecedores;
