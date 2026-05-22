import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Scale, Send } from "lucide-react";

interface Props {
  contratoId: string;
  nivelRisco: string | null;
  onChanged?: () => void;
}

type Review = {
  id: string;
  decisao: string;
  parecer: string;
  nivel_risco_avaliado: string;
  created_at: string;
  revisor_id: string;
};

const DECISOES = [
  { value: "aprovado", label: "Aprovar", variant: "default" as const },
  { value: "aprovado_com_ressalvas", label: "Aprovar com ressalvas", variant: "secondary" as const },
  { value: "solicitado_ajuste", label: "Solicitar ajuste", variant: "outline" as const },
  { value: "reprovado", label: "Reprovar", variant: "destructive" as const },
];

const NIVEIS = ["baixo", "medio", "alto", "critico"];

export function LegalReviewPanel({ contratoId, nivelRisco, onChanged }: Props) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [decisao, setDecisao] = useState("aprovado");
  const [parecer, setParecer] = useState("");
  const [nivelAval, setNivelAval] = useState(nivelRisco ?? "medio");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intake_legal_reviews")
      .select("id,decisao,parecer,nivel_risco_avaliado,created_at,revisor_id")
      .eq("contrato_id", contratoId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar revisões", description: error.message, variant: "destructive" });
    else setReviews((data as Review[]) ?? []);
    setLoading(false);
  }, [contratoId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (nivelRisco) setNivelAval(nivelRisco);
  }, [nivelRisco]);

  const handleSubmit = async () => {
    if (!organization?.id || !user?.id) return;
    if (parecer.trim().length < 10) {
      toast({ title: "Parecer muito curto", description: "Mínimo 10 caracteres.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("intake_legal_reviews").insert({
      organization_id: organization.id,
      contrato_id: contratoId,
      decisao,
      parecer: parecer.trim(),
      nivel_risco_avaliado: nivelAval,
      revisor_id: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registrar revisão", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Revisão registrada" });
      setParecer("");
      void load();
      onChanged?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" /> Revisão Legal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nível de risco avaliado</Label>
            <Select value={nivelAval} onValueChange={setNivelAval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Decisão</Label>
            <Select value={decisao} onValueChange={setDecisao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECISOES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Parecer</Label>
          <Textarea value={parecer} onChange={(e) => setParecer(e.target.value)} rows={4} placeholder="Análise jurídica, ressalvas, recomendações…" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Registrar revisão
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Histórico</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma revisão registrada ainda.</p>
          ) : (
            reviews.map((r) => {
              const d = DECISOES.find((x) => x.value === r.decisao);
              return (
                <div key={r.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={d?.variant ?? "outline"}>{d?.label ?? r.decisao}</Badge>
                      <Badge variant="outline">Risco: {r.nivel_risco_avaliado}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.parecer}</p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
