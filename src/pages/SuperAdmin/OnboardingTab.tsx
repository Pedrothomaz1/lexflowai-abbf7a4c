import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail, RefreshCw, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STEPS = [0, 1, 3, 5, 7] as const;
const STEP_LABEL: Record<number, string> = {
  0: "Boas-vindas",
  1: "Tutorial",
  3: "Alertas",
  5: "Equipe",
  7: "Feedback",
};

interface OrgProgress {
  id: string;
  nome: string;
  created_at: string;
  status: string;
  done: Set<number>;
  failed: Set<number>;
  lastEmail: string | null;
}

export default function OnboardingTab() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgProgress[]>([]);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: settings }, { data: orgsData }, { data: logs }] = await Promise.all([
      supabase.from("onboarding_settings").select("enabled").eq("id", 1).maybeSingle(),
      supabase
        .from("organizations")
        .select("id, nome, created_at, status")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false }),
      supabase
        .from("onboarding_email_log")
        .select("organization_id, step, status, sent_at, email")
        .gte("sent_at", cutoff),
    ]);

    setEnabled(settings?.enabled !== false);

    const byOrg = new Map<string, OrgProgress>();
    (orgsData ?? []).forEach((o: any) => {
      byOrg.set(o.id, {
        id: o.id,
        nome: o.nome,
        created_at: o.created_at,
        status: o.status,
        done: new Set(),
        failed: new Set(),
        lastEmail: null,
      });
    });
    (logs ?? []).forEach((l: any) => {
      const p = byOrg.get(l.organization_id);
      if (!p) return;
      if (l.status === "sent") p.done.add(l.step);
      else p.failed.add(l.step);
      if (!p.lastEmail) p.lastEmail = l.email;
    });
    setOrgs([...byOrg.values()]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (v: boolean) => {
    setToggling(true);
    const { error } = await supabase
      .from("onboarding_settings")
      .update({ enabled: v, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .maybeSingle();
    setToggling(false);
    if (error) toast.error("Erro: " + error.message);
    else {
      setEnabled(v);
      toast.success(v ? "Onboarding ativado" : "Onboarding pausado");
    }
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("cron-onboarding-emails");
    setRunning(false);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(`Executado: ${(data as any)?.sent || 0} e-mail(s) enviado(s)`);
      load();
    }
  };

  const elapsedDays = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      {/* Header / Kill switch */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Sequência de onboarding por e-mail</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  5 e-mails ao longo dos primeiros 7 dias: boas-vindas, tutorial, alertas, equipe e feedback.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {enabled ? (
                  <span className="text-emerald-600">Ativa</span>
                ) : (
                  <span className="text-destructive">Pausada</span>
                )}
              </span>
              <Switch checked={enabled} disabled={toggling} onCheckedChange={toggleEnabled} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={runNow} disabled={running || !enabled}>
              {running ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5 mr-1.5" />
              )}
              Rodar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso por cliente (últimos 14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum cliente novo nos últimos 14 dias.
            </p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-24">Dias</TableHead>
                    {STEPS.map((s) => (
                      <TableHead key={s} className="text-center text-xs">
                        D+{s}
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {STEP_LABEL[s]}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((o) => {
                    const dias = elapsedDays(o.created_at);
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{o.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(o.created_at), "dd/MM", { locale: ptBR })}
                            {o.lastEmail && ` • ${o.lastEmail}`}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">D+{dias}</Badge>
                        </TableCell>
                        {STEPS.map((s) => {
                          const sent = o.done.has(s);
                          const failed = o.failed.has(s);
                          const pending = !sent && !failed && dias >= s;
                          const future = !sent && !failed && dias < s;
                          return (
                            <TableCell key={s} className="text-center">
                              {sent && <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />}
                              {failed && <AlertCircle className="h-4 w-4 text-destructive mx-auto" />}
                              {pending && <Clock className="h-4 w-4 text-amber-500 mx-auto" />}
                              {future && <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Enviado
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Pendente (será enviado na próxima execução)
            </span>
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" /> Falhou
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="h-3.5 w-3.5 text-muted-foreground/30" /> Ainda não chegou a hora
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
