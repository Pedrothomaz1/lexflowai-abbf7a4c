import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/SuperAdmin/KpiCard";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  format,
  startOfMonth,
  subMonths,
  differenceInCalendarMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Org {
  id: string;
  nome: string;
  plano: string;
  status: string;
  created_at: string;
  suspensa_em: string | null;
}

interface Pricing {
  plano: string;
  preco_centavos: number;
}

const fmtBRL = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtBRLk = (c: number) => {
  const v = c / 100;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const MONTHS_BACK = 12;
const COHORT_MONTHS = 6;

export default function CrescimentoTab() {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [pricing, setPricing] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    (async () => {
      const [{ data: orgsData }, { data: mrrData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, nome, plano, status, created_at, suspensa_em"),
        supabase.rpc("calculate_mrr"),
      ]);
      setOrgs((orgsData as Org[]) || []);
      const row = (mrrData as any[])?.[0];
      const map = new Map<string, number>();
      ((row?.por_plano as Pricing[]) || []).forEach((p) =>
        map.set(p.plano, p.preco_centavos),
      );
      setPricing(map);
      setLoading(false);
    })();
  }, []);

  // --- Helpers ----------------------------------------------------------
  const priceOf = (plano: string) => pricing.get(plano) || 0;

  const isActiveInMonth = (o: Org, monthStart: Date) => {
    const monthEnd = startOfMonth(subMonths(monthStart, -1));
    const created = new Date(o.created_at);
    const suspended = o.suspensa_em ? new Date(o.suspensa_em) : null;
    return created < monthEnd && (!suspended || suspended >= monthStart);
  };

  // --- Waterfall MRR (12 meses) ----------------------------------------
  const waterfall = useMemo(() => {
    if (!orgs.length) return [];
    const out: Array<{
      month: string;
      mrrStart: number;
      mrrEnd: number;
      newMrr: number;
      churnMrr: number;
      net: number;
      label: string;
    }> = [];

    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const prevStart = startOfMonth(subMonths(monthStart, 1));

      let mrrStart = 0;
      let mrrEnd = 0;
      let newMrr = 0;
      let churnMrr = 0;

      orgs.forEach((o) => {
        const p = priceOf(o.plano);
        if (!p) return;
        const wasActive = isActiveInMonth(o, prevStart);
        const nowActive = isActiveInMonth(o, monthStart);
        if (wasActive) mrrStart += p;
        if (nowActive) mrrEnd += p;
        if (!wasActive && nowActive) newMrr += p;
        if (wasActive && !nowActive) churnMrr += p;
      });

      out.push({
        month: format(monthStart, "MMM/yy", { locale: ptBR }),
        mrrStart,
        mrrEnd,
        newMrr,
        churnMrr: -churnMrr,
        net: newMrr - churnMrr,
        label: format(monthStart, "MMMM yyyy", { locale: ptBR }),
      });
    }
    return out;
  }, [orgs, pricing]);

  // --- Cohort retention (últimas 6 cohorts mensais) --------------------
  const cohorts = useMemo(() => {
    if (!orgs.length) return [];
    const rows: Array<{
      cohort: string;
      cohortDate: Date;
      size: number;
      retention: Array<{ month: number; active: number; rate: number | null }>;
    }> = [];

    for (let i = COHORT_MONTHS - 1; i >= 0; i--) {
      const cohortStart = startOfMonth(subMonths(new Date(), i));
      const cohortEnd = startOfMonth(subMonths(cohortStart, -1));
      const members = orgs.filter((o) => {
        const c = new Date(o.created_at);
        return c >= cohortStart && c < cohortEnd;
      });
      const size = members.length;
      const monthsElapsed = differenceInCalendarMonths(new Date(), cohortStart);
      const retention = [];
      for (let m = 0; m <= COHORT_MONTHS - 1; m++) {
        if (m > monthsElapsed) {
          retention.push({ month: m, active: 0, rate: null });
          continue;
        }
        const refMonth = startOfMonth(subMonths(cohortStart, -m));
        const active = members.filter((o) => isActiveInMonth(o, refMonth)).length;
        retention.push({
          month: m,
          active,
          rate: size > 0 ? active / size : null,
        });
      }
      rows.push({
        cohort: format(cohortStart, "MMM/yy", { locale: ptBR }),
        cohortDate: cohortStart,
        size,
        retention,
      });
    }
    return rows;
  }, [orgs]);

  // --- Top KPIs --------------------------------------------------------
  const last = waterfall[waterfall.length - 1];
  const prev = waterfall[waterfall.length - 2];
  const mrrGrowth = last && prev && prev.mrrEnd > 0
    ? ((last.mrrEnd - prev.mrrEnd) / prev.mrrEnd) * 100
    : 0;
  const netNew = last?.net || 0;
  const grossChurn = last && last.mrrStart > 0
    ? (Math.abs(last.churnMrr) / last.mrrStart) * 100
    : 0;
  const last3Net = waterfall.slice(-3).reduce((s, r) => s + r.net, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR atual"
          value={fmtBRL(last?.mrrEnd || 0)}
          icon={<Activity className="h-4 w-4" />}
          delta={
            mrrGrowth !== 0
              ? { value: `${Math.abs(mrrGrowth).toFixed(1)}% vs mês ant.`, positive: mrrGrowth > 0 }
              : null
          }
          accent="primary"
        />
        <KpiCard
          label="Net New MRR (mês)"
          value={fmtBRLk(netNew)}
          icon={netNew >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          hint={`+${fmtBRLk(last?.newMrr || 0)} novos · −${fmtBRLk(Math.abs(last?.churnMrr || 0))} churn`}
          accent={netNew >= 0 ? "primary" : "danger"}
        />
        <KpiCard
          label="Gross churn %"
          value={`${grossChurn.toFixed(1)}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          hint="MRR perdido / MRR inicial do mês"
          accent={grossChurn > 5 ? "danger" : grossChurn > 2 ? "warning" : "muted"}
        />
        <KpiCard
          label="Net new — 3M"
          value={fmtBRLk(last3Net)}
          icon={<TrendingUp className="h-4 w-4" />}
          hint="Somatório dos últimos 3 meses"
          accent={last3Net >= 0 ? "primary" : "danger"}
        />
      </div>

      {/* Waterfall chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Movimentação de MRR — 12 meses</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Barras verdes = novo MRR. Barras vermelhas = churn. Linha = saldo líquido.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> New
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> Churn
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfall} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => (v === 0 ? "0" : `${(v / 100000).toFixed(0)}k`)}
                  tickLine={false}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name) => {
                    const label = name === "newMrr" ? "Novo" : name === "churnMrr" ? "Churn" : name;
                    return [fmtBRL(Math.abs(v)), label];
                  }}
                  labelFormatter={(_, p) => (p?.[0]?.payload as any)?.label || ""}
                />
                <Bar dataKey="newMrr" stackId="s" fill="hsl(142 76% 36%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="churnMrr" stackId="s" fill="hsl(var(--destructive))" radius={[0, 0, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini-table beneath chart */}
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-px bg-border rounded-lg overflow-hidden">
            {waterfall.map((w) => (
              <div key={w.month} className="bg-card p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{w.month}</p>
                <p
                  className={cn(
                    "text-xs font-bold mt-1",
                    w.net > 0 && "text-emerald-600",
                    w.net < 0 && "text-destructive",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {w.net >= 0 ? "+" : ""}
                  {fmtBRLk(w.net)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cohort retention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Retenção por cohort
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cada linha é o grupo de clientes que entrou naquele mês. Colunas mostram quantos seguiam ativos N meses depois.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-3">
                    Cohort
                  </th>
                  <th className="text-left text-xs uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-3">
                    Novos
                  </th>
                  {Array.from({ length: COHORT_MONTHS }).map((_, m) => (
                    <th
                      key={m}
                      className="text-xs uppercase tracking-wide text-muted-foreground font-medium pb-2 px-1 text-center"
                    >
                      M{m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <td className="font-semibold capitalize pr-3 py-1">{c.cohort}</td>
                    <td className="pr-3">
                      <Badge variant="outline" className="font-mono">
                        {c.size}
                      </Badge>
                    </td>
                    {c.retention.map((r) => (
                      <td key={r.month} className="px-1 py-1 text-center">
                        <CohortCell rate={r.rate} active={r.active} size={c.size} />
                      </td>
                    ))}
                  </tr>
                ))}
                {cohorts.every((c) => c.size === 0) && (
                  <tr>
                    <td colSpan={COHORT_MONTHS + 2} className="text-center text-muted-foreground py-8">
                      Sem cohorts no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CohortCell({
  rate,
  active,
  size,
}: {
  rate: number | null;
  active: number;
  size: number;
}) {
  if (rate === null || size === 0) {
    return <div className="h-9 rounded-md bg-muted/40" />;
  }
  // Color scale: primary at 100%, fading to muted at 0%
  const intensity = Math.max(0.08, rate);
  return (
    <div
      className="h-9 rounded-md flex flex-col items-center justify-center border border-primary/10"
      style={{
        background: `hsl(var(--primary) / ${intensity * 0.85})`,
      }}
      title={`${active}/${size} ativos`}
    >
      <span
        className={cn(
          "text-xs font-bold leading-none",
          rate > 0.5 ? "text-primary-foreground" : "text-foreground",
        )}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(rate * 100)}%
      </span>
      <span
        className={cn(
          "text-[9px] leading-none mt-0.5 opacity-80",
          rate > 0.5 ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {active}
      </span>
    </div>
  );
}
