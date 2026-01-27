import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// PREMIUM TOOLTIP
// ============================================
type TooltipPayloadItem = {
  name?: string;
  dataKey?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
};

type PremiumTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number) => string;
  showTrend?: boolean;
};

export const PremiumTooltip = ({ 
  active, 
  payload, 
  label, 
  formatter = (v) => v.toLocaleString("pt-BR"),
  showTrend = false,
}: PremiumTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl"
    >
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name || entry.dataKey}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {formatter(entry.value || 0)}
            </span>
          </div>
        ))}
      </div>
      {showTrend && payload.length > 1 && payload[0]?.value && payload[1]?.value && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Variação</span>
            <div className="flex items-center gap-1">
              {payload[0].value > payload[1].value ? (
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

// ============================================
// PREMIUM AREA CHART
// ============================================
type PremiumAreaChartProps = {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  height?: number;
  color?: string;
  gradientId?: string;
  formatter?: (value: number) => string;
  compareKey?: string;
  showLegend?: boolean;
  showDots?: boolean;
};

export const PremiumAreaChart = ({
  data,
  dataKey,
  xAxisKey,
  height = 280,
  color = "hsl(var(--primary))",
  gradientId,
  formatter = (v) => v.toLocaleString("pt-BR"),
  compareKey,
  showLegend = false,
  showDots = true,
}: PremiumAreaChartProps) => {
  const id = gradientId || `area-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const compareId = `compare-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {compareKey && (
            <linearGradient id={compareId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          className="stroke-muted/30" 
          vertical={false} 
        />
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip 
          content={<PremiumTooltip formatter={formatter} showTrend={!!compareKey} />} 
        />
        {showLegend && (
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: 20 }}
          />
        )}
        {compareKey && (
          <Area
            type="monotone"
            dataKey={compareKey}
            name="Período Anterior"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill={`url(#${compareId})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          name="Período Atual"
          stroke={color}
          strokeWidth={3}
          fill={`url(#${id})`}
          dot={showDots ? { fill: color, strokeWidth: 0, r: 4 } : false}
          activeDot={{ r: 6, stroke: "hsl(var(--background))", strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={2000}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ============================================
// PREMIUM BAR CHART
// ============================================
type PremiumBarChartProps = {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey?: string;
  yAxisKey?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  colors?: string[];
  gradient?: boolean;
  formatter?: (value: number) => string;
  barRadius?: number;
};

export const PremiumBarChart = ({
  data,
  dataKey,
  xAxisKey = "name",
  yAxisKey,
  height = 280,
  layout = "horizontal",
  colors,
  gradient = true,
  formatter = (v) => v.toLocaleString("pt-BR"),
  barRadius = 8,
}: PremiumBarChartProps) => {
  const gradientId = `bar-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout={layout}
        barCategoryGap={layout === "vertical" ? "20%" : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2={layout === "vertical" ? "1" : "0"} y2={layout === "vertical" ? "0" : "1"}>
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(142, 76%, 46%)" stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          className="stroke-muted/30" 
          horizontal={layout === "vertical"}
          vertical={layout === "horizontal"}
        />
        {layout === "horizontal" ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              dataKey={yAxisKey || xAxisKey}
              type="category"
              width={130}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          content={<PremiumTooltip formatter={formatter} />}
        />
        <Bar
          dataKey={dataKey}
          fill={gradient ? `url(#${gradientId})` : colors?.[0] || "hsl(var(--primary))"}
          radius={layout === "vertical" ? [0, barRadius, barRadius, 0] : [barRadius, barRadius, 0, 0]}
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-out"
        >
          {colors && data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================
// PREMIUM DONUT CHART
// ============================================
type PremiumDonutChartProps = {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  centerLabel?: { value: string; label: string };
  colors?: string[];
  formatter?: (value: number) => string;
};

export const PremiumDonutChart = ({
  data,
  height = 280,
  innerRadius = 70,
  outerRadius = 100,
  showLabels = true,
  centerLabel,
  colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ],
  formatter = (v) => `R$ ${v.toFixed(2)}`,
}: PremiumDonutChartProps) => {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <defs>
            {data.map((entry, index) => (
              <filter key={`shadow-${index}`} id={`pie-shadow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow 
                  dx="0" 
                  dy="4" 
                  stdDeviation="4" 
                  floodColor={entry.color || colors[index % colors.length]} 
                  floodOpacity="0.3" 
                />
              </filter>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={1500}
            animationBegin={0}
            label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
            labelLine={showLabels}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                style={{ filter: `url(#pie-shadow-${index})` }}
              />
            ))}
          </Pie>
          <Tooltip
            content={<PremiumTooltip formatter={formatter} />}
          />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
            iconSize={10}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ paddingRight: 120 }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold">{centerLabel.value}</p>
            <p className="text-xs text-muted-foreground">{centerLabel.label}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SPARKLINE
// ============================================
type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
};

export const Sparkline = ({ 
  data, 
  color = "hsl(var(--primary))", 
  height = 48, 
  width = 96 
}: SparklineProps) => {
  const chartData = data.map((value, index) => ({ value, index }));
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ height, width }}>
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

// ============================================
// STAT CARD WITH SPARKLINE
// ============================================
type StatCardWithSparklineProps = {
  title: string;
  value: string;
  change?: number;
  sparklineData?: number[];
  onClick?: () => void;
};

export const StatCardWithSparkline = ({
  title,
  value,
  change,
  sparklineData,
  onClick,
}: StatCardWithSparklineProps) => {
  const isPositive = (change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all",
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn("text-xs font-medium", isPositive ? "text-emerald-500" : "text-destructive")}>
                {isPositive ? "+" : ""}{change}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            color={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
          />
        )}
      </div>
    </motion.div>
  );
};
