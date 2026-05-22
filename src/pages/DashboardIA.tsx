import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, FileText, Lightbulb, AlertTriangle, TrendingUp, ArrowRight, FileSearch, ShieldAlert, ScrollText } from "lucide-react";
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

  const { data: skillAnalyses = [], isLoading: loadingSkills } = useQuery({
    queryKey: ["dashboard-ia-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_analysis")
        .select("contrato_id, skill_aplicada, payload_estruturado, created_at")
        .not("skill_aplicada", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Array<{ contrato_id: string; skill_aplicada: string; payload_estruturado: any; created_at: string }>;
    },
  });

  // Latest analysis per (contrato, skill)
  const skillStats = useMemo(() => {
    const latest = new Map<string, { skill: string; payload: any }>();
    skillAnalyses.forEach((a) => {
      const key = `${a.contrato_id}::${a.skill_aplicada}`;
      if (!latest.has(key)) latest.set(key, { skill: a.skill_aplicada, payload: a.payload_estruturado });
    });

    const bySkill: Record<string, any[]> = {
      "contract-review": [],
      "nda-triage": [],
      "risk-assessment": [],
      compliance: [],
    };
    latest.forEach((v) => {
      if (bySkill[v.skill]) bySkill[v.skill].push(v.payload);
    });

    // contract-review: count clause statuses
    const review = { total: bySkill["contract-review"].length, verde: 0, amarelo: 0, vermelho: 0 };
    bySkill["contract-review"].forEach((p) => {
      (p?.clausulas ?? []).forEach((c: any) => {
        if (c?.status === "verde" || c?.status === "ok") review.verde++;
        else if (c?.status === "amarelo" || c?.status === "atencao") review.amarelo++;
        else if (c?.status === "vermelho" || c?.status === "critico") review.vermelho++;
      });
    });

    // nda-triage: aprovar / revisar / rejeitar
    const nda = { total: bySkill["nda-triage"].length, aprovar: 0, revisar: 0, rejeitar: 0 };
    bySkill["nda-triage"].forEach((p) => {
      const c = p?.classificacao ?? p?.recomendacao;
      if (c === "aprovar") nda.aprovar++;
      else if (c === "revisar") nda.revisar++;
      else if (c === "rejeitar") nda.rejeitar++;
    });

    // risk-assessment: critical risks + exposure sum
    const risk = { total: bySkill["risk-assessment"].length, criticos: 0, exposicao: 0 };
    bySkill["risk-assessment"].forEach((p) => {
      (p?.riscos ?? []).forEach((r: any) => {
        if (r?.severidade === "critico" || r?.nivel === "critico") risk.criticos++;
        const exp = Number(r?.exposicao_estimada ?? r?.exposicao ?? 0);
        if (!isNaN(exp)) risk.exposicao += exp;
      });
    });

    // compliance: frameworks with open gaps
    const compMap = new Map<string, number>();
    let compTotal = bySkill["compliance"].length;
    bySkill["compliance"].forEach((p) => {
      (p?.frameworks ?? []).forEach((f: any) => {
        const hasGap = (f?.gaps?.length ?? 0) > 0 || f?.status === "nao_conforme" || f?.status === "gap";
        if (hasGap && f?.nome) compMap.set(f.nome, (compMap.get(f.nome) ?? 0) + 1);
      });
    });
    const compTopGaps = Array.from(compMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

    return { review, nda, risk, compliance: { total: compTotal, topGaps: compTopGaps } };
  }, [skillAnalyses]);

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
