import { useMemo } from "react";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { FadeIn } from "@/components/ui/motion-container";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Eye } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

// Sample data for preview
const sampleEvolutionData = [
  { dia: "01/01", custo: 45, anterior: 38 },
  { dia: "05/01", custo: 52, anterior: 42 },
  { dia: "10/01", custo: 48, anterior: 55 },
  { dia: "15/01", custo: 70, anterior: 48 },
  { dia: "20/01", custo: 61, anterior: 52 },
  { dia: "25/01", custo: 85, anterior: 58 },
  { dia: "30/01", custo: 78, anterior: 65 },
];

const sampleDistributionData = [
  { tipo: "Tokens IA", valor: 450, color: "#8b5cf6" },
  { tipo: "Emails", valor: 280, color: "#3b82f6" },
  { tipo: "API Compras", valor: 180, color: "#10b981" },
  { tipo: "Storage", valor: 90, color: "#f59e0b" },
];

const sampleBarData = [
  { recurso: "Análise Contrato", quantidade: 1250 },
  { recurso: "Extração Metadata", quantidade: 890 },
  { recurso: "Notificações", quantidade: 650 },
  { recurso: "Webhooks", quantidade: 420 },
  { recurso: "Storage Upload", quantidade: 280 },
];

// Custom tooltip component with rich styling
const PremiumTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl"
    >
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">{entry.name || entry.dataKey}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              R$ {entry.value?.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      {payload.length > 1 && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Variação</span>
            <div className="flex items-center gap-1">
              {payload[0]?.value > payload[1]?.value ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-500">
                    +{((payload[0].value / payload[1].value - 1) * 100).toFixed(0)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">
                    {((payload[0].value / payload[1].value - 1) * 100).toFixed(0)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Sparkline component for stat cards
const Sparkline = ({ data, color = "hsl(var(--primary))", trend = "up" }: { data: number[]; color?: string; trend?: "up" | "down" }) => {
  const chartData = data.map((value, index) => ({ value, index }));
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Sample stat card with sparkline
const StatCardWithSparkline = ({ 
  title, 
  value, 
  change, 
  sparklineData 
}: { 
  title: string; 
  value: string; 
  change: number; 
  sparklineData: number[] 
}) => {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-xs font-medium ${isPositive ? "text-emerald-500" : "text-destructive"}`}>
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        </div>
        <Sparkline 
          data={sparklineData} 
          color={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} 
        />
      </div>
    </motion.div>
  );
};

export const ChartStylePreview = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <AnimatedCard className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <AnimatedCardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">Preview: Novo Estilo de Gráficos</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualize como ficarão os gráficos com o novo design
                </p>
              </div>
            </div>
          </AnimatedCardHeader>
        </AnimatedCard>
      </FadeIn>

      {/* Stat Cards with Sparklines */}
      <FadeIn delay={0.1}>
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          StatCards com Sparklines
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCardWithSparkline
            title="Custo Total"
            value="R$ 1.234,56"
            change={12.5}
            sparklineData={[45, 52, 48, 70, 61, 85, 78]}
          />
          <StatCardWithSparkline
            title="Tokens IA"
            value="45.890"
            change={-8.2}
            sparklineData={[85, 78, 70, 65, 58, 52, 48]}
          />
          <StatCardWithSparkline
            title="Emails Enviados"
            value="1.256"
            change={23.1}
            sparklineData={[30, 35, 32, 45, 48, 52, 58]}
          />
        </div>
      </FadeIn>

      {/* Area Chart with Gradient */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h3 className="text-lg font-semibold">Evolução com Gradiente</h3>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15%
                </Badge>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sampleEvolutionData}>
                    <defs>
                      <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis 
                      dataKey="dia" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip content={<PremiumTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="anterior"
                      name="Mês Anterior"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorAnterior)"
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      dataKey="custo"
                      name="Período Atual"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill="url(#colorCusto)"
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={2000}
                      animationEasing="ease-out"
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: 20 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>

        {/* Donut Chart with Shadow */}
        <FadeIn delay={0.3}>
          <AnimatedCard hoverScale={1}>
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <h3 className="text-lg font-semibold">Distribuição Premium</h3>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {sampleDistributionData.map((entry, index) => (
                        <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={entry.color} floodOpacity="0.3" />
                        </filter>
                      ))}
                    </defs>
                    <Pie
                      data={sampleDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="valor"
                      nameKey="tipo"
                      strokeWidth={0}
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationBegin={0}
                    >
                      {sampleDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          style={{ filter: `url(#shadow-${index})` }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                      }}
                    />
                    <Legend 
                      verticalAlign="middle" 
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => (
                        <span className="text-sm text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingRight: '120px' }}>
                <div className="text-center">
                  <p className="text-2xl font-bold">R$ 1.000</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>

        {/* Bar Chart with Gradient */}
        <FadeIn delay={0.4}>
          <AnimatedCard hoverScale={1} className="lg:col-span-2">
            <AnimatedCardHeader>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-lg font-semibold">Barras com Gradiente</h3>
              </div>
            </AnimatedCardHeader>
            <AnimatedCardContent className="pt-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleBarData} layout="vertical" barCategoryGap="20%">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(142, 76%, 46%)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={true} vertical={false} />
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      dataKey="recurso" 
                      type="category" 
                      width={130} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                      }}
                      formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Quantidade']}
                    />
                    <Bar 
                      dataKey="quantidade" 
                      fill="url(#barGradient)" 
                      radius={[0, 8, 8, 0]}
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCardContent>
          </AnimatedCard>
        </FadeIn>
      </div>

      {/* Comparison Summary */}
      <FadeIn delay={0.5}>
        <AnimatedCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <AnimatedCardContent className="py-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted" />
                  Estilo Atual
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Cores sólidas sem gradientes</li>
                  <li>• Tooltips básicos com texto simples</li>
                  <li>• Sem animações de entrada</li>
                  <li>• StatCards sem indicadores visuais de tendência</li>
                  <li>• Gráficos de linha simples</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  Novo Estilo Premium
                </h4>
                <ul className="space-y-2 text-sm text-foreground">
                  <li>✓ <span className="font-medium">Gradientes suaves</span> em áreas e barras</li>
                  <li>✓ <span className="font-medium">Tooltips ricos</span> com múltiplas métricas</li>
                  <li>✓ <span className="font-medium">Animações fluidas</span> de entrada</li>
                  <li>✓ <span className="font-medium">Sparklines</span> nos cards de estatísticas</li>
                  <li>✓ <span className="font-medium">Indicadores de tendência</span> com variação %</li>
                </ul>
              </div>
            </div>
          </AnimatedCardContent>
        </AnimatedCard>
      </FadeIn>
    </div>
  );
};
