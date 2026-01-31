import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Receipt,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FranquiaRenovacaoWorkflow } from "@/components/Franquias";
import { cn } from "@/lib/utils";

interface Franquia {
  id: string;
  nome_completo: string;
  cnpj: string | null;
  regime_tributario: string | null;
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
  updated_at: string;
}

const statusContratoLabels: Record<string, string> = {
  pendente_assinatura: "Pendente de Assinatura",
  assinado: "Assinado",
  vigente: "Vigente",
  vencido: "Vencido",
  encerrado: "Encerrado",
};

const statusVigenciaLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-500" },
  proximo_vencer: { label: "Próximo ao Vencimento", color: "bg-amber-500" },
  vencido: { label: "Vencido", color: "bg-red-500" },
  renovado: { label: "Renovado", color: "bg-blue-500" },
};

export default function FranquiaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
  const [formData, setFormData] = useState<Partial<Franquia>>({});

  // Fetch franquia
  const { data: franquia, isLoading } = useQuery({
    queryKey: ["franquia", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franquias")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Franquia;
    },
    enabled: !!id,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (franquia) {
      setFormData(franquia);
    }
  }, [franquia]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Franquia>) => {
      const { error } = await supabase
        .from("franquias")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franquia", id] });
      queryClient.invalidateQueries({ queryKey: ["franquias"] });
      toast({ title: "Franquia atualizada com sucesso!" });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData(franquia || {});
    setIsEditing(false);
  };

  const handleWorkflowToggle = (step: string, value: boolean) => {
    const newData = { ...formData, [step]: value };
    setFormData(newData);
    updateMutation.mutate({ [step]: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!franquia) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Franquia não encontrada</p>
        <Button variant="outline" onClick={() => navigate("/franquias")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const vigenciaInfo = statusVigenciaLabels[franquia.status_vigencia] || {
    label: franquia.status_vigencia,
    color: "bg-gray-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/franquias")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{franquia.nome_completo}</h1>
              <div className={cn("h-2.5 w-2.5 rounded-full", vigenciaInfo.color)} />
            </div>
            <p className="text-muted-foreground">
              {franquia.cnpj || "CNPJ não informado"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Franquia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Dados da Franquia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Nome Completo</Label>
                  {isEditing ? (
                    <Input
                      value={formData.nome_completo || ""}
                      onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{franquia.nome_completo}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">CNPJ</Label>
                  {isEditing ? (
                    <Input
                      value={formData.cnpj || ""}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium font-mono">{franquia.cnpj || "-"}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Regime Tributário</Label>
                  {isEditing ? (
                    <Select
                      value={formData.regime_tributario || ""}
                      onValueChange={(v) => setFormData({ ...formData, regime_tributario: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{franquia.regime_tributario || "-"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contrato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Status do Contrato</Label>
                  {isEditing ? (
                    <Select
                      value={formData.status_contrato || ""}
                      onValueChange={(v) => setFormData({ ...formData, status_contrato: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente_assinatura">Pendente de Assinatura</SelectItem>
                        <SelectItem value="assinado">Assinado</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="mt-1">
                      {statusContratoLabels[franquia.status_contrato] || franquia.status_contrato}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Status de Vigência</Label>
                  {isEditing ? (
                    <Select
                      value={formData.status_vigencia || ""}
                      onValueChange={(v) => setFormData({ ...formData, status_vigencia: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="proximo_vencer">Próximo ao Vencimento</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="renovado">Renovado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={cn("mt-1", vigenciaInfo.color, "text-white")}>
                      {vigenciaInfo.label}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Assinatura</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.data_assinatura || ""}
                      onChange={(e) => setFormData({ ...formData, data_assinatura: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">
                      {franquia.data_assinatura
                        ? format(new Date(franquia.data_assinatura), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Término</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.data_termino || ""}
                      onChange={(e) => setFormData({ ...formData, data_termino: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">
                      {franquia.data_termino
                        ? format(new Date(franquia.data_termino), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nota Fiscal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5" />
                Nota Fiscal de Renovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Número da NF</Label>
                  {isEditing ? (
                    <Input
                      value={formData.numero_nf || ""}
                      onChange={(e) => setFormData({ ...formData, numero_nf: e.target.value })}
                      placeholder="Ex: 12345"
                    />
                  ) : (
                    <p className="font-medium font-mono">{franquia.numero_nf || "-"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Emissão</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.data_emissao_nf || ""}
                      onChange={(e) => setFormData({ ...formData, data_emissao_nf: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">
                      {franquia.data_emissao_nf
                        ? format(new Date(franquia.data_emissao_nf), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a franquia..."
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {franquia.observacoes || "Nenhuma observação registrada."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow de Renovação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Workflow de Renovação
              </CardTitle>
              <CardDescription>
                Acompanhe as etapas do processo de renovação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FranquiaRenovacaoWorkflow
                consultoraInformada={formData.consultora_informada ?? franquia.consultora_informada}
                renovacaoAceita={formData.renovacao_aceita ?? franquia.renovacao_aceita}
                novoContratoEnviado={formData.novo_contrato_enviado ?? franquia.novo_contrato_enviado}
                contratoNovoAssinado={formData.contrato_novo_assinado ?? franquia.contrato_novo_assinado}
                onStepToggle={handleWorkflowToggle}
                interactive
              />
            </CardContent>
          </Card>

          {/* Metadados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>
                  {format(new Date(franquia.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última atualização</span>
                <span>
                  {format(new Date(franquia.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
