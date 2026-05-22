import { Badge } from "@/components/ui/badge";
import {
  AnimatedCard,
  AnimatedCardContent,
  AnimatedCardHeader,
} from "@/components/ui/animated-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ScrollText,
  Gavel,
} from "lucide-react";
import { motion } from "framer-motion";

interface AnaliseData {
  analisado_em: string;
  score_risco?: number | null;
  riscos_identificados?: Array<{ tipo: string; descricao: string; gravidade: string }>;
  clausulas_importantes?: Array<{ titulo: string; descricao: string; atencao?: string }>;
  sugestoes_melhoria?: string[];
  skill_aplicada?: string | null;
  payload_estruturado?: Record<string, any> | null;
}

interface ContractAIAnalysisProps {
  analise: AnaliseData;
}

const STATUS_COLOR: Record<string, string> = {
  aceitavel: "bg-success/10 text-success border-success/30",
  atencao: "bg-warning/10 text-warning border-warning/30",
  risco: "bg-destructive/10 text-destructive border-destructive/30",
  ausente: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const STATUS_LABEL: Record<string, string> = {
  aceitavel: "Aceitável",
  atencao: "Atenção",
  risco: "Risco",
  ausente: "Ausente",
};

const CLASS_COLOR: Record<string, string> = {
  critico: "bg-destructive text-destructive-foreground",
  alto: "bg-destructive/20 text-destructive",
  medio: "bg-warning/20 text-warning",
  baixo: "bg-success/20 text-success",
};

const NDA_COLOR: Record<string, string> = {
  aprovar: "bg-success text-success-foreground",
  revisar: "bg-warning text-warning-foreground",
  rejeitar: "bg-destructive text-destructive-foreground",
};

const NDA_LABEL: Record<string, string> = {
  aprovar: "✓ Aprovar",
  revisar: "⚠ Revisar antes de assinar",
  rejeitar: "✕ Rejeitar / Escalar",
};

const FRAMEWORK_LABEL: Record<string, string> = {
  lgpd: "LGPD",
  anticorrupcao: "Anticorrupção",
  trabalhista: "Trabalhista",
  tributario: "Tributário",
  ambiental: "Ambiental",
};

const COMPLIANCE_COLOR: Record<string, string> = {
  conforme: "bg-success/10 text-success border-success/30",
  parcialmente_conforme: "bg-warning/10 text-warning border-warning/30",
  nao_conforme: "bg-destructive/10 text-destructive border-destructive/30",
  nao_aplicavel: "bg-muted text-muted-foreground border-muted-foreground/30",
};

export function ContractAIAnalysis({ analise }: ContractAIAnalysisProps) {
  const payload = analise.payload_estruturado ?? {};
  const review = payload["contract-review"];
  const ndaTriage = payload["nda-triage"];
  const risk = payload["risk-assessment"];
  const compliance = payload["compliance"];

  const tabs: Array<{ value: string; label: string; icon: any }> = [];
  if (review) tabs.push({ value: "review", label: "Cláusulas", icon: ScrollText });
  if (ndaTriage) tabs.push({ value: "nda", label: "Triagem NDA", icon: Gavel });
  if (risk) tabs.push({ value: "risk", label: "Riscos", icon: ShieldAlert });
  if (compliance) tabs.push({ value: "compliance", label: "Compliance", icon: ShieldCheck });

  const hasStructured = tabs.length > 0;
  const skillLabel = analise.skill_aplicada
    ? analise.skill_aplicada === "full"
      ? "Análise completa"
      : analise.skill_aplicada
          .replace("-", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
    : "Análise IA";

  return (
    <AnimatedCard className="border-primary/20">
      <AnimatedCardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">{skillLabel}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(analise.analisado_em).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          {analise.score_risco !== null && analise.score_risco !== undefined && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              <Badge
                variant={
                  analise.score_risco >= 7 ? "destructive" : analise.score_risco >= 4 ? "outline" : "default"
                }
                className="text-base px-4 py-1.5"
              >
                Score: {Number(analise.score_risco).toFixed(1)}/10
              </Badge>
            </motion.div>
          )}
        </div>
      </AnimatedCardHeader>

      <AnimatedCardContent className="space-y-6">
        {hasStructured ? (
          <Tabs defaultValue={tabs[0].value} className="w-full">
            <TabsList className="flex-wrap h-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {review && (
              <TabsContent value="review" className="space-y-4 mt-4">
                {review.resumo_executivo && (
                  <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                    {review.resumo_executivo}
                  </p>
                )}
                {review.recomendacao && (
                  <Badge variant="outline" className="capitalize">
                    Recomendação: {review.recomendacao.replace(/_/g, " ")}
                  </Badge>
                )}
                <div className="space-y-2">
                  {(review.clausulas ?? []).map((c: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`p-3 rounded-lg border ${STATUS_COLOR[c.status] ?? ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{c.titulo}</p>
                        <Badge variant="outline" className="shrink-0 text-xs capitalize">
                          {STATUS_LABEL[c.status] ?? c.status} · {c.categoria}
                        </Badge>
                      </div>
                      {c.problema && (
                        <p className="text-xs text-muted-foreground mt-1">{c.problema}</p>
                      )}
                      {c.redline_sugerido && (
                        <div className="mt-2 text-xs">
                          <span className="font-semibold">Sugestão: </span>
                          <span className="text-muted-foreground">{c.redline_sugerido}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            )}

            {ndaTriage && (
              <TabsContent value="nda" className="space-y-4 mt-4">
                <div
                  className={`p-4 rounded-lg text-center font-semibold text-lg ${
                    NDA_COLOR[ndaTriage.classificacao] ?? "bg-muted"
                  }`}
                >
                  {NDA_LABEL[ndaTriage.classificacao] ?? ndaTriage.classificacao}
                </div>
                {ndaTriage.resumo && <p className="text-sm">{ndaTriage.resumo}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {ndaTriage.tipo && (
                    <div className="p-2 rounded bg-muted/40">
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">{ndaTriage.tipo.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {ndaTriage.vigencia_anos != null && (
                    <div className="p-2 rounded bg-muted/40">
                      <p className="text-muted-foreground">Vigência</p>
                      <p className="font-medium">{ndaTriage.vigencia_anos} anos</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {(ndaTriage.pontos_atencao ?? []).map((p: any, i: number) => (
                    <div key={i} className={`p-2.5 rounded border ${STATUS_COLOR[p.status === "ok" ? "aceitavel" : p.status === "rejeitar" ? "risco" : "atencao"]}`}>
                      <p className="text-sm font-medium">{p.ponto}</p>
                      {p.recomendacao && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.recomendacao}</p>
                      )}
                    </div>
                  ))}
                </div>
                {ndaTriage.red_flags?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Red flags
                    </p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {ndaTriage.red_flags.map((rf: string, i: number) => (
                        <li key={i}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            )}

            {risk && (
              <TabsContent value="risk" className="space-y-4 mt-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${CLASS_COLOR[risk.classificacao_geral] ?? ""} capitalize text-base px-3 py-1`}>
                    Risco geral: {risk.classificacao_geral}
                  </Badge>
                  {risk.exposicao_total_estimada_brl != null && (
                    <Badge variant="outline">
                      Exposição estimada: R$ {Number(risk.exposicao_total_estimada_brl).toLocaleString("pt-BR")}
                    </Badge>
                  )}
                </div>
                {risk.resumo && <p className="text-sm bg-muted/30 p-3 rounded-lg">{risk.resumo}</p>}
                <div className="space-y-2">
                  {(risk.riscos ?? []).map((r: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-lg border bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm capitalize">{r.categoria.replace(/_/g, " ")}</p>
                        <Badge className={`${CLASS_COLOR[r.classificacao] ?? ""} capitalize`}>
                          {r.classificacao}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.descricao}</p>
                      <div className="flex gap-3 text-xs mt-2">
                        <span>Prob: <b className="capitalize">{r.probabilidade}</b></span>
                        <span>Impacto: <b className="capitalize">{r.impacto}</b></span>
                        {r.exposicao_estimada_brl != null && (
                          <span>R$ {Number(r.exposicao_estimada_brl).toLocaleString("pt-BR")}</span>
                        )}
                      </div>
                      {r.mitigante && (
                        <p className="text-xs mt-2">
                          <span className="font-semibold">Mitigante: </span>
                          {r.mitigante}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            )}

            {compliance && (
              <TabsContent value="compliance" className="space-y-4 mt-4">
                <Badge className={`${COMPLIANCE_COLOR[compliance.status_geral] ?? ""} capitalize text-base px-3 py-1`}>
                  {compliance.status_geral.replace(/_/g, " ")}
                </Badge>
                {compliance.resumo && (
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">{compliance.resumo}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(compliance.frameworks ?? []).map((fw: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${COMPLIANCE_COLOR[fw.status] ?? ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{FRAMEWORK_LABEL[fw.nome] ?? fw.nome}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {fw.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {fw.gaps?.length > 0 && (
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5 mt-1">
                          {fw.gaps.map((g: string, j: number) => <li key={j}>{g}</li>)}
                        </ul>
                      )}
                      {fw.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{fw.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
                {compliance.acoes_necessarias?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Ações necessárias</p>
                    <ul className="space-y-1.5">
                      {compliance.acoes_necessarias.map((a: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge
                            variant={a.prioridade === "alta" ? "destructive" : "outline"}
                            className="text-[10px] uppercase"
                          >
                            {a.prioridade}
                          </Badge>
                          <span>{a.acao}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        ) : (
          /* Fallback: análises legadas sem payload_estruturado */
          <LegacyView analise={analise} />
        )}

        <p className="text-[11px] text-muted-foreground border-t pt-3 italic">
          Análise assistida por IA. Não constitui parecer jurídico — valide com profissional habilitado antes de decisões definitivas.
        </p>
      </AnimatedCardContent>
    </AnimatedCard>
  );
}

function LegacyView({ analise }: { analise: AnaliseData }) {
  return (
    <div className="space-y-6">
      {analise.riscos_identificados && analise.riscos_identificados.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Riscos Identificados
          </h4>
          {analise.riscos_identificados.map((risco, i) => (
            <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{risco.tipo}</p>
                  <p className="text-sm text-muted-foreground mt-1">{risco.descricao}</p>
                </div>
                <Badge variant="destructive" className="shrink-0">{risco.gravidade}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      {analise.clausulas_importantes && analise.clausulas_importantes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Cláusulas Importantes
          </h4>
          {analise.clausulas_importantes.map((c, i) => (
            <div key={i} className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium text-sm">{c.titulo}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.descricao}</p>
              {c.atencao && (
                <p className="text-sm text-warning mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {c.atencao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {analise.sugestoes_melhoria && analise.sugestoes_melhoria.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Sugestões de Melhoria
          </h4>
          <ul className="space-y-2">
            {analise.sugestoes_melhoria.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
