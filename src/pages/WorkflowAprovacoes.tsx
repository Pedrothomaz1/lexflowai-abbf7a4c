import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, UserPlus, ArrowDown, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type ApprovalLevel = {
  nivel: number;
  aprovadores: string[];
  minimo_aprovacoes: number;
};

type Workflow = {
  id: string;
  nome: string;
  tipo_contrato: string;
  aprovacao_paralela: boolean;
  is_active: boolean;
  niveis: ApprovalLevel[];
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

export default function WorkflowAprovacoes() {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    tipo_contrato: "prestacao_servicos",
    aprovacao_paralela: false,
    is_active: true,
  });
  
  const [niveis, setNiveis] = useState<ApprovalLevel[]>([
    { nivel: 1, aprovadores: [], minimo_aprovacoes: 1 }
  ]);

  useEffect(() => {
    fetchWorkflows();
    fetchProfiles();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from("approval_workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar workflows",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (niveis.some(n => n.aprovadores.length === 0)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Todos os níveis devem ter pelo menos um aprovador",
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

    try {
      const workflow = {
        ...formData,
        niveis: niveis,
        organization_id: organization.id,
      };

      if (editingWorkflow) {
        const { error } = await supabase
          .from("approval_workflows")
          .update(workflow)
          .eq("id", editingWorkflow.id);

        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Você não tem permissão para esta ação.");
          }
          throw error;
        }
        toast({ title: "Workflow atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("approval_workflows")
          .insert([workflow]);

        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Você não tem permissão para criar workflows.");
          }
          throw error;
        }
        toast({ title: "Workflow criado com sucesso!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchWorkflows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar workflow",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo_contrato: "prestacao_servico",
      aprovacao_paralela: false,
      is_active: true,
    });
    setNiveis([{ nivel: 1, aprovadores: [], minimo_aprovacoes: 1 }]);
    setEditingWorkflow(null);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      nome: workflow.nome,
      tipo_contrato: workflow.tipo_contrato,
      aprovacao_paralela: workflow.aprovacao_paralela,
      is_active: workflow.is_active,
    });
    setNiveis(workflow.niveis);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este workflow?")) return;

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Workflow excluído com sucesso!" });
      fetchWorkflows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir workflow",
        description: error.message,
      });
    }
  };

  const addNivel = () => {
    setNiveis([...niveis, { 
      nivel: niveis.length + 1, 
      aprovadores: [], 
      minimo_aprovacoes: 1 
    }]);
  };

  const removeNivel = (index: number) => {
    if (niveis.length === 1) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Deve haver pelo menos um nível de aprovação",
      });
      return;
    }
    const newNiveis = niveis.filter((_, i) => i !== index);
    setNiveis(newNiveis.map((n, i) => ({ ...n, nivel: i + 1 })));
  };

  const updateNivel = (index: number, field: keyof ApprovalLevel, value: any) => {
    const newNiveis = [...niveis];
    newNiveis[index] = { ...newNiveis[index], [field]: value };
    setNiveis(newNiveis);
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      prestacao_servico: "Prestação de Serviço",
      compra_venda: "Compra e Venda",
      locacao: "Locação",
      parceria: "Parceria",
      confidencialidade: "Confidencialidade",
      outro: "Outro",
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando workflows...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflows de Aprovação</h1>
          <p className="text-muted-foreground mt-2">
            Configure fluxos de aprovação personalizados por tipo de contrato
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow ? "Editar Workflow" : "Novo Workflow"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Workflow</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Aprovação Padrão"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                  <Select
                    value={formData.tipo_contrato}
                    onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prestacao_servico">Prestação de Serviço</SelectItem>
                      <SelectItem value="compra_venda">Compra e Venda</SelectItem>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="parceria">Parceria</SelectItem>
                      <SelectItem value="confidencialidade">Confidencialidade</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Switch
                  id="aprovacao_paralela"
                  checked={formData.aprovacao_paralela}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, aprovacao_paralela: checked })
                  }
                />
                <Label htmlFor="aprovacao_paralela" className="cursor-pointer text-sm">
                  Aprovação Paralela (todos os níveis simultaneamente)
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm">
                  Workflow Ativo
                </Label>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Níveis de Aprovação</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addNivel}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Nível
                  </Button>
                </div>

                {niveis.map((nivel, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Nível {nivel.nivel}</CardTitle>
                        {niveis.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNivel(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Aprovadores</Label>
                        <Select
                          value=""
                          onValueChange={(userId) => {
                            if (!nivel.aprovadores.includes(userId)) {
                              updateNivel(index, "aprovadores", [...nivel.aprovadores, userId]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Adicionar aprovador" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <div className="max-w-[250px] truncate">
                                  {profile.full_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {nivel.aprovadores.map((aprovadorId) => {
                            const profile = profiles.find(p => p.id === aprovadorId);
                            return (
                              <Badge key={aprovadorId} variant="secondary" className="max-w-[200px]">
                                <span className="truncate">{profile?.full_name || 'Usuário'}</span>
                                <button
                                  type="button"
                                  className="ml-2 hover:text-destructive"
                                  onClick={() => {
                                    updateNivel(
                                      index,
                                      "aprovadores",
                                      nivel.aprovadores.filter(id => id !== aprovadorId)
                                    );
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Mínimo de Aprovações Necessárias</Label>
                        <Input
                          type="number"
                          min="1"
                          max={nivel.aprovadores.length || 1}
                          value={nivel.minimo_aprovacoes}
                          onChange={(e) => 
                            updateNivel(index, "minimo_aprovacoes", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingWorkflow ? "Atualizar" : "Criar"} Workflow
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum workflow configurado ainda
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{workflow.nome}</CardTitle>
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      {workflow.aprovacao_paralela && (
                        <Badge variant="outline">Paralelo</Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      Tipo: {getTipoLabel(workflow.tipo_contrato)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(workflow)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-2">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only sm:not-sr-only sm:ml-2">Excluir</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 overflow-x-auto pb-2">
                    {workflow.niveis.map((nivel, index) => (
                      <div key={nivel.nivel} className="flex items-center min-w-[200px]">
                        <div className="flex-1">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">
                                Nível {nivel.nivel}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="text-xs text-muted-foreground">
                                {nivel.aprovadores.length} aprovador(es)
                              </div>
                              <div className="text-xs">
                                Mínimo: {nivel.minimo_aprovacoes} aprovação(ões)
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        {index < workflow.niveis.length - 1 && (
                          <div className="mx-2 flex-shrink-0">
                            {workflow.aprovacao_paralela ? (
                              <ArrowDown className="h-4 w-4 text-muted-foreground sm:hidden" />
                            ) : (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
