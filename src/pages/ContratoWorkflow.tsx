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
  FileDown, FileSpreadsheet, ScrollText, GitFork, Undo2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { handleDbError } from "@/utils/dbErrorHandler";
import { exportWorkflowHistoryPDF, exportWorkflowHistoryXLSX } from "@/utils/workflowExport";

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
  regra_aplicada?: boolean;
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
  devolvido: "bg-warning/15 text-warning border-warning/40",
  pulado: "bg-muted text-muted-foreground",
};

type Decisao = "aprovado" | "rejeitado" | "pulado" | "devolvido";

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
  const [pendingDecisao, setPendingDecisao] = useState<Decisao>("aprovado");
  const [pendingTargetOrdem, setPendingTargetOrdem] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

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
      const stagesData = (s as Stage[]) ?? [];
      const rsData = (rs as RunStage[]) ?? [];
      setStages(stagesData);
      setRunStages(rsData);

      // Resolver nomes dos responsáveis
      const userIds = Array.from(new Set(
        rsData.map(x => x.executado_por).filter(Boolean) as string[],
      ));
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, email").in("id", userIds);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || p.id; });
        setUserMap(map);
      } else {
        setUserMap({});
      }
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

  const avancar = async (decisao: Decisao, targetOrdem?: number | null) => {
    if (!run) return;
    if (decisao === "devolvido" && (!comentario || comentario.trim().length < 10)) {
      toast({ title: "Motivo obrigatório", description: "Informe ao menos 10 caracteres no motivo da devolução.", variant: "destructive" });
      return;
    }
    setAdvancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("workflow-advance", {
        body: {
          run_id: run.id,
          decisao,
          comentario: comentario || null,
          motivo: decisao === "devolvido" ? comentario : undefined,
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
        {run && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline"
              onClick={() => exportWorkflowHistoryPDF(contrato, run, stages, runStages, userMap)}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => exportWorkflowHistoryXLSX(contrato, run, stages, runStages, userMap)}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={async () => {
              setAuditOpen(true); setAuditLoading(true);
              const ids = [run.id, ...runStages.map(rs => rs.id)];
              const { data } = await supabase
                .from("audit_logs")
                .select("id, acao, entidade, entidade_id, user_id, created_at, dados_novos, dados_anteriores")
                .in("entidade", ["workflow_runs", "workflow_run_stages"])
                .in("entidade_id", ids)
                .order("created_at", { ascending: false })
                .limit(200);
              setAuditLogs(data ?? []);
              setAuditLoading(false);
            }}>
              <ScrollText className="h-4 w-4 mr-1" /> Auditoria
            </Button>
          </div>
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
                  onClick={() => {
                    setPendingDecisao("devolvido");
                    setPendingTargetOrdem(Math.max(1, (run.current_stage_ordem ?? 1) - 1));
                    setComentario("");
                    setDialogOpen(true);
                  }}
                  disabled={advancing || (run.current_stage_ordem ?? 1) <= 1}
                >
                  <Undo2 className="h-4 w-4 mr-1" /> Devolver
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
                const resp = rs.executado_por ? (userMap[rs.executado_por] ?? rs.executado_por.slice(0, 8)) : null;
                return (
                  <div key={rs.id} className="border-l-2 border-primary/30 pl-3 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">#{rs.ordem} {stage?.nome ?? "—"}</p>
                      <Badge variant="outline" className={`text-[10px] ${statusColor[rs.status] ?? ""}`}>
                        {rs.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {rs.decisao && (
                        <Badge variant="outline" className="text-[10px]">decisão: {rs.decisao}</Badge>
                      )}
                      {rs.regra_aplicada && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                          <GitFork className="h-2.5 w-2.5" /> regra aplicada
                        </Badge>
                      )}
                      {resp && (
                        <Badge variant="outline" className="text-[10px]">por {resp}</Badge>
                      )}
                    </div>
                    {rs.executado_em && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Executado em {new Date(rs.executado_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {rs.due_at && (
                      <p className="text-[11px] text-muted-foreground">
                        SLA: {new Date(rs.due_at).toLocaleString("pt-BR")}
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

      {run && contratoId && (
        <WorkflowStageDiscussion
          contratoId={contratoId}
          runStageId={currentRunStage?.id ?? null}
          stageNome={stages.find((s) => s.ordem === run.current_stage_ordem)?.nome}
          userMap={userMap}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDecisao === "devolvido"
                ? "Devolver para etapa anterior"
                : pendingTargetOrdem
                ? `Mover para etapa ${pendingTargetOrdem}`
                : pendingDecisao === "aprovado" ? "Aprovar etapa atual"
                : pendingDecisao === "rejeitado" ? "Rejeitar workflow"
                : "Pular etapa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingDecisao === "devolvido" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Devolver para</label>
                <Select
                  value={String(pendingTargetOrdem ?? "")}
                  onValueChange={(v) => setPendingTargetOrdem(Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Escolha a etapa" /></SelectTrigger>
                  <SelectContent>
                    {stages
                      .filter((s) => s.ordem < (run?.current_stage_ordem ?? 0))
                      .map((s) => (
                        <SelectItem key={s.id} value={String(s.ordem)}>
                          #{s.ordem} — {s.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Textarea
              placeholder={pendingDecisao === "devolvido"
                ? "Motivo da devolução (mínimo 10 caracteres) *"
                : "Comentário (opcional)"}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
            {pendingDecisao === "rejeitado" && (
              <p className="text-xs text-destructive">
                Esta ação encerrará o workflow imediatamente.
              </p>
            )}
            {pendingDecisao === "devolvido" && (
              <p className="text-xs text-muted-foreground">
                A etapa atual ficará marcada como devolvida e o workflow voltará para a etapa escolhida.
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

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Trilha de auditoria do workflow
            </DialogTitle>
          </DialogHeader>
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => {
                const userName = log.user_id ? (userMap[log.user_id] ?? log.user_id.slice(0, 8)) : "sistema";
                const novo = log.dados_novos ?? {};
                const status = novo.status;
                const decisao = novo.decisao;
                const regra = novo.regra_aplicada;
                return (
                  <div key={log.id} className="border rounded-md p-2 bg-muted/20 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{log.acao}</Badge>
                        <Badge variant="outline" className="text-[10px]">{log.entidade}</Badge>
                        {status && <Badge variant="outline" className="text-[10px]">status: {status}</Badge>}
                        {decisao && <Badge variant="outline" className="text-[10px]">decisão: {decisao}</Badge>}
                        {regra && <Badge variant="outline" className="text-[10px] text-primary border-primary/40">regra</Badge>}
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">por <span className="font-medium text-foreground">{userName}</span></p>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAuditOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
