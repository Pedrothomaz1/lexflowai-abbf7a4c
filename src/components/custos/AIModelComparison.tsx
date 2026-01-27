import { useMemo } from "react";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { FadeIn } from "@/components/ui/motion-container";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lightbulb, Target, Check, TrendingDown, TrendingUp, AlertTriangle, Zap, Clock, Star } from "lucide-react";

type ModelPricing = {
  custoMil: number;
  velocidade: "Rápido" | "Médio" | "Lento";
  qualidade: "Básica" | "Boa" | "Excelente";
};

const modelPricing: Record<string, ModelPricing> = {
  "google/gemini-2.5-flash-lite": {
    custoMil: 0.003,
    velocidade: "Rápido",
    qualidade: "Básica",
  },
  "openai/gpt-5-nano": {
    custoMil: 0.004,
    velocidade: "Rápido",
    qualidade: "Básica",
  },
  "google/gemini-2.5-flash": {
    custoMil: 0.01,
    velocidade: "Médio",
    qualidade: "Boa",
  },
  "openai/gpt-5-mini": {
    custoMil: 0.012,
    velocidade: "Médio",
    qualidade: "Boa",
  },
  "google/gemini-2.5-pro": {
    custoMil: 0.025,
    velocidade: "Lento",
    qualidade: "Excelente",
  },
  "openai/gpt-5": {
    custoMil: 0.03,
    velocidade: "Lento",
    qualidade: "Excelente",
  },
};

const velocidadeIcon = {
  Rápido: <Zap className="h-3 w-3" />,
  Médio: <Clock className="h-3 w-3" />,
  Lento: <Clock className="h-3 w-3" />,
};

const qualidadeIcon = {
  Básica: 1,
  Boa: 2,
  Excelente: 3,
};

type AIModelComparisonProps = {
  totalTokens: number;
  custoAtual: number;
  modeloAtual?: string;
};

export const AIModelComparison = ({
  totalTokens,
  custoAtual,
  modeloAtual = "google/gemini-2.5-flash",
}: AIModelComparisonProps) => {
  const comparacoes = useMemo(() => {
    return Object.entries(modelPricing)
      .map(([modelo, config]) => {
        const custoSimulado = (totalTokens / 1000) * config.custoMil;
        const diferenca = custoSimulado - custoAtual;
        const percentual = custoAtual > 0 ? ((diferenca / custoAtual) * 100) : 0;
        const isAtual = modelo === modeloAtual;

        return {
          modelo,
          nomeExibicao: modelo.split("/")[1],
          ...config,
          custoSimulado,
          diferenca,
          percentual,
          isAtual,
        };
      })
      .sort((a, b) => a.custoMil - b.custoMil);
  }, [totalTokens, custoAtual, modeloAtual]);

  const modeloMaisBarato = comparacoes[0];
  const economiaPotencial = custoAtual - modeloMaisBarato.custoSimulado;
  const percentualEconomia = custoAtual > 0 ? (economiaPotencial / custoAtual) * 100 : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);

  if (totalTokens === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Tabela de Comparação */}
      <FadeIn delay={0.35}>
        <AnimatedCard hoverScale={1} className="lg:col-span-2">
          <AnimatedCardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Comparação de Custos por Modelo IA</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Baseado em {totalTokens.toLocaleString("pt-BR")} tokens consumidos no período
            </p>
          </AnimatedCardHeader>
          <AnimatedCardContent>
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Custo/1K</TableHead>
                    <TableHead className="text-center">Velocidade</TableHead>
                    <TableHead className="text-center">Qualidade</TableHead>
                    <TableHead className="text-right">Custo Simulado</TableHead>
                    <TableHead className="text-right">Economia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparacoes.map((item) => (
                    <TableRow
                      key={item.modelo}
                      className={item.isAtual ? "bg-primary/5 border-primary/20" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.isAtual && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Check className="h-4 w-4 text-primary" />
                              </TooltipTrigger>
                              <TooltipContent>Modelo atual em uso</TooltipContent>
                            </Tooltip>
                          )}
                          <span className={item.isAtual ? "text-primary font-semibold" : ""}>
                            {item.nomeExibicao}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.custoMil)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className={`gap-1 ${
                                item.velocidade === "Rápido"
                                  ? "border-emerald-500 text-emerald-600"
                                  : item.velocidade === "Médio"
                                  ? "border-amber-500 text-amber-600"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {velocidadeIcon[item.velocidade]}
                              {item.velocidade}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {item.velocidade === "Rápido"
                              ? "Resposta mais rápida, ideal para alto volume"
                              : item.velocidade === "Médio"
                              ? "Equilíbrio entre velocidade e qualidade"
                              : "Mais lento, mas com melhor qualidade"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center justify-center gap-0.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < qualidadeIcon[item.qualidade]
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted"
                                  }`}
                                />
                              ))}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {item.qualidade === "Básica"
                              ? "Adequado para tarefas simples"
                              : item.qualidade === "Boa"
                              ? "Bom para a maioria das tarefas"
                              : "Excelente para tarefas complexas"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.custoSimulado)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isAtual ? (
                          <Badge variant="secondary">Atual</Badge>
                        ) : item.diferenca < 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {Math.abs(item.percentual).toFixed(0)}%
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingUp className="h-3 w-3" />+{item.percentual.toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>

      {/* Card de Recomendação */}
      <FadeIn delay={0.4}>
        <AnimatedCard hoverScale={1.02} className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <AnimatedCardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold">Recomendação de Economia</h3>
            </div>
          </AnimatedCardHeader>
          <AnimatedCardContent className="space-y-4">
            {economiaPotencial > 0 ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Usando <span className="font-semibold text-foreground">{modeloMaisBarato.nomeExibicao}</span> você economizaria:
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(economiaPotencial)}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600">
                      {percentualEconomia.toFixed(0)}% menor
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600">Trade-off</p>
                    <p className="text-muted-foreground">
                      Qualidade {modeloMaisBarato.qualidade.toLowerCase()}, ideal para tarefas simples como extração de metadados.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    💡 Para análises complexas de contratos, considere manter o modelo atual ou usar{" "}
                    <span className="font-medium">gemini-2.5-pro</span> para maior precisão.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você já está usando o modelo mais econômico disponível!
              </p>
            )}
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>
    </div>
  );
};
