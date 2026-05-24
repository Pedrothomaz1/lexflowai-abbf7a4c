import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Mail, Phone, MapPin, Download, Building2, Eye, CheckCircle2, XCircle } from "lucide-react";
import { exportFornecedoresPDF } from "@/utils/pdfExport";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { AnimatedButton } from "@/components/ui/animated-button";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/motion-container";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { formatCPF, formatCNPJ } from "@/utils/documentValidation";
import { FornecedorForm } from "@/components/Fornecedores";
import { Button } from "@/components/ui/button";
import { CnpjStatusBadge } from "@/components/cnpj/CnpjStatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Fornecedor = {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cnpj: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  is_active: boolean | null;
  created_at: string;
  cnpj_status: string | null;
};

type FornecedorCategoria = {
  fornecedor_id: string;
  categoria: string;
};

const CATEGORIA_COLORS: Record<string, string> = {
  seguranca: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  manutencao: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  higiene: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  infraestrutura: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  veiculos: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  outros: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const CATEGORIA_LABELS: Record<string, string> = {
  seguranca: "Segurança",
  manutencao: "Manutenção",
  higiene: "Higiene",
  infraestrutura: "Infraestrutura",
  veiculos: "Veículos",
  outros: "Outros",
};

const Fornecedores = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtroAtivo = searchParams.get("filtro") === "cnpj_inativo";
  const PROBLEM = ["baixada", "suspensa", "inapta", "nula"];
  const fornecedoresFiltrados = useMemo(
    () => (filtroAtivo ? fornecedores.filter((f) => PROBLEM.includes(String(f.cnpj_status))) : fornecedores),
    [filtroAtivo, fornecedores],
  );

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    setLoading(true);
    
    // Fetch fornecedores
    const { data: fornecedoresData, error: fornecedoresError } = await supabase
      .from("fornecedores")
      .select("id, nome, tipo_pessoa, cnpj, cpf, email, telefone, cidade, estado, is_active, created_at, cnpj_status")
      .order("nome");

    if (fornecedoresError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar fornecedores",
        description: fornecedoresError.message,
      });
      setLoading(false);
      return;
    }

    // Fetch categories for all fornecedores
    const { data: categoriasData } = await supabase
      .from("fornecedor_categorias_servico")
      .select("fornecedor_id, categoria");

    // Group categories by fornecedor_id
    const categoriasMap: Record<string, string[]> = {};
    if (categoriasData) {
      categoriasData.forEach((cat: FornecedorCategoria) => {
        if (!categoriasMap[cat.fornecedor_id]) {
          categoriasMap[cat.fornecedor_id] = [];
        }
        categoriasMap[cat.fornecedor_id].push(cat.categoria);
      });
    }

    setFornecedores(fornecedoresData || []);
    setCategorias(categoriasMap);
    setLoading(false);
  };

  const handleExportPDF = () => {
    exportFornecedoresPDF(fornecedores);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    fetchFornecedores();
  };

  const columns: DataTableColumn<Fornecedor>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{value}</span>
          {row.is_active === false && (
            <Badge variant="outline" className="text-destructive border-destructive text-xs">
              Inativo
            </Badge>
          )}
        </div>
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
        const formatted = row.cnpj ? formatCNPJ(doc) : formatCPF(doc);
        return (
          <div className="space-y-1">
            <span className="font-mono text-sm text-muted-foreground">{formatted}</span>
            {row.cnpj && <CnpjStatusBadge status={row.cnpj_status} className="text-[10px]" />}
          </div>
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
      key: "id",
      header: "Serviços",
      render: (_, row) => {
        const cats = categorias[row.id] || [];
        if (cats.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className={`text-xs ${CATEGORIA_COLORS[cat] || ""}`}
              >
                {CATEGORIA_LABELS[cat] || cat}
              </Badge>
            ))}
            {cats.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{cats.length - 2}
              </Badge>
            )}
          </div>
        );
      },
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
    {
      key: "id",
      header: "",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/fornecedores/${row.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Novo Fornecedor</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do fornecedor. Campos com * são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>
                  <FornecedorForm
                    onSuccess={handleFormSuccess}
                    onCancel={() => setDialogOpen(false)}
                  />
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Lista de Fornecedores</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fornecedoresFiltrados.length} fornecedor(es){filtroAtivo ? " com CNPJ inativo" : " cadastrado(s)"}
                  </p>
                </div>
                <Tabs
                  value={filtroAtivo ? "cnpj_inativo" : "todos"}
                  onValueChange={(v) => {
                    if (v === "cnpj_inativo") setSearchParams({ filtro: "cnpj_inativo" });
                    else setSearchParams({});
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="todos">Todos</TabsTrigger>
                    <TabsTrigger value="cnpj_inativo">CNPJs com problemas</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent>
              {fornecedoresFiltrados.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title={filtroAtivo ? "Nenhum CNPJ com problemas" : "Nenhum fornecedor cadastrado"}
                  description={filtroAtivo ? "Todos os fornecedores estão com CNPJ ativo na Receita Federal." : "Cadastre seu primeiro fornecedor para começar."}
                  action={filtroAtivo ? undefined : { label: "Novo Fornecedor", onClick: () => setDialogOpen(true) }}
                />
              ) : (
                <DataTable
                  data={fornecedoresFiltrados}
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
