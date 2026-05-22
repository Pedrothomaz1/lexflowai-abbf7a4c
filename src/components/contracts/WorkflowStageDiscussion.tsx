import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleDbError } from "@/utils/dbErrorHandler";

type Comment = {
  id: string;
  contrato_id: string;
  user_id: string;
  tipo: string;
  conteudo: string;
  status: string;
  created_at: string;
  workflow_run_stage_id: string | null;
  secao: string | null;
};

type Props = {
  contratoId: string;
  runStageId?: string | null;
  stageNome?: string;
  userMap?: Record<string, string>;
};

const tipoBadge: Record<string, { label: string; cls: string }> = {
  comentario: { label: "comentário", cls: "bg-muted text-muted-foreground" },
  anotacao: { label: "anotação", cls: "bg-primary/10 text-primary border-primary/30" },
  devolucao: { label: "devolução", cls: "bg-warning/15 text-warning border-warning/40" },
  decisao: { label: "decisão", cls: "bg-success/10 text-success border-success/30" },
};

export function WorkflowStageDiscussion({ contratoId, runStageId, stageNome, userMap = {} }: Props) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const load = async () => {
    if (!contratoId) return;
    setLoading(true);
    let q = supabase
      .from("contract_comments")
      .select("id, contrato_id, user_id, tipo, conteudo, status, created_at, workflow_run_stage_id, secao")
      .eq("contrato_id", contratoId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (runStageId) q = q.eq("workflow_run_stage_id", runStageId);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro", description: handleDbError(error).message, variant: "destructive" });
    } else {
      setComments((data ?? []) as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`cc-${contratoId}-${runStageId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_comments", filter: `contrato_id=eq.${contratoId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, runStageId]);

  const adicionar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: org } = await supabase.rpc("current_user_org");
      if (!auth.user || !org) throw new Error("Sem sessão ou organização");

      const { error } = await supabase.from("contract_comments").insert({
        contrato_id: contratoId,
        organization_id: org as unknown as string,
        user_id: auth.user.id,
        tipo: "anotacao",
        conteudo: texto.trim(),
        status: "aberto",
        secao: "workflow",
        workflow_run_stage_id: runStageId ?? null,
      });
      if (error) throw error;
      setTexto("");
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: handleDbError(e).message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const titulo = useMemo(
    () => (stageNome ? `Anotações — ${stageNome}` : "Anotações do contrato"),
    [stageNome],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione uma anotação visível para todos os envolvidos…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={adicionar} disabled={enviando || !texto.trim()}>
              <Send className="h-3.5 w-3.5 mr-1" /> Publicar
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
          {!loading && comments.length === 0 && (
            <p className="text-xs text-muted-foreground">Sem anotações ainda nesta etapa.</p>
          )}
          {comments.map((c) => {
            const meta = tipoBadge[c.tipo] ?? tipoBadge.comentario;
            const autor = userMap[c.user_id] ?? c.user_id.slice(0, 8);
            return (
              <div key={c.id} className="border rounded-md p-2 bg-muted/20">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>
                      {c.tipo === "devolucao" && <Undo2 className="h-2.5 w-2.5 mr-1 inline" />}
                      {meta.label}
                    </Badge>
                    <span className="text-xs font-medium">{autor}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.conteudo}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
