import { ReactNode, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard, AnimatedCardHeader, AnimatedCardContent } from "@/components/ui/animated-card";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ChecklistPanel } from "./ChecklistPanel";

interface Pendencia { criterio: string; detalhe: string }

interface Props {
  contratoId: string;
  children: ReactNode;
}

/**
 * Bloqueia "Enviar para assinatura" enquanto o edge function
 * `validar-checklist-pre-assinatura` retornar pendências (#11 spec v2).
 */
export function PreSignatureGuard({ contratoId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [ok, setOk] = useState(false);

  const validar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("validar-checklist-pre-assinatura", {
        body: { contrato_id: contratoId },
      });
      setPendencias(data?.pendencias ?? []);
      setOk(Boolean(data?.ok));
    } catch {
      setOk(false);
      setPendencias([{ criterio: "erro", detalhe: "Falha ao validar checklist" }]);
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => { validar(); }, [validar]);

  if (loading) {
    return (
      <AnimatedCard>
        <AnimatedCardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Validando checklist pré-assinatura…
        </AnimatedCardContent>
      </AnimatedCard>
    );
  }

  if (!ok) {
    return (
      <div className="space-y-4">
        <AnimatedCard className="border-destructive/40 bg-destructive/5">
          <AnimatedCardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Envio bloqueado</h3>
                <p className="text-sm text-muted-foreground">
                  Resolva as pendências abaixo antes de enviar para assinatura.
                </p>
              </div>
              <Badge variant="destructive" className="ml-auto">{pendencias.length} pendência(s)</Badge>
            </div>
          </AnimatedCardHeader>
          <AnimatedCardContent className="space-y-3">
            <ul className="text-sm space-y-1 list-disc pl-5">
              {pendencias.map((p, i) => (
                <li key={i}><span className="font-medium">{p.criterio}:</span> {p.detalhe}</li>
              ))}
            </ul>
            <Button onClick={validar} variant="outline" size="sm">
              <ShieldCheck className="h-4 w-4 mr-2" /> Revalidar
            </Button>
          </AnimatedCardContent>
        </AnimatedCard>
        <ChecklistPanel contratoId={contratoId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> Contrato pronto para envio à assinatura.
        <Button onClick={validar} variant="ghost" size="sm" className="ml-auto h-7">Revalidar</Button>
      </div>
      {children}
    </div>
  );
}
