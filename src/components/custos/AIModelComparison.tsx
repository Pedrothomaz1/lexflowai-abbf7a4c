import { useMemo } from "react";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { FadeIn } from "@/components/ui/motion-container";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lightbulb, Target, Check, TrendingDown, TrendingUp, AlertTriangle, Zap, Clock, Star, Sparkles, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

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

const getProviderInfo = (modelo: string) => {
  if (modelo.startsWith("google/")) {
    return { nome: "Google", cor: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
  }
  return { nome: "OpenAI", cor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
};

const getNomeLimpo = (modelo: string) => {
  return modelo.split("/")[1]
    .replace("gemini-", "Gemini ")
    .replace("gpt-", "GPT-")
    .replace("-flash-lite", " Flash Lite")
    .replace("-flash", " Flash")
    .replace("-pro", " Pro")
    .replace("-nano", " Nano")
    .replace("-mini", " Mini")
    .replace("2.5", "2.5")
    .replace("5", "5");
};

const qualidadeStars = {
  Básica: 1,
  Boa: 2,
  Excelente: 3,
};

type AIModelComparisonProps = {
  totalTokens: number;
  custoAtual: number;
  modeloAtual?: string;
};

type ModelCardProps = {
  modelo: string;
  nomeExibicao: string;
  custoMil: number;
  velocidade: "Rápido" | "Médio" | "Lento";
  qualidade: "Básica" | "Boa" | "Excelente";
  custoSimulado: number;
  diferenca: number;
  percentual: number;
  isAtual: boolean;
};

const ModelCard = ({
  modelo,
  nomeExibicao,
  custoMil,
  velocidade,
  qualidade,
  custoSimulado,
  diferenca,
  percentual,
  isAtual,
}: ModelCardProps) => {
  const provider = getProviderInfo(modelo);
  const nomeLimpo = getNomeLimpo(modelo);
  const isCheaper = diferenca < 0;
  const isMoreExpensive = diferenca > 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all duration-300",
        isAtual 
          ? "border-primary bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-lg shadow-primary/10 ring-1 ring-primary/20" 
          : isCheaper
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-emerald-500/3 to-transparent hover:shadow-md hover:shadow-emerald-500/10"
          : isMoreExpensive
          ? "border-destructive/20 bg-gradient-to-br from-destructive/5 via-destructive/3 to-transparent"
          : "border-border bg-card hover:shadow-sm"
      )}
    >
      {/* Current model indicator */}
      {isAtual && (
        <div className="absolute -top-2.5 left-4">
          <Badge className="bg-primary text-primary-foreground gap-1 shadow-sm">
            <Check className="h-3 w-3" />
            Modelo Atual
          </Badge>
        </div>
      )}

      {/* Header: Name + Provider */}
      <div className={cn("flex items-start justify-between gap-2", isAtual && "mt-2")}>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground leading-tight">{nomeLimpo}</h4>
          <Badge variant="outline" className={cn("text-xs font-medium", provider.cor)}>
            {provider.nome}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">{formatCurrency(custoMil)}</div>
          <div className="text-xs text-muted-foreground">/1K tokens</div>
        </div>
      </div>

      {/* Speed & Quality indicators */}
      <div className="flex items-center gap-3 mt-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {velocidade === "Rápido" ? (
                  <Zap className="h-4 w-4 text-amber-500" />
                ) : (
                  <Clock className={cn("h-4 w-4", velocidade === "Médio" ? "text-muted-foreground" : "text-muted-foreground/60")} />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  velocidade === "Rápido" ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {velocidade}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {velocidade === "Rápido"
                ? "Resposta mais rápida, ideal para alto volume"
                : velocidade === "Médio"
                ? "Equilíbrio entre velocidade e qualidade"
                : "Mais lento, mas com melhor qualidade"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < qualidadeStars[qualidade]
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {qualidade === "Básica"
                ? "Adequado para tarefas simples"
                : qualidade === "Boa"
                ? "Bom para a maioria das tarefas"
                : "Excelente para tarefas complexas"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Simulated cost */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Custo simulado</span>
          <span className="font-mono font-semibold text-foreground">{formatCurrency(custoSimulado)}</span>
        </div>
      </div>

      {/* Savings/Cost badge */}
      {!isAtual && (
        <div className="mt-3">
          {isCheaper ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-600">
                Economia de {Math.abs(percentual).toFixed(0)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">
                +{percentual.toFixed(0)}% mais caro
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    <div className="space-y-6">
      {/* Header Section */}
      <FadeIn delay={0.3}>
        <AnimatedCard hoverScale={1}>
          <AnimatedCardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Lightbulb className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Comparação de Custos por Modelo IA</h3>
                <p className="text-sm text-muted-foreground">
                  Baseado em <span className="font-semibold text-foreground">{totalTokens.toLocaleString("pt-BR")}</span> tokens consumidos no período
                </p>
              </div>
            </div>
          </AnimatedCardHeader>
          <AnimatedCardContent>
            {/* Model Cards Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {comparacoes.map((item, index) => (
                <FadeIn key={item.modelo} delay={0.35 + index * 0.05}>
                  <ModelCard {...item} />
                </FadeIn>
              ))}
            </div>
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>

      {/* Recommendation Card */}
      {economiaPotencial > 0 && (
        <FadeIn delay={0.5}>
          <AnimatedCard hoverScale={1.01} className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-emerald-500/3 to-transparent overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <AnimatedCardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Target className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Recomendação de Economia</h3>
                  <p className="text-sm text-muted-foreground">Otimize seus custos com IA</p>
                </div>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="space-y-5">
              {/* Main Savings Display */}
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10">
                  <CircleDollarSign className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    Economia potencial com <span className="font-semibold text-foreground">{getNomeLimpo(modeloMaisBarato.modelo)}</span>
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(economiaPotencial)}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {percentualEconomia.toFixed(0)}% menor
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Economia potencial</span>
                  <span className="font-semibold text-emerald-600">{percentualEconomia.toFixed(0)}%</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percentualEconomia, 100)}%` }}
                  />
                </div>
              </div>

              {/* Trade-off Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-600">Trade-off</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Qualidade {modeloMaisBarato.qualidade.toLowerCase()}, ideal para tarefas simples como extração de metadados básicos.
                  </p>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="flex items-start gap-3 pt-3 border-t border-border/50">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Para análises complexas de contratos, considere manter o modelo atual ou usar{" "}
                  <span className="font-medium text-foreground">Gemini 2.5 Pro</span> para maior precisão.
                </p>
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>
      )}
    </div>
  );
};
