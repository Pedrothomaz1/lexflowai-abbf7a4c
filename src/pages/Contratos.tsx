import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, Eye, Download } from "lucide-react";
import { exportContratosPDF } from "@/utils/pdfExport";

type Contrato = {
  id: string;
  numero_contrato: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: string;
  valor_total: number | null;
  moeda: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  fornecedor_id: string | null;
  created_at: string;
};

type Fornecedor = {
  id: string;
  nome: string;
};

const Contratos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    numero_contrato: "",
    titulo: "",
    descricao: "",
    tipo: "outro",
    valor_total: "",
    moeda: "BRL",
    data_inicio: "",
    data_fim: "",
    fornecedor_id: "",
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchContratos();
    fetchFornecedores();
  }, []);

  const fetchContratos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar contratos",
        description: error.message,
      });
    } else {
      setContratos(data || []);
    }
    setLoading(false);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .order("nome");
    
    setFornecedores(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsAnalyzing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload do arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contratos-documentos')
        .upload(fileName, file);

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar arquivo",
          description: uploadError.message,
        });
        setIsAnalyzing(false);
        return;
      }

      // Salvar URL do arquivo
      setFormData(prev => ({
        ...prev,
        arquivo_url: fileName
      }));
      
      toast({
        title: "Arquivo enviado com sucesso!",
        description: "Preencha as datas de início e término do contrato",
      });

    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validar campos obrigatórios
    if (!formData.fornecedor_id || !formData.data_inicio || !formData.data_fim) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos marcados com *",
      });
      return;
    }

    const { error } = await supabase.from("contratos").insert([
      {
        ...formData,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
        fornecedor_id: formData.fornecedor_id,
        created_by: user.id,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar contrato",
        description: error.message,
      });
    } else {
      toast({
        title: "Contrato criado com sucesso!",
      });
      setDialogOpen(false);
      setFormData({
        numero_contrato: "",
        titulo: "",
        descricao: "",
        tipo: "outro",
        valor_total: "",
        moeda: "BRL",
        data_inicio: "",
        data_fim: "",
        fornecedor_id: "",
      });
      setUploadedFile(null);
      fetchContratos();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      rascunho: "secondary",
      ativo: "default",
      suspenso: "outline",
      cancelado: "destructive",
      concluido: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const labels: Record<string, string> = {
      prestacao_servico: "Prestação de Serviço",
      fornecimento: "Fornecimento",
      locacao: "Locação",
      outro: "Outro",
    };
    return <Badge variant="outline">{labels[tipo] || tipo}</Badge>;
  };

  const handleExportPDF = () => {
    exportContratosPDF(contratos, fornecedores);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os seus contratos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Contrato</DialogTitle>
              <DialogDescription>
                Preencha os dados do contrato
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_contrato">Número do Contrato *</Label>
                  <Input
                    id="numero_contrato"
                    value={formData.numero_contrato}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_contrato: e.target.value })
                    }
                    required
                    placeholder="Ex: CT-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prestacao_servico">Prestação de Serviço</SelectItem>
                      <SelectItem value="fornecimento">Fornecimento</SelectItem>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arquivo">Anexar Contrato (PDF)</Label>
                <Input
                  id="arquivo"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                />
                {isAnalyzing && (
                  <p className="text-sm text-muted-foreground">
                    Enviando arquivo...
                  </p>
                )}
                {uploadedFile && !isAnalyzing && (
                  <p className="text-sm text-green-600">
                    ✓ Arquivo anexado: {uploadedFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fornecedor_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_total: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moeda">Moeda</Label>
                  <Select
                    value={formData.moeda}
                    onValueChange={(value) =>
                      setFormData({ ...formData, moeda: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Término *</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) =>
                      setFormData({ ...formData, data_fim: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Contrato</Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>
            {contratos.length} contrato(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum contrato cadastrado ainda.</p>
              <p className="text-sm mt-2">Clique em "Novo Contrato" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-medium">
                      {contrato.numero_contrato}
                    </TableCell>
                    <TableCell>{contrato.titulo}</TableCell>
                    <TableCell>{getTipoBadge(contrato.tipo)}</TableCell>
                    <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                    <TableCell>
                      {contrato.valor_total
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: contrato.moeda || "BRL",
                          }).format(contrato.valor_total)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {contrato.data_inicio && contrato.data_fim ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(contrato.data_inicio).toLocaleDateString("pt-BR")} -{" "}
                          {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/contratos/${contrato.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contratos;
