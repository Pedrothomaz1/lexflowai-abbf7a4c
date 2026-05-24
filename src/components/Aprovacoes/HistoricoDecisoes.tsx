import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface Props {
  stepId: string;
}

const icons: Record<string, JSX.Element> = {
  aprovado: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  rejeitado: <XCircle className="h-4 w-4 text-destructive" />,
  ajuste: <AlertCircle className="h-4 w-4 text-amber-600" />,
};

export function HistoricoDecisoes({ stepId }: Props) {
  const { data } = useQuery({
    queryKey: ["approval-decisions", stepId],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_decisions" as any)
        .select("*, profiles:aprovador_id(full_name, email)")
        .eq("step_id", stepId)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  if (!data?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico de decisões</p>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.id} className="flex items-start gap-2 text-sm border rounded-md p-2">
            {icons[d.decisao] ?? <AlertCircle className="h-4 w-4" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{d.profiles?.full_name || d.profiles?.email || "Aprovador"}</span>
                <Badge variant="outline" className="text-xs">{d.decisao}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
              </div>
              {d.motivo && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{d.motivo}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
