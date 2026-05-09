import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, PlayCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegressionResult {
  name: string;
  pass: boolean;
  detail?: string;
}

interface RegressionSummary {
  started_at: string;
  finished_at: string;
  total: number;
  passed: number;
  failed: number;
  results: RegressionResult[];
}

export function SecurityRegressionRunner() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RegressionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setSummary(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<RegressionSummary>(
        "security-regression-runner",
        { method: "POST" }
      );
      if (invokeError) throw invokeError;
      if (!data) throw new Error("Resposta vazia do runner");
      setSummary(data);
      toast({
        title: data.failed === 0 ? "Todos os testes passaram" : "Falhas detectadas",
        description: `${data.passed}/${data.total} aprovados`,
        variant: data.failed === 0 ? "default" : "destructive",
      });
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao executar a suíte";
      setError(msg);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const duration = summary
    ? Math.round((new Date(summary.finished_at).getTime() - new Date(summary.started_at).getTime()) / 1000)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Suíte de Regressão de Segurança
            </CardTitle>
            <CardDescription>
              Executa em produção checagens de RLS (tabelas/storage), Realtime cross-org e autenticação de edge functions.
              A suíte usa contas SECQA seed e leva ~10-30s.
            </CardDescription>
          </div>
          <Button onClick={handleRun} disabled={running} className="shrink-0">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Executar Suíte
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao executar</AlertTitle>
            <AlertDescription className="break-all">{error}</AlertDescription>
          </Alert>
        )}

        {summary && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={summary.failed === 0 ? "default" : "destructive"} className="text-sm">
                {summary.passed}/{summary.total} aprovados
              </Badge>
              {summary.failed > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {summary.failed} falhas
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Duração: {duration}s · Concluído em {new Date(summary.finished_at).toLocaleString("pt-BR")}
              </span>
            </div>

            <ScrollArea className="h-[420px] rounded-md border">
              <div className="divide-y">
                {summary.results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3",
                      !r.pass && "bg-destructive/5"
                    )}
                  >
                    {r.pass ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      {r.detail && (
                        <p className="text-xs text-muted-foreground mt-1 break-words font-mono">
                          {r.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {!summary && !error && !running && (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução recente. Clique em "Executar Suíte" para validar o isolamento multi-tenant agora.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
