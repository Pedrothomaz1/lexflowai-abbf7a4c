import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  GitBranch,
  Undo2,
  Edit3,
  RotateCcw,
  Eye,
  GitCompare,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useVersioning, ContractVersion } from "@/hooks/useVersioning";
import { ContractRedlineEditor } from "@/components/ContractDetails/ContractRedlineEditor";
import { cn } from "@/lib/utils";

interface ContractRevisionsTabProps {
  contratoId: string;
  currentVersion: number;
  conteudoOriginal?: string | null;
  onVersionRestored?: () => void;
}

type TimelineEvent =
  | {
      kind: "version";
      id: string;
      created_at: string;
      created_by: string | null;
      version: ContractVersion;
    }
  | {
      kind: "redline";
      id: string;
      created_at: string;
      created_by: string | null;
      versao: number;
      status: string;
    }
  | {
      kind: "devolucao";
      id: string;
      created_at: string;
      created_by: string | null;
      ordem: number;
      comentario: string | null;
    };

const fieldLabels: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  status: "Status",
  intake_status: "Status de intake",
  tipo: "Tipo",
  valor_total: "Valor total",
  moeda: "Moeda",
  data_inicio: "Início",
  data_fim: "Término",
  data_assinatura: "Assinatura",
  fornecedor_id: "Fornecedor",
  condicao_pagamento: "Condição de pagamento",
  forma_pagamento: "Forma de pagamento",
  dados_bancarios: "Dados bancários",
  observacoes: "Observações",
  tags: "Tags",
  arquivo_url: "Arquivo",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function ContractRevisionsTab({
  contratoId,
  currentVersion,
  conteudoOriginal,
  onVersionRestored,
}: ContractRevisionsTabProps) {
  const { versions, loading: loadingVersions, fetchVersions, restoreVersion } =
    useVersioning(contratoId);

  const [redlines, setRedlines] = useState<TimelineEvent[]>([]);
  const [devolucoes, setDevolucoes] = useState<TimelineEvent[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(
    null
  );
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [diffLeftId, setDiffLeftId] = useState<string>("");
  const [diffRightId, setDiffRightId] = useState<string>("");

  useEffect(() => {
    fetchVersions();
    void loadExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId]);

  const loadExtras = async () => {
    if (!contratoId) return;
    setLoadingExtra(true);
    try {
      const [redlineRes, runsRes] = await Promise.all([
        supabase
          .from("contract_redlines")
          .select("id, created_at, created_by, versao, status")
          .eq("contrato_id", contratoId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("workflow_runs")
          .select("id")
          .eq("contrato_id", contratoId),
      ]);

      const rlEvents: TimelineEvent[] =
        (redlineRes.data || []).map((r) => ({
          kind: "redline",
          id: r.id,
          created_at: r.created_at,
          created_by: r.created_by,
          versao: r.versao,
          status: r.status,
        }));

      let devEvents: TimelineEvent[] = [];
      const runIds = (runsRes.data || []).map((r) => r.id);
      if (runIds.length > 0) {
        const { data: stages } = await supabase
          .from("workflow_run_stages")
          .select("id, created_at, executado_por, executado_em, ordem, comentario, decisao, status")
          .in("workflow_run_id", runIds)
          .eq("decisao", "devolvido")
          .order("executado_em", { ascending: false })
          .limit(50);

        devEvents = (stages || []).map((s) => ({
          kind: "devolucao",
          id: s.id,
          created_at: s.executado_em || s.created_at,
          created_by: s.executado_por,
          ordem: s.ordem,
          comentario: s.comentario,
        }));
      }

      setRedlines(rlEvents);
      setDevolucoes(devEvents);
    } finally {
      setLoadingExtra(false);
    }
  };

  // Build merged timeline
  const timeline = useMemo<TimelineEvent[]>(() => {
    const vEvents: TimelineEvent[] = versions.map((v) => ({
      kind: "version",
      id: v.id,
      created_at: v.created_at,
      created_by: v.created_by,
      version: v,
    }));
    return [...vEvents, ...redlines, ...devolucoes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [versions, redlines, devolucoes]);

  // Resolve user names
  useEffect(() => {
    const ids = Array.from(
      new Set(timeline.map((e) => e.created_by).filter(Boolean) as string[])
    );
    if (ids.length === 0) return;
    void supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const m: Record<string, string> = {};
        data.forEach((p) => {
          m[p.id] = p.full_name;
        });
        setUserNames((prev) => ({ ...prev, ...m }));
      });
  }, [timeline]);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    setRestoring(true);
    const ok = await restoreVersion(selectedVersion);
    setRestoring(false);
    if (ok) {
      setShowRestoreDialog(false);
      setSelectedVersion(null);
      onVersionRestored?.();
      void loadExtras();
    }
  };

  const loading = loadingVersions || loadingExtra;

  // ---------------- Diff view ----------------
  const left = versions.find((v) => v.id === diffLeftId);
  const right = versions.find((v) => v.id === diffRightId);
  const diffFields = useMemo(() => {
    if (!left || !right) return [];
    const keys = new Set<string>([
      ...Object.keys(left.snapshot || {}),
      ...Object.keys(right.snapshot || {}),
    ]);
    return Array.from(keys)
      .filter((k) => fieldLabels[k])
      .map((k) => ({
        campo: k,
        anterior: (left.snapshot as any)?.[k],
        novo: (right.snapshot as any)?.[k],
      }))
      .filter((d) => formatValue(d.anterior) !== formatValue(d.novo));
  }, [left, right]);

  return (
    <Tabs defaultValue="timeline" className="space-y-4">
      <TabsList>
        <TabsTrigger value="timeline">
          <History className="h-4 w-4 mr-1.5" /> Timeline
        </TabsTrigger>
        <TabsTrigger value="diff">
          <GitCompare className="h-4 w-4 mr-1.5" /> Comparar
        </TabsTrigger>
        <TabsTrigger value="redline">
          <Edit3 className="h-4 w-4 mr-1.5" /> Redlining
        </TabsTrigger>
      </TabsList>

      {/* TIMELINE */}
      <TabsContent value="timeline">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Versão atual: <span className="font-medium">v{currentVersion}</span>
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Sem revisões registradas ainda.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Eventos aparecem aqui quando o contrato é editado, devolvido no fluxo ou recebe redlines.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-4">
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
              <div className="space-y-4">
                {/* current */}
                <div className="relative flex items-start gap-4 pl-10">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                  <div className="flex-1 bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <Badge variant="default" className="text-xs">
                      Versão atual: v{currentVersion}
                    </Badge>
                  </div>
                </div>

                {timeline.map((evt) => (
                  <TimelineItem
                    key={`${evt.kind}-${evt.id}`}
                    event={evt}
                    userNames={userNames}
                    onView={(v) => setSelectedVersion(v)}
                    onRestore={(v) => {
                      setSelectedVersion(v);
                      setShowRestoreDialog(true);
                    }}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      {/* DIFF */}
      <TabsContent value="diff" className="space-y-4">
        {versions.length < 2 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            São necessárias pelo menos 2 versões para comparar.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Versão A (anterior)</label>
                <Select value={diffLeftId} onValueChange={setDiffLeftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versao} ·{" "}
                        {format(new Date(v.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Versão B (nova)</label>
                <Select value={diffRightId} onValueChange={setDiffRightId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versao} ·{" "}
                        {format(new Date(v.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {left && right ? (
              diffFields.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma diferença detectada entre as versões selecionadas.
                </p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {diffFields.map((d) => (
                    <div key={d.campo} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 text-sm">
                      <div className="font-medium text-muted-foreground">
                        {fieldLabels[d.campo] || d.campo}
                      </div>
                      <div className="bg-destructive/5 border border-destructive/20 rounded p-2 text-destructive break-words">
                        {formatValue(d.anterior)}
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded p-2 text-primary break-words">
                        {formatValue(d.novo)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Selecione duas versões para comparar.
              </p>
            )}
          </>
        )}
      </TabsContent>

      {/* REDLINE */}
      <TabsContent value="redline">
        <ContractRedlineEditor
          contratoId={contratoId}
          conteudoOriginal={conteudoOriginal || ""}
        />
      </TabsContent>

      {/* Restore dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar versão?</DialogTitle>
            <DialogDescription>
              O contrato voltará ao estado da versão {selectedVersion?.versao}. Uma nova versão será criada automaticamente (nada é perdido).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restaurando..." : "Confirmar restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog
        open={!!selectedVersion && !showRestoreDialog}
        onOpenChange={() => setSelectedVersion(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da versão {selectedVersion?.versao}</DialogTitle>
            <DialogDescription>
              {selectedVersion &&
                format(new Date(selectedVersion.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <ScrollArea className="max-h-[400px]">
              <div className="grid grid-cols-2 gap-3 text-sm pr-2">
                {Object.entries(selectedVersion.snapshot)
                  .filter(([k]) => fieldLabels[k])
                  .map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        {fieldLabels[k] || k}
                      </span>
                      <p className="font-medium break-words">{formatValue(v)}</p>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVersion(null)}>
              Fechar
            </Button>
            <Button onClick={() => setShowRestoreDialog(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

// ---------------- Timeline item ----------------
function TimelineItem({
  event,
  userNames,
  onView,
  onRestore,
}: {
  event: TimelineEvent;
  userNames: Record<string, string>;
  onView: (v: ContractVersion) => void;
  onRestore: (v: ContractVersion) => void;
}) {
  const userName = event.created_by ? userNames[event.created_by] : null;
  const when = format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  if (event.kind === "version") {
    const v = event.version;
    return (
      <div className="relative flex items-start gap-4 pl-10 group">
        <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-muted-foreground/40 group-hover:bg-muted-foreground" />
        <div className="flex-1 bg-card rounded-lg p-3 border hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Versão {v.versao}</span>
              {v.motivo && (
                <Badge variant="outline" className="text-xs">
                  {v.motivo}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{when}</span>
          </div>
          {userName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <UserIcon className="h-3 w-3" />
              {userName}
            </div>
          )}
          {v.alteracoes && v.alteracoes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {v.alteracoes.length} campo(s) alterado(s):{" "}
              {v.alteracoes
                .slice(0, 4)
                .map((a) => fieldLabels[a.campo] || a.campo)
                .join(", ")}
              {v.alteracoes.length > 4 ? "…" : ""}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(v)}>
              <Eye className="h-3 w-3 mr-1" /> Detalhes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary"
              onClick={() => onRestore(v)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (event.kind === "redline") {
    return (
      <div className="relative flex items-start gap-4 pl-10">
        <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-amber-500/70" />
        <div className="flex-1 bg-card rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">Redline v{event.versao}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {event.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{when}</span>
          </div>
          {userName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserIcon className="h-3 w-3" />
              {userName}
            </div>
          )}
        </div>
      </div>
    );
  }

  // devolução
  return (
    <div className="relative flex items-start gap-4 pl-10">
      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-destructive/70" />
      <div className="flex-1 bg-destructive/5 rounded-lg p-3 border border-destructive/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-destructive" />
            <span className="font-medium text-sm">
              Devolução no workflow (etapa {event.ordem})
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{when}</span>
        </div>
        {userName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <UserIcon className="h-3 w-3" />
            {userName}
          </div>
        )}
        {event.comentario && (
          <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap">
            {event.comentario}
          </p>
        )}
      </div>
    </div>
  );
}
