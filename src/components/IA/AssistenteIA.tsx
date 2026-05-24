import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText, Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  contratoId: string;
  contratoConteudo?: string;
  tipoContrato?: string;
}

export function AssistenteIA({ contratoId, contratoConteudo, tipoContrato }: Props) {
  const [loading, setLoading] = useState<"resumo" | "sugestao" | null>(null);
  const [contexto, setContexto] = useState("");
  const qc = useQueryClient();

  const { data: insights = [] } = useQuery({
    queryKey: ["ai-insights", contratoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_ai_insights")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function run(fn: "ia-resumo-executivo" | "ia-sugerir-clausulas", kind: "resumo" | "sugestao") {
    if (!contratoConteudo || contratoConteudo.length < 50) {
      toast.error("Contrato sem conteúdo textual suficiente para análise.");
      return;
    }
    setLoading(kind);
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { contratoId, conteudo: contratoConteudo, tipoContrato, contexto },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro na IA");
      toast.success(kind === "resumo" ? "Resumo executivo gerado." : "Sugestões geradas.");
      qc.invalidateQueries({ queryKey: ["ai-insights", contratoId] });
    } catch (e: any) {
      toast.error(e.message || "Falha na IA");
    } finally {
      setLoading(null);
    }
  }

  const resumos = insights.filter((i: any) => i.tipo === "resumo_executivo");
  const sugestoes = insights.filter((i: any) => i.tipo === "sugestao_clausulas");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente IA do contrato
          </CardTitle>
          <CardDescription>Resumo executivo para gestores e sugestões de cláusulas com base no texto atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Contexto opcional (ex: 'fornecedor crítico', 'renovação anual')"
            value={contexto}
            onChange={(e) => setContexto(e.target.value.substring(0, 500))}
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run("ia-resumo-executivo", "resumo")} disabled={loading !== null}>
              {loading === "resumo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar resumo executivo
            </Button>
            <Button variant="secondary" onClick={() => run("ia-sugerir-clausulas", "sugestao")} disabled={loading !== null}>
              {loading === "sugestao" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              Sugerir cláusulas
            </Button>
          </div>
        </CardContent>
      </Card>

      {resumos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumo executivo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {resumos.slice(0, 1).map((i: any) => {
              const c = i.conteudo || {};
              return (
                <div key={i.id} className="space-y-2 text-sm">
                  {c.tldr && <p className="font-medium">{c.tldr}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                    {c.objetivo && <div><b>Objetivo:</b> {c.objetivo}</div>}
                    {c.partes && <div><b>Partes:</b> {c.partes}</div>}
                    {c.valor && <div><b>Valor:</b> {c.valor}</div>}
                    {c.prazo && <div><b>Prazo:</b> {c.prazo}</div>}
                  </div>
                  {c.pontos_de_atencao_gestor?.length > 0 && (
                    <div>
                      <p className="font-medium">Pontos de atenção do gestor:</p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {c.pontos_de_atencao_gestor.map((p: string, idx: number) => <li key={idx}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {sugestoes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sugestões de cláusulas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sugestoes.slice(0, 1).map((i: any) => {
              const lista = i.conteudo?.sugestoes ?? [];
              return (
                <div key={i.id} className="space-y-3">
                  {lista.map((s: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{s.titulo}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline">{s.categoria}</Badge>
                          <Badge variant={s.prioridade === "alta" ? "destructive" : s.prioridade === "media" ? "default" : "secondary"}>
                            {s.prioridade}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.justificativa}</p>
                      {s.redacao_sugerida && (
                        <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap font-sans">{s.redacao_sugerida}</pre>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
