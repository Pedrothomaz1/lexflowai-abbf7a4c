import { useState, useEffect } from "react";
import {
  Settings2,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Shield,
  Wrench,
  Droplets,
  Server,
  Car,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";

interface Especificacao {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  validade_padrao_meses: number;
  dias_alerta_padrao: number;
  requer_certificado: boolean;
  orgao_regulador: string | null;
  is_active: boolean;
  created_at: string;
  servicos_count?: number;
}

const categoriaConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  seguranca: { label: "Segurança", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: Shield },
  manutencao: { label: "Manutenção", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Wrench },
  higiene: { label: "Higiene", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: Droplets },
  infraestrutura: { label: "Infraestrutura", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Server },
  veiculos: { label: "Veículos", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: Car },
  outros: { label: "Outros", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: HelpCircle },
};

export default function EspecificacoesServico() {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [especificacoes, setEspecificacoes] = useState<Especificacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEspec, setDeletingEspec] = useState<Especificacao | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEspec, setEditingEspec] = useState<Especificacao | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    categoria: "manutencao",
    descricao: "",
    validade_padrao_meses: 12,
    dias_alerta_padrao: 30,
    requer_certificado: false,
    orgao_regulador: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("especificacoes_servico")
        .select("*")
        .order("categoria")
        .order("nome");

      if (error) throw error;

      // Get servicos count per especificacao
      const { data: servicosData } = await supabase
        .from("servicos_periodicos")
        .select("especificacao_id");

      const servicosCount: Record<string, number> = {};
      if (servicosData) {
        servicosData.forEach(s => {
          servicosCount[s.especificacao_id] = (servicosCount[s.especificacao_id] || 0) + 1;
        });
      }

      const enriched: Especificacao[] = (data || []).map(e => ({
        ...e,
        servicos_count: servicosCount[e.id] || 0,
      }));

      setEspecificacoes(enriched);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar especificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome da especificação.",
        variant: "destructive",
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

    setIsSubmitting(true);
    const payload = {
      nome: formData.nome.trim(),
      categoria: formData.categoria,
      descricao: formData.descricao || null,
      validade_padrao_meses: formData.validade_padrao_meses,
      dias_alerta_padrao: formData.dias_alerta_padrao,
      requer_certificado: formData.requer_certificado,
      orgao_regulador: formData.orgao_regulador || null,
      organization_id: organization.id,
    };

    try {
      if (editingEspec) {
        const { error } = await supabase
          .from("especificacoes_servico")
          .update(payload)
          .eq("id", editingEspec.id);
        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Você não tem permissão para esta ação.");
          }
          throw error;
        }
        toast({ title: "Especificação atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("especificacoes_servico").insert(payload);
        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Você não tem permissão para criar especificações.");
          }
          throw error;
        }
        toast({ title: "Especificação cadastrada com sucesso!" });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      categoria: "manutencao",
      descricao: "",
      validade_padrao_meses: 12,
      dias_alerta_padrao: 30,
      requer_certificado: false,
      orgao_regulador: "",
    });
    setEditingEspec(null);
  };

  const handleEdit = (espec: Especificacao) => {
    setEditingEspec(espec);
    setFormData({
      nome: espec.nome,
      categoria: espec.categoria,
      descricao: espec.descricao || "",
      validade_padrao_meses: espec.validade_padrao_meses,
      dias_alerta_padrao: espec.dias_alerta_padrao,
      requer_certificado: espec.requer_certificado,
      orgao_regulador: espec.orgao_regulador || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEspec) return;

    try {
      const { error } = await supabase
        .from("especificacoes_servico")
        .delete()
        .eq("id", deletingEspec.id);
      if (error) throw error;
      toast({ title: "Especificação excluída com sucesso!" });
      setIsDeleteDialogOpen(false);
      setDeletingEspec(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (espec: Especificacao) => {
    try {
      const { error } = await supabase
        .from("especificacoes_servico")
        .update({ is_active: !espec.is_active })
        .eq("id", espec.id);
      if (error) throw error;
      toast({ title: espec.is_active ? "Especificação desativada" : "Especificação ativada" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns: DataTableColumn<Especificacao>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (value: string, row: Especificacao) => {
        const catConfig = categoriaConfig[row.categoria] || categoriaConfig.outros;
        const Icon = catConfig.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${catConfig.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {value}
                {!row.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                )}
              </div>
              {row.descricao && (
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {row.descricao}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (value: string) => {
        const config = categoriaConfig[value] || categoriaConfig.outros;
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      key: "validade_padrao_meses",
      header: "Validade",
      render: (value: number) => (
        <span>{value} {value === 1 ? "mês" : "meses"}</span>
      ),
    },
    {
      key: "dias_alerta_padrao",
      header: "Alerta",
      render: (value: number) => (
        <span>{value} dias antes</span>
      ),
    },
    {
      key: "requer_certificado",
      header: "Certificado",
      render: (value: boolean, row: Especificacao) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <FileCheck className="h-4 w-4 text-success" />
              <span className="text-sm">{row.orgao_regulador || "Sim"}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Não</span>
          )}
        </div>
      ),
    },
    {
      key: "servicos_count",
      header: "Uso",
      render: (value: number) => (
        <Badge variant="secondary">{value} serviços</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, row: Especificacao) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleActive(row)}>
              {row.is_active ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setDeletingEspec(row);
                setIsDeleteDialogOpen(true);
              }}
              disabled={row.servicos_count! > 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Especificações de Serviço"
        description="Configure os tipos de serviços periódicos disponíveis."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Especificação
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={especificacoes}
        emptyState={{ title: "Nenhuma especificação cadastrada" }}
      />

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEspec ? "Editar Especificação" : "Nova Especificação"}
            </DialogTitle>
            <DialogDescription>
              Defina um tipo de serviço que poderá ser usado nos serviços periódicos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Recarga de Extintores"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoriaConfig).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do serviço..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validade">Validade Padrão (meses)</Label>
                <Input
                  id="validade"
                  type="number"
                  min={1}
                  value={formData.validade_padrao_meses}
                  onChange={(e) => setFormData(prev => ({ ...prev, validade_padrao_meses: parseInt(e.target.value) || 12 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alerta">Dias de Antecedência Alerta</Label>
                <Input
                  id="alerta"
                  type="number"
                  min={1}
                  value={formData.dias_alerta_padrao}
                  onChange={(e) => setFormData(prev => ({ ...prev, dias_alerta_padrao: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Requer Certificado</Label>
                <p className="text-sm text-muted-foreground">
                  Indica se o serviço exige documento comprobatório
                </p>
              </div>
              <Switch
                checked={formData.requer_certificado}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, requer_certificado: v }))}
              />
            </div>

            {formData.requer_certificado && (
              <div className="space-y-2">
                <Label htmlFor="orgao">Órgão Regulador</Label>
                <Input
                  id="orgao"
                  value={formData.orgao_regulador}
                  onChange={(e) => setFormData(prev => ({ ...prev, orgao_regulador: e.target.value }))}
                  placeholder="Ex: Corpo de Bombeiros, Vigilância Sanitária"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingEspec ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir especificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Especificações em uso não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
