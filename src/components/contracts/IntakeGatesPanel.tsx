import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Rocket } from "lucide-react";

type GateResult = { ok: boolean; faltantes?: string[] } | null;

const STATUS_LABEL: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  em_preenchimento: { label: "Em preenchimento", variant: "secondary" },
  revisao_legal: { label: "Em revisão legal", variant: "secondary" },
  liberado: { label: "Liberado para aprovação", variant: "default" },
};

interface Props {
  contratoId: string;
  intakeStatus: string | null;
  onChanged?: () => void;
}

export function IntakeGatesPanel({ contratoId, intakeStatus, onChanged }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [gate1, setGate1] = useState<GateResult>(null);
  const [gate2, setGate2] = useState<GateResult>(null);

  const checkGates = useCallback(async () => {
    setLoading(true);
    try {
      const [g1, g2] = await Promise.all([
        supabase.rpc("check_gate1_completo" as never, { _contrato_id: contratoId } as never),
        supabase.rpc("check_gate2_completo" as never, { _contrato_id: contratoId } as never),
      ]);
      if (g1.error) throw g1.error;
      if (g2.error) throw g2.error;
      setGate1((g1.data as unknown) as GateResult);
      setGate2((g2.data as unknown) as GateResult);
    } catch (err) {
      toast({
        title: "Erro ao validar gates",
        description: err instanceof Error ? err.message : "Falha desconhecida",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [contratoId, toast]);

  useEffect(() => {
    void checkGates();
  }, [checkGates]);

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const { data, error } = await supabase.rpc(
        "release_intake_to_approval" as never,
        { _contrato_id: contratoId } as never,
      );
      if (error) throw error;
      const result = data as { success?: boolean; error?: string; faltantes?: string[] } | null;
      if (result?.success) {
        toast({ title: "Contrato liberado para aprovação" });
        onChanged?.();
        void checkGates();
      } else {
        toast({
          title: "Não foi possível liberar",
          description: result?.error ?? "Verifique os campos pendentes.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro ao liberar contrato",
        description: err instanceof Error ? err.message : "Falha desconhecida",
        variant: "destructive",
      });
    } finally {
      setReleasing(false);
    }
  };

  const statusInfo = STATUS_LABEL[intakeStatus ?? "rascunho"] ?? STATUS_LABEL.rascunho;
  const liberado = intakeStatus === "liberado";

  const renderGate = (title: string, gate: GateResult) => {
    if (!gate) return null;
    return (
      <Alert variant={gate.ok ? "default" : "destructive"}>
        <div className="flex items-start gap-2">
          {gate.ok ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5" />
          )}
          <div className="flex-1">
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
              {gate.ok ? (
                "Todos os requisitos atendidos."
              ) : (
                <>
                  Pendências:
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {(gate.faltantes ?? []).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Intake & Gates de liberação
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Valide a completude do contrato antes de enviá-lo ao fluxo de aprovação.
          </p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando requisitos...
          </div>
        ) : (
          <>
            {renderGate("Gate 1 — Completude do cadastro", gate1)}
            {renderGate("Gate 2 — Compliance & revisão legal", gate2)}
          </>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => void checkGates()} disabled={loading}>
            Revalidar
          </Button>
          <Button
            onClick={handleRelease}
            disabled={releasing || liberado || !gate2?.ok}
          >
            {releasing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            {liberado ? "Já liberado" : "Liberar para aprovação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
