import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, FileText, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ContractTemplate = {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  conteudo_template: string;
  campos_variaveis: any[];
  is_active: boolean;
  created_at: string;
};

const Templates = () => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "servico",
    conteudo_template: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (editingTemplate) {
        const { error } = await supabase
          .from("contract_templates")
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            tipo: formData.tipo,
            conteudo_template: formData.conteudo_template,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Template atualizado",
          description: "O template foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase.from("contract_templates").insert({
          nome: formData.nome,
          descricao: formData.descricao,
          tipo: formData.tipo,
          conteudo_template: formData.conteudo_template,
          created_by: userData.user?.id,
        });

        if (error) throw error;

        toast({
          title: "Template criado",
          description: "Novo template foi criado com sucesso.",
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({
        nome: "",
        descricao: "",
        tipo: "servico",
        conteudo_template: "",
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || "",
      tipo: template.tipo,
      conteudo_template: template.conteudo_template,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;

    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "O template foi removido com sucesso.",
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: { [key: string]: { label: string; variant: any } } = {
      servico: { label: "Serviço", variant: "default" },
      compra: { label: "Compra", variant: "secondary" },
      locacao: { label: "Locação", variant: "outline" },
      outro: { label: "Outro", variant: "outline" },
    };
    const config = tipos[tipo] || tipos.outro;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Contratos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie modelos padrão para criação rápida de contratos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              setFormData({
                nome: "",
                descricao: "",
                tipo: "servico",
                conteudo_template: "",
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </DialogTitle>
              <DialogDescription>
                Crie um modelo de contrato para reutilização
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Template</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Contrato</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="locacao">Locação</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo do Template</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo_template}
                  onChange={(e) =>
                    setFormData({ ...formData, conteudo_template: e.target.value })
                  }
                  rows={10}
                  placeholder="Digite o conteúdo do template aqui. Use {{campo}} para campos variáveis."
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use {`{{nome_campo}}`} para criar campos variáveis que serão preenchidos ao usar o template
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingTemplate(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTemplate ? "Atualizar" : "Criar"} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum template encontrado. Crie seu primeiro template!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  {getTipoBadge(template.tipo)}
                </div>
                <CardTitle className="mt-4">{template.nome}</CardTitle>
                <CardDescription>{template.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.conteudo_template}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
