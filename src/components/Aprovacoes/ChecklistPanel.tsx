import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCard, AnimatedCardHeader, AnimatedCardContent } from "@/components/ui/animated-card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleDbError } from "@/utils/dbErrorHandler";

/**
 * Checklist pré-assinatura conforme master spec v2 (#11).
 * 5 itens mínimos. Cada item satisfeito grava validado_por + validado_em.
 */
const CRITERIOS_PADRAO = [
  "Documento final definido",
  "Campos obrigatórios preenchidos",
  "Aprovações concluídas",
  "Anexos obrigatórios presentes",
  "Contraparte validada",
];

interface Item {
  id?: string;
  criterio: string;
  satisfeito: boolean;
  validado_por?: string | null;
  validado_em?: string | null;
}

interface Props {
  contratoId: string;
  readOnly?: boolean;
}

export function ChecklistPanel({ contratoId, readOnly = false }: Props) {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [pendencias, setPendencias] = useState<Array<{ criterio: string; detalhe: string }> | null>(null);

  useEffect(() => {
    if (!contratoId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("contract_checklist")
        .select("*")
        .eq("contrato_id", contratoId);

      if (!mounted) return;
      const byCriterio = new Map((data ?? []).map((i: any) => [i.criterio, i]));
      const merged = CRITERIOS_PADRAO.map((c) => byCriterio.get(c) ?? { criterio: c, satisfeito: false });
      setItems(merged as Item[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [contratoId]);

  const toggleItem = async (criterio: string, satisfeito: boolean) => {
    if (readOnly || !organization?.id || !user?.id) return;
    const existing = items.find((i) => i.criterio === criterio);

    try {
      if (existing?.id) {
        const { error } = await supabase
          .from("contract_checklist")
          .update({
            satisfeito,
            validado_por: satisfeito ? user.id : null,
            validado_em: satisfeito ? new Date().toISOString() : null,
          })
          .eq("id", existing.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contract_checklist").insert({
          organization_id: organization.id,
          contrato_id: contratoId,
          criterio,
          satisfeito,
          validado_por: satisfeito ? user.id : null,
          validado_em: satisfeito ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }

      setItems((prev) =>
        prev.map((i) => i.criterio === criterio ? { ...i, satisfeito } : i)
      );
    } catch (e: any) {
      toast({ title: "Erro", description: handleDbError(e).message, variant: "destructive" });
    }
  };

  const validarChecklist = async () => {
    setValidating(true);
    setPendencias(null);
    try {
      const { data, error } = await supabase.functions.invoke("validar-checklist-pre-assinatura", {
        body: { contrato_id: contratoId },
      });
      if (error) throw error;
      setPendencias(data?.pendencias ?? []);
      if (data?.ok) {
        toast({ title: "Checklist válido", description: "Contrato pronto para assinatura." });
      } else {
        toast({
          title: "Checklist incompleto",
          description: `${data?.pendencias?.length ?? 0} pendência(s) identificada(s).`,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Erro ao validar", description: e.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  if (loading) return null;

  const totalSatisfeitos = items.filter((i) => i.satisfeito).length;

  return (
    <AnimatedCard>
      <AnimatedCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Checklist pré-assinatura</h3>
          <Badge variant={totalSatisfeitos === items.length ? "default" : "outline"}>
            {totalSatisfeitos}/{items.length}
          </Badge>
        </div>
      </AnimatedCardHeader>
      <AnimatedCardContent className="space-y-3">
        {items.map((item) => (
          <label key={item.criterio} className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={item.satisfeito}
              onCheckedChange={(v) => toggleItem(item.criterio, Boolean(v))}
              disabled={readOnly}
              className="mt-0.5"
            />
            <span className={`text-sm ${item.satisfeito ? "text-muted-foreground line-through" : ""}`}>
              {item.criterio}
            </span>
          </label>
        ))}

        {!readOnly && (
          <div className="pt-3 border-t space-y-2">
            <Button onClick={validarChecklist} disabled={validating} variant="secondary" className="w-full">
              {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Validar para assinatura
            </Button>
            {pendencias && pendencias.length > 0 && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Pendências:
                </p>
                <ul className="text-xs text-destructive list-disc pl-4">
                  {pendencias.map((p, i) => <li key={i}>{p.detalhe}</li>)}
                </ul>
              </div>
            )}
            {pendencias && pendencias.length === 0 && (
              <div className="rounded-md bg-success/10 border border-success/30 p-2 text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Contrato pronto para assinatura
              </div>
            )}
          </div>
        )}
      </AnimatedCardContent>
    </AnimatedCard>
  );
}
