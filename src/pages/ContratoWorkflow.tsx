import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DndContext, DragEndEvent, DragOverlay, PointerSensor,
  useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, GitBranch, AlertTriangle, History,
} from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

type Stage = {
  id: string; ordem: number; nome: string;
  tipo_acao: string; sla_horas: number | null;
  aprovador_role: string | null; regras: any;
};
type RunStage = {
  id: string; stage_id: string; ordem: number; status: string;
  decisao: string | null; comentario: string | null;
  executado_por: string | null; executado_em: string | null;
  due_at: string | null; created_at: string;
};
type Run = {
  id: string; status: string; current_stage_ordem: number;
  workflow_definition_id: string; iniciado_em: string;
  concluido_em: string | null;
};
type Contrato = {
  id: string; titulo: string; numero_contrato: string;
  status: string; valor_total: number | null; tipo: string;
};

const statusColor: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-warning/30",
  aprovado: "bg-success/10 text-success border-success/30",
  rejeitado: "bg-destructive/10 text-destructive border-destructive/30",
  pulado: "bg-muted text-muted-foreground",
};

function ContractCard({ run, contrato, slaWarning }: { run: Run; contrato: Contrato; slaWarning: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${run.id}`,
  });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`bg-card border-2 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none
        ${isDragging ? "opacity-40" : ""}
        ${slaWarning ? "border-destructive/60" : "border-primary/40"}`}
    >
      <p className="text-xs text-muted-foreground font-mono">{contrato.numero_contrato}</p>
      <p className="font-semibold text-sm leading-tight mt-1">{contrato.titulo}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {contrato.valor_total && (
          <Badge variant="outline" className="text-xs">
            R$ {Number(contrato.valor_total).toLocaleString("pt-BR")}
          </Badge>
        )}
        {slaWarning && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> SLA
          </Badge>
        )}
      </div>
    </div>
  );
}

function Column({
  stage, runStage, isCurrent, children,
}: { stage: Stage; runStage?: RunStage; isCurrent: boolean; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage.ordem}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] rounded-lg border bg-muted/30 flex flex-col
        ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}
        ${isCurrent ? "border-primary" : ""}`}
    >
      <div className="px-3 py-2 border-b bg-background/60 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{stage.ordem}</span>
          {isCurrent && <Badge className="text-[10px] h-5">Atual</Badge>}
        </div>
        <p className="font-semibold text-sm mt-0.5">{stage.nome}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{stage.tipo_acao}</Badge>
          {stage.aprovador_role && (
            <Badge variant="outline" className="text-[10px]">{stage.aprovador_role}</Badge>
          )}
          {stage.sla_horas && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />{stage.sla_horas}h
            </Badge>
          )}
        </div>
      </div>
      <div className="p-2 space-y-2 flex-1 min-h-[120px]">
        {children}
        {runStage?.status && runStage.status !== "pendente" && (
          <Badge variant="outline" className={`text-[10px] ${statusColor[runStage.status] ?? ""}`}>
            {runStage.status}
            {runStage.executado_em && ` · ${new Date(runStage.executado_em).toLocaleDateString("pt-BR")}`}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function ContratoWorkflow() {
  const { id: contratoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [runStages, setRunStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDecisao, setPendingDecisao] = useState<"aprovado" | "rejeitado" | "pulado">("aprovado");
  const [pendingTargetOrdem, setPendingTargetOrdem] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const carregar = async () => {
    if (!contratoId) return;
    setLoading(true);
    const { data: c } = await supabase.from("contratos")
      .select("id, titulo, numero_contrato, status, valor_total, tipo")
      .eq("id", contratoId).maybeSingle();
    setContrato(c as Contrato | null);

    const { data: r } = await supabase.from("workflow_runs")
      .select("*").eq("contrato_id", contratoId)
      .order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
    setRun(r as Run | null);

    if (r) {
      const [{ data: s }, { data: rs }] = await Promise.all([
        supabase.from("workflow_stages").select("*")
          .eq("workflow_definition_id", r.workflow_definition_id)
          .order("ordem", { ascending: true }),
        supabase.from("workflow_run_stages").select("*")
          .eq("workflow_run_id", r.id)
          .order("ordem", { ascending: true }),
      ]);
      setStages((s as Stage[]) ?? []);
      setRunStages((rs as RunStage[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [contratoId]);

  // Realtime
  useEffect(() => {
    if (!run?.id) return;
    const ch = supabase.channel(`run-${run.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "workflow_run_stages", filter: `workflow_run_id=eq.${run.id}` },
        () => carregar())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "workflow_runs", filter: `id=eq.${run.id}` },
        () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [run?.id]);

  const currentRunStage = useMemo(
    () => runStages.find(rs => rs.ordem === run?.current_stage_ordem && rs.status === "pendente"),
    [runStages, run],
  );

  const slaWarning = useMemo(() => {
    if (!currentRunStage?.due_at) return false;
    return new Date(currentRunStage.due_at) < new Date();
  }, [currentRunStage]);

  const onDragEnd = (e: DragEndEvent) => {
    if (!run || !e.over) return;
    const overId = String(e.over.id);
    if (!overId.startsWith("col-")) return;
    const targetOrdem = Number(overId.replace("col-", ""));
    if (targetOrdem === run.current_stage_ordem) return;
    // Abrir modal de decisão
    setPendingTargetOrdem(targetOrdem);
    setPendingDecisao(targetOrdem > run.current_stage_ordem ? "aprovado" : "pulado");
    setComentario("");
    setDialogOpen(true);
  };

  const avancar = async (decisao: "aprovado" | "rejeitado" | "pulado", targetOrdem?: number | null) => {
    if (!run) return;
    setAdvancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("workflow-advance", {
        body: {
          run_id: run.id,
          decisao,
          comentario: comentario || null,
          target_stage_ordem: targetOrdem ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Falha");
      toast({
        title: `Etapa ${decisao}`,
        description: data?.regra_aplicada ? "Próximo estágio definido por regra condicional." : undefined,
      });
      setDialogOpen(false);
      await carregar();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return <div className="p-6"><p className="text-muted-foreground">Carregando workflow...</p></div>;
  }

  if (!contrato) {
    return <div className="p-6"><p className="text-muted-foreground">Contrato não encontrado.</p></div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/contratos/${contratoId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Workflow do contrato
          </h1>
          <p className="text-sm text-muted-foreground">
            {contrato.numero_contrato} · {contrato.titulo}
          </p>
        </div>
        {run && (
          <Badge variant="outline" className={statusColor[run.status] ?? ""}>
            {run.status}
          </Badge>
        )}
      </div>

      {!run ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum workflow ativo para este contrato.</p>
            <p className="text-xs text-muted-foreground">
              Configure um workflow padrão para o tipo "{contrato.tipo}" no Construtor de Workflows.
            </p>
            <Button variant="outline" onClick={() => navigate("/workflows/builder")}>
              Abrir construtor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-3">
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stages.map((s) => {
                  const rs = runStages.find(r => r.ordem === s.ordem);
                  const isCurrent = run.current_stage_ordem === s.ordem && run.status === "em_andamento";
                  return (
                    <Column key={s.id} stage={s} runStage={rs} isCurrent={isCurrent}>
                      {isCurrent && (
                        <ContractCard run={run} contrato={contrato} slaWarning={slaWarning} />
                      )}
                    </Column>
                  );
                })}
              </div>
              <DragOverlay />
            </DndContext>

            {run.status === "em_andamento" && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => { setPendingDecisao("aprovado"); setPendingTargetOrdem(null); setComentario(""); setDialogOpen(true); }}
                  disabled={advancing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar etapa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setPendingDecisao("pulado"); setPendingTargetOrdem(null); setComentario(""); setDialogOpen(true); }}
                  disabled={advancing}
                >
                  Pular
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setPendingDecisao("rejeitado"); setPendingTargetOrdem(null); setComentario(""); setDialogOpen(true); }}
                  disabled={advancing}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </div>
            )}
          </div>

          {/* Histórico */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {runStages.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem eventos ainda.</p>
              )}
              {runStages.map((rs) => {
                const stage = stages.find(s => s.id === rs.stage_id);
                return (
                  <div key={rs.id} className="border-l-2 border-primary/30 pl-3 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">#{rs.ordem} {stage?.nome ?? "—"}</p>
                      <Badge variant="outline" className={`text-[10px] ${statusColor[rs.status] ?? ""}`}>
                        {rs.status}
                      </Badge>
                    </div>
                    {rs.executado_em && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(rs.executado_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {rs.comentario && (
                      <p className="text-xs italic text-muted-foreground mt-1">"{rs.comentario}"</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingTargetOrdem
                ? `Mover para etapa ${pendingTargetOrdem}`
                : pendingDecisao === "aprovado" ? "Aprovar etapa atual"
                : pendingDecisao === "rejeitado" ? "Rejeitar workflow"
                : "Pular etapa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Comentário (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
            {pendingDecisao === "rejeitado" && (
              <p className="text-xs text-destructive">
                Esta ação encerrará o workflow imediatamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => avancar(pendingDecisao, pendingTargetOrdem)}
              disabled={advancing}
              variant={pendingDecisao === "rejeitado" ? "destructive" : "default"}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
