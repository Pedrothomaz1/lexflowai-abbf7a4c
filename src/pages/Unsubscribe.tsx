import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("validating");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setError("Token ausente.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          setError(data?.error ?? "Link inválido ou expirado.");
          return;
        }
        if (data?.already_unsubscribed) {
          setEmail(data?.email ?? null);
          setState("already");
          return;
        }
        setEmail(data?.email ?? null);
        setState("ready");
      } catch (e) {
        setState("invalid");
        setError("Não foi possível validar o link.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { error: fnError } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (fnError) throw fnError;
      setState("success");
    } catch (e: any) {
      setState("error");
      setError(e?.message ?? "Erro ao processar cancelamento.");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MailX className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Cancelar e-mails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state === "validating" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Validando link…</p>
            </div>
          )}

          {state === "ready" && (
            <>
              <p className="text-sm text-muted-foreground">
                Deseja parar de receber e-mails do LexFlow {email ? `em ${email}` : ""}?
              </p>
              <Button onClick={confirm} className="w-full">Confirmar cancelamento</Button>
            </>
          )}

          {state === "submitting" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Processando…</p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm">
                Pronto. {email ?? "Seu e-mail"} foi removido da lista.
              </p>
            </div>
          )}

          {state === "already" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm">
                {email ?? "Este e-mail"} já estava cancelado.
              </p>
            </div>
          )}

          {(state === "invalid" || state === "error") && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error ?? "Não foi possível processar."}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
