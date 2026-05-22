import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/SuperAdmin/KpiCard";
import {
  DollarSign,
  Building2,
  Clock,
  TrendingDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MrrBreakdown {
  plano: string;
  nome: string;
  preco_centavos: number;
  clientes: number;
  mrr_centavos: number;
}

const fmtBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtBRLCompact = (centavos: number) => {
  const v = centavos / 100;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [breakdown, setBreakdown] = useState<MrrBreakdown[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<Array<{ month: string; clientes: number; mrr: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: mrrData }, { data: orgsData }] = await Promise.all([
        supabase.rpc("calculate_mrr"),
        supabase.from("organizations").select("id, nome, plano, status, created_at, trial_ends_at, suspensa_em"),
      ]);

      const mrrRow = (mrrData as any[])?.[0];
      if (mrrRow) {
        setMrr(Number(mrrRow.mrr_total_centavos) || 0);
        setBreakdown((mrrRow.por_plano as MrrBreakdown[]) || []);
      }
      const list = (orgsData as any[]) || [];
      setOrgs(list);

      // Chart: 6 meses
      const months: Array<{ month: string; clientes: number; mrr: number }> = [];
      const pricing = new Map<string, number>(
        (mrrRow?.por_plano as MrrBreakdown[] || []).map((p) => [p.plano, p.preco_centavos]),
      );
      for (let i = 5; i >= 0; i--) {
        const ref = startOfMonth(subMonths(new Date(), i));
        const refEnd = startOfMonth(subMonths(new Date(), i - 1));
        const activeInMonth = list.filter((o) => {
          const created = new Date(o.created_at);
          const suspended = o.suspensa_em ? new Date(o.suspensa_em) : null;
          return created < refEnd && (!suspended || suspended >= ref);
        });
        const mrrMonth =
          activeInMonth.reduce((sum, o) => sum + (pricing.get(o.plano) || 0), 0) / 100;
        months.push({
          month: format(ref, "MMM", { locale: ptBR }),
          clientes: activeInMonth.length,
          mrr: Math.round(mrrMonth),
        });
      }
      setChartData(months);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const now = Date.now();
  const ativas = orgs.filter((o) => o.status === "ativa");
  const d30 = now - 30 * 24 * 60 * 60 * 1000;
  const d60 = now - 60 * 24 * 60 * 60 * 1000;
  const novasUltimos30d = orgs.filter(
    (o) => new Date(o.created_at).getTime() >= d30 && o.status === "ativa",
  ).length;
  const novasPeriodoAnterior = orgs.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= d60 && t < d30;
  }).length;
  const deltaClientes = novasUltimos30d - novasPeriodoAnterior;

  const trialExpirando = orgs.filter((o) => {
    if (!o.trial_ends_at || o.status !== "ativa") return false;
    const t = new Date(o.trial_ends_at).getTime();
    return t > now && t < now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const churn30d = orgs.filter(
    (o) =>
      (o.status === "suspensa" || o.status === "cancelada") &&
      o.suspensa_em &&
      new Date(o.suspensa_em).getTime() >= d30,
  ).length;
  const churnRate = ativas.length > 0 ? ((churn30d / ativas.length) * 100).toFixed(1) : "0";

  const topClientes = [...ativas]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={fmtBRL(mrr)}
          icon={<DollarSign className="h-4 w-4" />}
          hint={`${ativas.length} cliente${ativas.length === 1 ? "" : "s"} ativo${ativas.length === 1 ? "" : "s"}`}
          accent="primary"
        />
        <KpiCard
          label="Clientes ativos"
          value={ativas.length}
          delta={
            deltaClientes !== 0
              ? { value: `${Math.abs(deltaClientes)} no mês`, positive: deltaClientes > 0 }
              : null
          }
          icon={<Building2 className="h-4 w-4" />}
          hint={`+${novasUltimos30d} nos últimos 30 dias`}
          accent="primary"
        />
        <KpiCard
          label="Trial expirando"
          value={trialExpirando}
          icon={<Clock className="h-4 w-4" />}
          hint="Próximos 7 dias"
          accent={trialExpirando > 0 ? "warning" : "muted"}
        />
        <KpiCard
          label="Churn 30d"
          value={`${churnRate}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          hint={`${churn30d} suspensão${churn30d === 1 ? "" : "ões"} no período`}
          accent={churn30d > 0 ? "danger" : "muted"}
        />
      </div>

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name) => [
                      name === "mrr" ? `R$ ${v.toLocaleString("pt-BR")}` : v,
                      name === "mrr" ? "MRR" : "Clientes",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#mrrGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR por plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
            {breakdown.map((b) => (
              <div key={b.plano} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold">{b.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.clientes} cliente{b.clientes === 1 ? "" : "s"} × {fmtBRLCompact(b.preco_centavos)}
                  </p>
                </div>
                <span className="text-sm font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(b.mrr_centavos)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Clientes recentes</CardTitle>
          {trialExpirando > 0 && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
              <AlertCircle className="h-3 w-3 mr-1" /> {trialExpirando} em trial expirando
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {topClientes.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhum cliente ativo ainda.</p>
            )}
            {topClientes.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{o.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastrada em {format(new Date(o.created_at), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {o.plano}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
