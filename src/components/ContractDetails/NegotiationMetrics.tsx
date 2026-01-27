import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Timer, 
  TrendingDown, 
  Users, 
  FileEdit, 
  Star, 
  Plus,
  Save,
  Calendar,
  DollarSign,
  Target,
  ArrowRight
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NegotiationMetric {
  id: string;
  contrato_id: string;
  data_inicio_negociacao: string | null;
  data_fim_negociacao: string | null;
  numero_revisoes: number;
  tempo_total_dias: number | null;
  tempo_por_etapa: Record<string, any>;
  partes_envolvidas: any[];
  principais_pontos_negociados: any[];
  resultado: string | null;
  valor_inicial: number | null;
  valor_final: number | null;
  economia_percentual: number | null;
  satisfacao_partes: number | null;
  notas: string | null;
  created_at: string;
}

interface NegotiationMetricsProps {
  contratoId: string;
}

const RESULT_OPTIONS = [
  { value: "aprovado", label: "Aprovado", color: "bg-success/10 text-success" },
  { value: "rejeitado", label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  { value: "cancelado", label: "Cancelado", color: "bg-muted text-muted-foreground" },
  { value: "em_andamento", label: "Em Andamento", color: "bg-amber-500/10 text-amber-500" },
];

export function NegotiationMetrics({ contratoId }: NegotiationMetricsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<NegotiationMetric | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    data_inicio_negociacao: "",
    data_fim_negociacao: "",
    numero_revisoes: 0,
    valor_inicial: "",
    valor_final: "",
    resultado: "em_andamento",
    satisfacao_partes: 3,
    notas: "",
    partes_envolvidas: "",
    principais_pontos: "",
  });

  useEffect(() => {
    fetchMetrics();
  }, [contratoId]);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("negotiation_metrics")
        .select("*")
        .eq("contrato_id", contratoId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMetrics(data as NegotiationMetric);
        setFormData({
          data_inicio_negociacao: data.data_inicio_negociacao || "",
          data_fim_negociacao: data.data_fim_negociacao || "",
          numero_revisoes: data.numero_revisoes || 0,
          valor_inicial: data.valor_inicial?.toString() || "",
          valor_final: data.valor_final?.toString() || "",
          resultado: data.resultado || "em_andamento",
          satisfacao_partes: data.satisfacao_partes || 3,
          notas: data.notas || "",
          partes_envolvidas: (data.partes_envolvidas as any[])?.join(", ") || "",
          principais_pontos: (data.principais_pontos_negociados as any[])?.join(", ") || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar métricas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valorInicial = parseFloat(formData.valor_inicial) || null;
      const valorFinal = parseFloat(formData.valor_final) || null;
      
      let economiaPercentual = null;
      if (valorInicial && valorFinal && valorInicial > 0) {
        economiaPercentual = ((valorInicial - valorFinal) / valorInicial) * 100;
      }

      let tempoTotalDias = null;
      if (formData.data_inicio_negociacao && formData.data_fim_negociacao) {
        tempoTotalDias = differenceInDays(
          new Date(formData.data_fim_negociacao),
          new Date(formData.data_inicio_negociacao)
        );
      }

      const payload = {
        contrato_id: contratoId,
        data_inicio_negociacao: formData.data_inicio_negociacao || null,
        data_fim_negociacao: formData.data_fim_negociacao || null,
        numero_revisoes: formData.numero_revisoes,
        tempo_total_dias: tempoTotalDias,
        valor_inicial: valorInicial,
        valor_final: valorFinal,
        economia_percentual: economiaPercentual,
        resultado: formData.resultado,
        satisfacao_partes: formData.satisfacao_partes,
        notas: formData.notas || null,
        partes_envolvidas: formData.partes_envolvidas
          ? formData.partes_envolvidas.split(",").map(p => p.trim())
          : [],
        principais_pontos_negociados: formData.principais_pontos
          ? formData.principais_pontos.split(",").map(p => p.trim())
          : [],
        created_by: user.id,
      };

      if (metrics) {
        const { error } = await supabase
          .from("negotiation_metrics")
          .update(payload)
          .eq("id", metrics.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("negotiation_metrics")
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Métricas salvas",
        description: "As métricas de negociação foram atualizadas.",
      });

      setIsEditing(false);
      fetchMetrics();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar métricas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics && !isEditing) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-8">
          <EmptyState
            icon={Target}
            title="Sem métricas de negociação"
            description="Registre as métricas da negociação deste contrato"
            action={{
              label: "Registrar Métricas",
              onClick: () => setIsEditing(true),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileEdit className="h-4 w-4" />
            {metrics ? "Editar" : "Registrar"} Métricas de Negociação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Início da Negociação</Label>
              <Input
                type="date"
                value={formData.data_inicio_negociacao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_inicio_negociacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim da Negociação</Label>
              <Input
                type="date"
                value={formData.data_fim_negociacao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_fim_negociacao: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Número de Revisões</Label>
              <Input
                type="number"
                value={formData.numero_revisoes}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_revisoes: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Inicial (R$)</Label>
              <Input
                type="number"
                value={formData.valor_inicial}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_inicial: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Final (R$)</Label>
              <Input
                type="number"
                value={formData.valor_final}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_final: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select
                value={formData.resultado}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resultado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satisfação das Partes (1-5)</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    onClick={() => setFormData(prev => ({ ...prev, satisfacao_partes: star }))}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        star <= formData.satisfacao_partes
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Partes Envolvidas (separadas por vírgula)</Label>
            <Input
              value={formData.partes_envolvidas}
              onChange={(e) => setFormData(prev => ({ ...prev, partes_envolvidas: e.target.value }))}
              placeholder="Ex: Jurídico, Compras, Fornecedor"
            />
          </div>

          <div className="space-y-2">
            <Label>Principais Pontos Negociados (separados por vírgula)</Label>
            <Input
              value={formData.principais_pontos}
              onChange={(e) => setFormData(prev => ({ ...prev, principais_pontos: e.target.value }))}
              placeholder="Ex: Prazo, Valor, Garantias"
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observações sobre a negociação..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Métricas"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resultConfig = RESULT_OPTIONS.find(r => r.value === metrics?.resultado) || RESULT_OPTIONS[3];

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Métricas de Negociação
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Análise do ciclo de negociação
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <FileEdit className="h-3 w-3 mr-1" />
          Editar
        </Button>
      </CardHeader>
      <CardContent>
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tempo Total</span>
              <Timer className="h-4 w-4 text-primary" />
            </div>
            <span className="text-2xl font-bold">
              {metrics?.tempo_total_dias || "—"}
            </span>
            <span className="text-sm text-muted-foreground ml-1">dias</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Revisões</span>
              <FileEdit className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {metrics?.numero_revisoes || 0}
            </span>
            <span className="text-sm text-muted-foreground ml-1">ciclos</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-4 rounded-lg border",
              (metrics?.economia_percentual || 0) > 0
                ? "bg-success/5 border-success/20"
                : "bg-muted border-border"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Economia</span>
              <TrendingDown className={cn(
                "h-4 w-4",
                (metrics?.economia_percentual || 0) > 0 ? "text-success" : "text-muted-foreground"
              )} />
            </div>
            <span className={cn(
              "text-2xl font-bold",
              (metrics?.economia_percentual || 0) > 0 ? "text-success" : "text-muted-foreground"
            )}>
              {metrics?.economia_percentual?.toFixed(1) || "—"}
            </span>
            <span className="text-sm text-muted-foreground ml-1">%</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-lg bg-muted border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Satisfação</span>
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= (metrics?.satisfacao_partes || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Value Comparison */}
        {(metrics?.valor_inicial || metrics?.valor_final) && (
          <div className="p-4 rounded-lg bg-muted/50 border mb-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Valor Inicial</p>
                <p className="text-lg font-semibold">{formatCurrency(metrics?.valor_inicial)}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Valor Final</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(metrics?.valor_final)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", resultConfig.color)}>
              {resultConfig.label}
            </Badge>
            {metrics?.data_inicio_negociacao && (
              <span className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(new Date(metrics.data_inicio_negociacao), "dd/MM/yyyy", { locale: ptBR })}
                {metrics.data_fim_negociacao && (
                  <> → {format(new Date(metrics.data_fim_negociacao), "dd/MM/yyyy", { locale: ptBR })}</>
                )}
              </span>
            )}
          </div>

          {((metrics?.partes_envolvidas as any[])?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="h-4 w-4 text-muted-foreground" />
              {(metrics?.partes_envolvidas as any[])?.map((parte, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {parte}
                </Badge>
              ))}
            </div>
          )}

          {((metrics?.principais_pontos_negociados as any[])?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="h-4 w-4 text-muted-foreground" />
              {(metrics?.principais_pontos_negociados as any[])?.map((ponto, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {ponto}
                </Badge>
              ))}
            </div>
          )}

          {metrics?.notas && (
            <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-lg">
              {metrics.notas}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
