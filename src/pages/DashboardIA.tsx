import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, FileText, Lightbulb, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Insight {
  id: string;
  contrato_id: string;
  tipo: string;
  conteudo: any;
  created_at: string;
  model: string | null;
  contratos?: { id: string; titulo: string; numero_contrato: string | null; status: string };
}

export default function DashboardIA() {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["dashboard-ia-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_ai_insights")
        .select("id, contrato_id, tipo, conteudo, created_at, model, contratos(id, titulo, numero_contrato, status)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Insight[];
    },
  });

  const { data: riscos = [] } = useQuery({
    queryKey: ["dashboard-ia-riscos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dash_contratos_risco", { p_limite: 10 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const resumos = insights.filter((i) => i.tipo === "resumo_executivo");
    const sugestoesInsights = insights.filter((i) => i.tipo === "sugestao_clausulas");
    const contratosCobertos = new Set(insights.map((i) => i.contrato_id)).size;

    const sugestoesFlat: Array<{ contratoId: string; titulo: string; numero: string | null; s: any; created_at: string }> = [];
    sugestoesInsights.forEach((i) => {
      (i.conteudo?.sugestoes ?? []).forEach((s: any) => {
        sugestoesFlat.push({
          contratoId: i.contrato_id,
          titulo: i.contratos?.titulo ?? "—",
          numero: i.contratos?.numero_contrato ?? null,
          s,
          created_at: i.created_at,
        });
      });
    });

    const altas = sugestoesFlat.filter((x) => x.s?.prioridade === "alta");
    return { resumos, sugestoesInsights, contratosCobertos, sugestoesFlat, altas };
  }, [insights]);

  // Latest resumo per contract
  const ultimosResumos = useMemo(() => {
    const map = new Map<string, Insight>();
    stats.resumos.forEach((i) => {
      if (!map.has(i.contrato_id)) map.set(i.contrato_id, i);
    });
    return Array.from(map.values()).slice(0, 6);
  }, [stats.resumos]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Dashboard Executivo de IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão consolidada de resumos, sugestões e riscos analisados por IA na sua organização.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={FileText} label="Contratos com análise IA" value={stats.contratosCobertos} loading={isLoading} />
        <KpiCard icon={Sparkles} label="Resumos executivos" value={stats.resumos.length} loading={isLoading} />
        <KpiCard icon={Lightbulb} label="Sugestões geradas" value={stats.sugestoesFlat.length} loading={isLoading} />
        <KpiCard icon={AlertTriangle} label="Sugestões prioridade alta" value={stats.altas.length} loading={isLoading} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top riscos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-destructive" /> Top contratos por risco
            </CardTitle>
            <CardDescription>Score calculado pela análise contratual.</CardDescription>
          </CardHeader>
          <CardContent>
            {riscos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma análise de risco disponível ainda.</p>
            ) : (
              <ul className="divide-y">
                {riscos.map((r: any) => (
                  <li key={r.contrato_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/contratos/${r.contrato_id}`} className="text-sm font-medium hover:underline truncate block">
                        {r.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.numero_contrato} {r.fornecedor_nome ? `· ${r.fornecedor_nome}` : ""}
                      </p>
                    </div>
                    <RiskBadge score={Number(r.score_risco)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sugestões prioridade alta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Sugestões prioritárias
            </CardTitle>
            <CardDescription>Cláusulas que a IA marcou como prioridade alta.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.altas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sugestão de prioridade alta no momento.</p>
            ) : (
              <ul className="space-y-3">
                {stats.altas.slice(0, 8).map((row, idx) => (
                  <li key={idx} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.s.titulo}</p>
                        <Link to={`/contratos/${row.contratoId}`} className="text-xs text-muted-foreground hover:underline truncate block">
                          {row.titulo} {row.numero ? `· ${row.numero}` : ""}
                        </Link>
                      </div>
                      <Badge variant="destructive">alta</Badge>
                    </div>
                    {row.s.justificativa && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{row.s.justificativa}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumos executivos recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumos executivos recentes</CardTitle>
          <CardDescription>Última análise por contrato.</CardDescription>
        </CardHeader>
        <CardContent>
          {ultimosResumos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum resumo executivo gerado ainda. Abra um contrato e use o Assistente IA.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ultimosResumos.map((i) => {
                const c = i.conteudo || {};
                return (
                  <div key={i.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/contratos/${i.contrato_id}`} className="text-sm font-semibold hover:underline truncate block">
                          {i.contratos?.titulo ?? "Contrato"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {i.contratos?.numero_contrato} · {format(new Date(i.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/contratos/${i.contrato_id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    {c.tldr && <p className="text-sm">{c.tldr}</p>}
                    {c.pontos_de_atencao_gestor?.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
                        {c.pontos_de_atencao_gestor.slice(0, 3).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  variant,
}: {
  icon: any;
  label: string;
  value: number;
  loading?: boolean;
  variant?: "warning";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <Icon className={`h-5 w-5 ${variant === "warning" ? "text-destructive" : "text-primary"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ score }: { score: number }) {
  if (isNaN(score)) return <Badge variant="outline">—</Badge>;
  const variant = score >= 70 ? "destructive" : score >= 40 ? "default" : "secondary";
  return <Badge variant={variant as any}>{Math.round(score)}</Badge>;
}
