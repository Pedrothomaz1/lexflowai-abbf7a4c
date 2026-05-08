import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CnpjStatusBadge } from "@/components/cnpj/CnpjStatusBadge";
import { cn } from "@/lib/utils";

const PROBLEM_STATUSES = ["baixada", "suspensa", "inapta", "nula"];

interface Row {
  id: string;
  nome: string;
  cnpj_status: string | null;
  contratos_ativos: number;
}

export function CnpjProblemasCard() {
  const { organization } = useOrganization();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data: forn } = await supabase
        .from("fornecedores")
        .select("id, nome, cnpj_status")
        .eq("organization_id", organization.id)
        .in("cnpj_status", PROBLEM_STATUSES)
        .eq("is_active", true);

      const list = forn ?? [];
      // Buscar contagem de contratos ativos por fornecedor (top 5)
      const top = list.slice(0, 5);
      const enriched: Row[] = await Promise.all(
        top.map(async (f) => {
          const { count } = await supabase
            .from("contratos")
            .select("id", { count: "exact", head: true })
            .eq("fornecedor_id", f.id)
            .in("status", ["ativo", "em_aprovacao", "em_negociacao"]);
          return { ...f, contratos_ativos: count ?? 0 } as Row;
        }),
      );

      if (!mounted) return;
      setRows(enriched);
      setTotal(list.length);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [organization?.id]);

  if (loading) return null;

  return (
    <Card className={cn(total > 0 && "border-destructive/40")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={cn("h-4 w-4", total > 0 ? "text-destructive" : "text-muted-foreground")} />
          CNPJs com problemas
          <span className={cn("ml-auto text-2xl font-bold", total > 0 && "text-destructive")}>
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor com CNPJ inativo na Receita Federal. ✓
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Link
                key={r.id}
                to={`/fornecedores`}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.contratos_ativos} contrato{r.contratos_ativos === 1 ? "" : "s"} ativo{r.contratos_ativos === 1 ? "" : "s"}
                  </p>
                </div>
                <CnpjStatusBadge status={r.cnpj_status} />
              </Link>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link to="/fornecedores?filtro=cnpj_inativo">
                Ver todos <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
