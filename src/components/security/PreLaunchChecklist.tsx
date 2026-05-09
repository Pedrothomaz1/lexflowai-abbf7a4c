import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, MinusCircle, ShieldAlert } from "lucide-react";
import {
  PRE_LAUNCH_FRENTES,
  PRE_LAUNCH_TESTS,
  type PreLaunchTest,
  type TestStatus,
} from "./preLaunchTests";

interface RunRow {
  test_id: string;
  status: TestStatus;
  evidence_url: string | null;
  notes: string | null;
  executed_at: string;
}

const STATUS_META: Record<TestStatus, { label: string; icon: typeof CheckCircle2; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  passed: { label: "Aprovado", icon: CheckCircle2, variant: "default" },
  failed: { label: "Falhou", icon: XCircle, variant: "destructive" },
  pending: { label: "Pendente", icon: Clock, variant: "outline" },
  skipped: { label: "Não aplicável", icon: MinusCircle, variant: "secondary" },
};

export function PreLaunchChecklist() {
  const { toast } = useToast();
  const [runs, setRuns] = useState<Record<string, RunRow>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PreLaunchTest | null>(null);
  const [draft, setDraft] = useState<{ status: TestStatus; evidence_url: string; notes: string }>({
    status: "passed",
    evidence_url: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pre_launch_test_runs")
      .select("test_id, status, evidence_url, notes, executed_at");
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      const map: Record<string, RunRow> = {};
      (data || []).forEach((r) => {
        const existing = map[r.test_id];
        if (!existing || new Date(r.executed_at) > new Date(existing.executed_at)) {
          map[r.test_id] = r as RunRow;
        }
      });
      setRuns(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const stats = useMemo(() => {
    const total = PRE_LAUNCH_TESTS.length;
    const counts = { passed: 0, failed: 0, pending: 0, skipped: 0 };
    PRE_LAUNCH_TESTS.forEach((t) => {
      const s = runs[t.id]?.status ?? "pending";
      counts[s]++;
    });
    const completed = counts.passed + counts.skipped;
    return { total, counts, percent: Math.round((completed / total) * 100) };
  }, [runs]);

  const criticalsBlocking = useMemo(
    () =>
      PRE_LAUNCH_TESTS.filter(
        (t) => t.critico && (runs[t.id]?.status ?? "pending") !== "passed" && runs[t.id]?.status !== "skipped"
      ),
    [runs]
  );

  const openEdit = (test: PreLaunchTest) => {
    const cur = runs[test.id];
    setDraft({
      status: cur?.status ?? "passed",
      evidence_url: cur?.evidence_url ?? "",
      notes: cur?.notes ?? "",
    });
    setEditing(test);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast({ title: "Sessão expirada", variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("pre_launch_test_runs")
      .upsert(
        {
          test_id: editing.id,
          frente: editing.frente,
          status: draft.status,
          evidence_url: draft.evidence_url || null,
          notes: draft.notes || null,
          executed_by: userId,
          executed_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,test_id" }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Resultado registrado" });
    setEditing(null);
    fetchRuns();
  };

  const grouped = useMemo(() => {
    const g: Record<string, PreLaunchTest[]> = {};
    PRE_LAUNCH_TESTS.forEach((t) => {
      g[t.frente] = g[t.frente] ?? [];
      g[t.frente].push(t);
    });
    return g;
  }, []);

  const [running, setRunning] = useState(false);

  const runAutomated = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("pre-launch-test-runner", {
        body: {},
      });
      if (error) throw error;
      const summary = data as { passed: number; failed: number; skipped: number; total: number };
      toast({
        title: "Suíte executada",
        description: `${summary.passed} aprovados · ${summary.failed} falharam · ${summary.skipped} N/A`,
        variant: summary.failed > 0 ? "destructive" : "default",
      });
      fetchRuns();
    } catch (e: any) {
      toast({ title: "Falha ao executar", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Checklist Pré-Venda — {stats.total} testes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stats.percent} />
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">{stats.counts.passed} aprovados</Badge>
            <Badge variant="destructive">{stats.counts.failed} falharam</Badge>
            <Badge variant="outline">{stats.counts.pending} pendentes</Badge>
            <Badge variant="secondary">{stats.counts.skipped} N/A</Badge>
            <Badge variant={criticalsBlocking.length === 0 ? "default" : "destructive"}>
              {criticalsBlocking.length === 0
                ? "Critérios críticos OK"
                : `${criticalsBlocking.length} críticos pendentes`}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAutomated} disabled={running} size="sm">
              {running ? "Executando…" : "Executar suíte automatizada"}
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              Cobre ~15 testes (regressão RLS, login, LGPD). Os demais ficam manuais.
            </span>
          </div>
          {criticalsBlocking.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Lançamento bloqueado enquanto houver testes críticos não aprovados.
            </p>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={Object.keys(PRE_LAUNCH_FRENTES)} className="space-y-2">
        {Object.entries(PRE_LAUNCH_FRENTES).map(([key, frente]) => {
          const tests = grouped[key] ?? [];
          const passedInFrente = tests.filter(
            (t) => (runs[t.id]?.status ?? "pending") === "passed" || runs[t.id]?.status === "skipped"
          ).length;
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="text-left">
                    <div className="font-medium">
                      Frente {key} — {frente.titulo}
                    </div>
                    <div className="text-xs text-muted-foreground">{frente.descricao}</div>
                  </div>
                  <Badge variant="outline">
                    {passedInFrente}/{tests.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {tests.map((t) => {
                    const status = runs[t.id]?.status ?? "pending";
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={t.id}
                        className="flex items-start justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                            <span className="font-medium text-sm">{t.titulo}</span>
                            {t.critico && (
                              <Badge variant="destructive" className="text-[10px]">
                                crítico
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Como executar:</strong> {t.comoExecutar}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Aprovado se:</strong> {t.aprovadoSe}
                          </p>
                          {runs[t.id]?.notes && (
                            <p className="text-xs italic text-muted-foreground">
                              Nota: {runs[t.id]?.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={meta.variant} className="gap-1">
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(t)}
                            disabled={loading}
                          >
                            Registrar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id} — {editing?.titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v as TestStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Aprovado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="skipped">Não aplicável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL da evidência (opcional)</label>
              <Input
                placeholder="https://… ou docs/test-evidence/1.2-…"
                value={draft.evidence_url}
                onChange={(e) => setDraft((d) => ({ ...d, evidence_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                placeholder="Detalhes da execução, link do log, justificativa…"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
