import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  User,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { PageSkeleton } from "@/components/ui/skeleton-loaders";

interface Unidade {
  id: string;
  nome: string;
  tipo: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  responsavel_id: string | null;
  email_contato: string | null;
  telefone: string | null;
  is_active: boolean;
  created_at: string;
  responsavel_nome?: string | null;
  servicos_count?: number;
}

interface Profile {
  id: string;
  full_name: string;
}

const tipoConfig: Record<string, { label: string; color: string }> = {
  matriz: { label: "Matriz", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  filial: { label: "Filial", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  remoto: { label: "Remoto", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

export default function Unidades() {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUnidade, setDeletingUnidade] = useState<Unidade | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "filial",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    responsavel_id: "",
    email_contato: "",
    telefone: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [unidadesRes, profilesRes] = await Promise.all([
        supabase.from("unidades").select("*").order("nome"),
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (unidadesRes.error) throw unidadesRes.error;

      // Get profiles map
      const profilesMap: Record<string, string> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach(p => {
          profilesMap[p.id] = p.full_name;
        });
      }

      // Get servicos count per unidade
      const { data: servicosData } = await supabase
        .from("servicos_periodicos")
        .select("unidade_id");

      const servicosCount: Record<string, number> = {};
      if (servicosData) {
        servicosData.forEach(s => {
          servicosCount[s.unidade_id] = (servicosCount[s.unidade_id] || 0) + 1;
        });
      }

      // Enrich unidades
      const enrichedUnidades: Unidade[] = (unidadesRes.data || []).map(u => ({
        ...u,
        responsavel_nome: u.responsavel_id ? profilesMap[u.responsavel_id] : null,
        servicos_count: servicosCount[u.id] || 0,
      }));

      setUnidades(enrichedUnidades);
      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar unidades",
        description: handleDbError(error).message,
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
        description: "Informe o nome da unidade.",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      nome: formData.nome.trim(),
      tipo: formData.tipo,
      endereco: formData.endereco || null,
      cidade: formData.cidade || null,
      estado: formData.estado || null,
      cep: formData.cep || null,
      responsavel_id: formData.responsavel_id || null,
      email_contato: formData.email_contato || null,
      telefone: formData.telefone || null,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingUnidade) {
        const { error } = await supabase
          .from("unidades")
          .update(payload)
          .eq("id", editingUnidade.id);
        if (error) throw error;
        toast({ title: "Unidade atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("unidades").insert({
          ...payload,
          organization_id: organization.id,
          created_by: user?.id,
        });
        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Sem permissão para criar unidade. Verifique seu acesso.");
          }
          throw error;
        }
        toast({ title: "Unidade cadastrada com sucesso!" });
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
      tipo: "filial",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      responsavel_id: "",
      email_contato: "",
      telefone: "",
    });
    setEditingUnidade(null);
  };

  const handleEdit = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      tipo: unidade.tipo,
      endereco: unidade.endereco || "",
      cidade: unidade.cidade || "",
      estado: unidade.estado || "",
      cep: unidade.cep || "",
      responsavel_id: unidade.responsavel_id || "",
      email_contato: unidade.email_contato || "",
      telefone: unidade.telefone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingUnidade) return;

    try {
      const { error } = await supabase
        .from("unidades")
        .delete()
        .eq("id", deletingUnidade.id);
      if (error) throw error;
      toast({ title: "Unidade excluída com sucesso!" });
      setIsDeleteDialogOpen(false);
      setDeletingUnidade(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (unidade: Unidade) => {
    try {
      const { error } = await supabase
        .from("unidades")
        .update({ is_active: !unidade.is_active })
        .eq("id", unidade.id);
      if (error) throw error;
      toast({ title: unidade.is_active ? "Unidade desativada" : "Unidade ativada" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns: DataTableColumn<Unidade>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (value: string, row: Unidade) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {value}
              {!row.is_active && (
                <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
              )}
            </div>
            {row.cidade && row.estado && (
              <div className="text-xs text-muted-foreground">
                {row.cidade}, {row.estado}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (value: string) => {
        const config = tipoConfig[value] || tipoConfig.filial;
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      key: "responsavel_nome",
      header: "Responsável",
      render: (value: string | null) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{value || "-"}</span>
        </div>
      ),
    },
    {
      key: "email_contato",
      header: "Contato",
      render: (value: string | null, row: Unidade) => (
        <div className="space-y-1">
          {value && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{value}</span>
            </div>
          )}
          {row.telefone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{row.telefone}</span>
            </div>
          )}
          {!value && !row.telefone && <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
    {
      key: "servicos_count",
      header: "Serviços",
      render: (value: number) => (
        <Badge variant="secondary">{value} serviços</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, row: Unidade) => (
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
                setDeletingUnidade(row);
                setIsDeleteDialogOpen(true);
              }}
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
        title="Unidades"
        description="Gerencie as filiais e unidades da organização."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={unidades}
        emptyState={{ title: "Nenhuma unidade cadastrada" }}
      />

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUnidade ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
            <DialogDescription>
              Cadastre uma unidade para vincular serviços periódicos.
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
                  placeholder="Nome da unidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matriz">Matriz</SelectItem>
                    <SelectItem value="filial">Filial</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  maxLength={2}
                  placeholder="UF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, responsavel_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email de contato</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email_contato}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_contato: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingUnidade ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os serviços vinculados a esta unidade também serão excluídos.
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
