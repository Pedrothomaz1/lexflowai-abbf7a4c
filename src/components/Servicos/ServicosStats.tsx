import { Wrench, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServicosStatsProps {
  stats: {
    total: number;
    dentroPrazo: number;
    emAlerta: number;
    vencidos: number;
  };
  completionRate: number;
  proximoVencimento?: {
    especificacoes_servico?: { nome: string } | null;
    data_validade: string;
  } | null;
}

export function ServicosStats({ stats, completionRate, proximoVencimento }: ServicosStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total de Serviços"
        value={stats.total}
        icon={Wrench}
      />
      <StatCard
        title="No Prazo"
        value={stats.dentroPrazo}
        icon={CheckCircle2}
        className="border-l-4 border-l-success"
      />
      <StatCard
        title="Em Alerta"
        value={stats.emAlerta}
        icon={AlertTriangle}
        className="border-l-4 border-l-warning"
      />
      <StatCard
        title="Vencidos"
        value={stats.vencidos}
        icon={XCircle}
        className="border-l-4 border-l-destructive"
      />
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Taxa de Conformidade</span>
          <span className="text-lg font-bold">{completionRate}%</span>
        </div>
        <Progress value={completionRate} className="h-2" />
        {proximoVencimento && (
          <p className="text-xs text-muted-foreground mt-2">
            Próximo: {proximoVencimento.especificacoes_servico?.nome} em{" "}
            {format(new Date(proximoVencimento.data_validade), "dd/MM", { locale: ptBR })}
          </p>
        )}
      </div>
    </div>
  );
}
