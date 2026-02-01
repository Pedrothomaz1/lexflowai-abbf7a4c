import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  FileSpreadsheet,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FranquiaForm, FranquiaImport, FranquiaRenovacaoWorkflow } from "@/components/Franquias";
import { FranquiaImportResult } from "@/utils/franquiaXlsxParser";
import { cn } from "@/lib/utils";

interface Franquia {
  id: string;
  nome_completo: string;
  cnpj: string | null;
  regime_tributario: string | null;
  tipo_franquia: string | null;
  status_contrato: string;
  data_assinatura: string | null;
  data_termino: string | null;
  status_vigencia: string;
  consultora_informada: boolean;
  renovacao_aceita: boolean;
  novo_contrato_enviado: boolean;
  contrato_novo_assinado: boolean;
  data_emissao_nf: string | null;
  numero_nf: string | null;
  observacoes: string | null;
  created_at: string;
}

const tipoFranquiaLabels: Record<string, string> = {
  home_based_gold: "Home Based Gold",
  home_based_silver: "Home Based Silver",
  lojas: "Lojas",
  venda_direta: "Venda Direta",
};

type TabFilter = "todas" | "ativo" | "proximo_vencer" | "vencido";

const statusVigenciaLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  proximo_vencer: { label: "Próximo ao Vencimento", variant: "secondary" },
  vencido: { label: "Vencido", variant: "destructive" },
  renovado: { label: "Renovado", variant: "outline" },
};

export default function Franquias() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("todas");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Fetch franquias
  const { data: franquias, isLoading } = useQuery({
    queryKey: ["franquias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franquias")
        .select("*")
        .order("nome_completo");

      if (error) throw error;
      return data as Franquia[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Franquia>) => {
      if (!organization?.id) {
        throw new Error("Organização não encontrada. Finalize o onboarding.");
      }
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("franquias").insert({
        ...data,
        organization_id: organization.id,
        created_by: userData.user?.id,
      });
      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para criar franquia. Verifique seu acesso.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franquias"] });
      toast({ title: "Franquia cadastrada com sucesso!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar franquia",
        description: error.message,
      });
    },
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (results: FranquiaImportResult[]) => {
      if (!organization?.id) {
        throw new Error("Organização não encontrada. Finalize o onboarding.");
      }
      const { data: userData } = await supabase.auth.getUser();
      const records = results.map((r) => ({
        ...r.data,
        organization_id: organization.id,
        created_by: userData.user?.id,
      }));
      
      const { error } = await supabase.from("franquias").insert(records);
      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para importar franquias. Verifique seu acesso.");
        }
        throw error;
      }
      
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["franquias"] });
      toast({ title: `${count} franquia(s) importada(s) com sucesso!` });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("franquias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franquias"] });
      toast({ title: "Franquia excluída com sucesso!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir franquia",
        description: error.message,
      });
    },
  });

  // Filtered data
  const filteredData = useMemo(() => {
    if (!franquias) return [];

    return franquias.filter((f) => {
      // Filter by tab
      if (activeTab !== "todas" && f.status_vigencia !== activeTab) {
        return false;
      }

      // Filter by search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          f.nome_completo.toLowerCase().includes(search) ||
          f.cnpj?.toLowerCase().includes(search) ||
          f.regime_tributario?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [franquias, activeTab, searchTerm]);

  // Stats for tabs
  const stats = useMemo(() => {
    if (!franquias) return { ativo: 0, proximo_vencer: 0, vencido: 0 };

    return {
      ativo: franquias.filter((f) => f.status_vigencia === "ativo").length,
      proximo_vencer: franquias.filter((f) => f.status_vigencia === "proximo_vencer").length,
      vencido: franquias.filter((f) => f.status_vigencia === "vencido").length,
    };
  }, [franquias]);

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir a franquia "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Franquias"
        description={`${franquias?.length || 0} franquias cadastradas`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Franquia
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="ativo" className="gap-1.5">
              Ativas
              {stats.ativo > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {stats.ativo}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="proximo_vencer" className="gap-1.5">
              Próx. Vencer
              {stats.proximo_vencer > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {stats.proximo_vencer}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vencido" className="gap-1.5">
              Vencidas
              {stats.vencido > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {stats.vencido}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar franquias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {searchTerm || activeTab !== "todas"
                    ? "Nenhuma franquia encontrada com os filtros aplicados"
                    : "Nenhuma franquia cadastrada"}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((franquia) => {
                const statusInfo = statusVigenciaLabels[franquia.status_vigencia] || {
                  label: franquia.status_vigencia,
                  variant: "outline" as const,
                };

                return (
                  <TableRow
                    key={franquia.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/franquias/${franquia.id}`)}
                  >
                    <TableCell className="font-medium">
                      {franquia.nome_completo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {franquia.tipo_franquia ? tipoFranquiaLabels[franquia.tipo_franquia] || franquia.tipo_franquia : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {franquia.cnpj || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {franquia.data_termino
                        ? format(new Date(franquia.data_termino), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <FranquiaRenovacaoWorkflow
                        consultoraInformada={franquia.consultora_informada}
                        renovacaoAceita={franquia.renovacao_aceita}
                        novoContratoEnviado={franquia.novo_contrato_enviado}
                        contratoNovoAssinado={franquia.contrato_novo_assinado}
                        compact
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/franquias/${franquia.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/franquias/${franquia.id}?edit=true`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(franquia.id, franquia.nome_completo)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <FranquiaForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
      />

      {/* Import Dialog */}
      <FranquiaImport
        open={showImport}
        onOpenChange={setShowImport}
        onImport={async (results) => {
          await importMutation.mutateAsync(results);
        }}
      />
    </div>
  );
}
