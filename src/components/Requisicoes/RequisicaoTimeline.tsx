import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Edit, ArrowRight } from "lucide-react";

interface Props {
  requisicaoId: string;
}

/**
 * Timeline a partir de audit_logs filtrado por entidade=contract_requests + entidade_id.
 * RLS já garante isolamento por organização.
 */
export function RequisicaoTimeline({ requisicaoId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["requisicao-timeline", requisicaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, acao, dados_anteriores, dados_novos, metadata, created_at")
        .eq("entidade", "contract_requests")
        .eq("entidade_id", requisicaoId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground">Sem alterações registradas ainda.</p>
    );
  }

  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {data.map((ev) => {
        const Icon = ev.acao === "INSERT" ? FileText : ev.acao === "UPDATE" ? Edit : ArrowRight;
        const label =
          ev.acao === "INSERT"
            ? "Requisição criada"
            : ev.acao === "UPDATE"
              ? "Atualização"
              : ev.acao;
        return (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-3 w-3" />
            </span>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
