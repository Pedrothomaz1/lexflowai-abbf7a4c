import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Clock, CheckCircle2, Ban, Users, TrendingUp } from "lucide-react";

interface Metrics {
  total: number;
  ativas: number;
  pendentes: number;
  suspensas: number;
  novas7d: number;
  novas30d: number;
  totalMembros: number;
}

export default function MetricasTab() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: orgs } = await supabase
        .from("super_admin_organizations_view" as any)
        .select("status, created_at, total_membros");

      if (!orgs) {
        setLoading(false);
        return;
      }

      const list = orgs as any[];
      const now = Date.now();
      const d7 = now - 7 * 24 * 60 * 60 * 1000;
      const d30 = now - 30 * 24 * 60 * 60 * 1000;

      setM({
        total: list.length,
        ativas: list.filter((o) => o.status === "ativa").length,
        pendentes: list.filter((o) => o.status === "pendente_aprovacao").length,
        suspensas: list.filter((o) => o.status === "suspensa").length,
        novas7d: list.filter((o) => new Date(o.created_at).getTime() >= d7).length,
        novas30d: list.filter((o) => new Date(o.created_at).getTime() >= d30).length,
        totalMembros: list.reduce((acc, o) => acc + (o.total_membros || 0), 0),
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !m) {
    return <p className="text-muted-foreground">Carregando métricas...</p>;
  }

  const cards = [
    { label: "Total de organizações", value: m.total, icon: Building2, color: "text-primary" },
    { label: "Ativas", value: m.ativas, icon: CheckCircle2, color: "text-green-600" },
    { label: "Aguardando aprovação", value: m.pendentes, icon: Clock, color: "text-amber-600" },
    { label: "Suspensas", value: m.suspensas, icon: Ban, color: "text-destructive" },
    { label: "Novas (7 dias)", value: m.novas7d, icon: TrendingUp, color: "text-primary" },
    { label: "Novas (30 dias)", value: m.novas30d, icon: TrendingUp, color: "text-primary" },
    { label: "Total de usuários", value: m.totalMembros, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className={`h-5 w-5 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
