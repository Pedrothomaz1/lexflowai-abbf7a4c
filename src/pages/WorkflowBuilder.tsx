import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Plus,
  ArrowDown,
  Trash2,
  Save,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";
import { ConditionalRulesEditor } from "@/components/workflow/ConditionalRulesEditor";



type Definition = {
  id: string;
  nome: string;
  descricao: string | null;
  is_active: boolean;
  current_version: number;
  escopo_area: string | null;
  created_at: string;
};

type Stage = {
  id?: string;
  workflow_definition_id?: string;
  organization_id?: string;
  nome: string;
  ordem: number;
  tipo_acao: string;
  aprovador_role: string | null;
  aprovador_user_id: string | null;
  sla_horas: number | null;
  regras?: any;
};

type Run = {
  id: string;
  workflow_definition_id: string;
  contrato_id: string | null;
  status: string;
  current_stage_ordem: number;
  iniciado_em: string;
  concluido_em: string | null;
};

type RunStage = {
  id: string;
  workflow_run_id: string;
  stage_id: string;
  ordem: number;
  status: string;
  decisao: string | null;
  comentario: string | null;
  executado_em: string | null;
};

const TIPOS_ACAO = [
  { value: "aprovacao", label: "Aprovação" },
  { value: "assinatura", label: "Assinatura" },
  { value: "revisao", label: "Revisão" },
  { value: "notificacao", label: "Notificação" },
];

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    em_andamento: "bg-primary/10 text-primary border-primary/30",
    aprovado: "bg-success/10 text-success border-success/30",
    concluido: "bg-success/10 text-success border-success/30",
    rejeitado: "bg-destructive/10 text-destructive border-destructive/30",
    pendente: "bg-muted text-muted-foreground",
    pulado: "bg-muted text-muted-foreground",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const WorkflowBuilder = () => {
  const { toast } = useToast();
  const { currentOrg } = useOrganization() as any;
  const [tab, setTab] = useState("definicoes");
  const [defs, setDefs] = useState<Definition[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<Definition | null>(null);
  const [defName, setDefName] = useState("");
  const [defDesc, setDefDesc] = useState("");
  const [defArea, setDefArea] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [saving, setSaving] = useState(false);

  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [runStages, setRunStages] = useState<RunStage[]>([]);
  const [advancing, setAdvancing] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [d, r] = await Promise.all([
      supabase.from("workflow_definitions").select("*").order("created_at", { ascending: false }),
      supabase.from("workflow_runs").select("*").order("iniciado_em", { ascending: false }).limit(50),
    ]);
    if (d.error) handleDbError(d.error);
    if (r.error) handleDbError(r.error);
    setDefs((d.data as Definition[]) || []);
    setRuns((r.data as Run[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const openCreate = () => {
    setEditingDef(null);
    setDefName("");
    setDefDesc("");
    setDefArea("");
    setStages([
      { nome: "Análise jurídica", ordem: 1, tipo_acao: "aprovacao", aprovador_role: "analista_juridico", aprovador_user_id: null, sla_horas: 48 },
    ]);
    setEditorOpen(true);
  };

  const openEdit = async (def: Definition) => {
    setEditingDef(def);
    setDefName(def.nome);
    setDefDesc(def.descricao || "");
    setDefArea(def.escopo_area || "");
    const { data, error } = await supabase
      .from("workflow_stages")
      .select("*")
      .eq("workflow_definition_id", def.id)
      .order("ordem", { ascending: true });
    if (error) {
      handleDbError(error);
      return;
    }
    setStages((data as Stage[]) || []);
    setEditorOpen(true);
  };

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        nome: `Etapa ${prev.length + 1}`,
        ordem: prev.length + 1,
        tipo_acao: "aprovacao",
        aprovador_role: "administrador",
        aprovador_user_id: null,
        sla_horas: 48,
      },
    ]);
  };

  const updateStage = (idx: number, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStage = (idx: number) => {
    setStages((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordem: i + 1 })),
    );
  };

  const salvarDefinicao = async () => {
    if (!defName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (stages.length === 0) {
      toast({ title: "Adicione ao menos uma etapa", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      const orgId =
        currentOrg?.id ||
        (await supabase.rpc("current_user_org" as any)).data;
      if (!orgId) throw new Error("Organização não encontrada");

      let defId = editingDef?.id;

      if (editingDef) {
        const { data, error } = await supabase
          .from("workflow_definitions")
          .update({
            nome: defName,
            descricao: defDesc || null,
            escopo_area: defArea || null,
          })
          .eq("id", editingDef.id)
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao atualizar");
      } else {
        const { data, error } = await supabase
          .from("workflow_definitions")
          .insert({
            nome: defName,
            descricao: defDesc || null,
            escopo_area: defArea || null,
            organization_id: orgId,
            created_by: user.id,
          })
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao criar");
        defId = data.id;
      }

      // Limpa stages antigas e reinsere
      if (editingDef) {
        await supabase.from("workflow_stages").delete().eq("workflow_definition_id", defId!);
      }

      const stageRows = stages.map((s, i) => ({
        workflow_definition_id: defId!,
        organization_id: orgId,
        nome: s.nome,
        ordem: i + 1,
        tipo_acao: s.tipo_acao,
        aprovador_role: s.aprovador_role,
        aprovador_user_id: s.aprovador_user_id,
        sla_horas: s.sla_horas,
        regras: s.regras || {},
      }));
      const { error: sErr } = await supabase.from("workflow_stages").insert(stageRows);
      if (sErr) throw sErr;

      toast({ title: "Workflow salvo", description: `${stages.length} etapas configuradas.` });
      setEditorOpen(false);
      await carregar();
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Falha desconhecida",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (def: Definition) => {
    const { data, error } = await supabase
      .from("workflow_definitions")
      .update({ is_active: !def.is_active })
      .eq("id", def.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      handleDbError(error);
      return;
    }
    setDefs((prev) => prev.map((d) => (d.id === def.id ? (data as Definition) : d)));
  };

  const abrirRun = async (run: Run) => {
    setSelectedRun(run);
    setRunDetailOpen(true);
    const { data, error } = await supabase
      .from("workflow_run_stages")
      .select("*")
      .eq("workflow_run_id", run.id)
      .order("ordem", { ascending: true });
    if (error) handleDbError(error);
    setRunStages((data as RunStage[]) || []);
  };

  const avancarRun = async (decisao: "aprovado" | "rejeitado" | "pulado") => {
    if (!selectedRun) return;
    setAdvancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("workflow-advance", {
        body: { run_id: selectedRun.id, decisao },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Falha");
      toast({ title: `Etapa ${decisao}` });
      await carregar();
      await abrirRun(selectedRun);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setAdvancing(false);
    }
  };

  const defNome = (id: string) => defs.find((d) => d.id === id)?.nome || "—";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Construtor de Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina fluxos de aprovação e acompanhe a execução em tempo real.
          </p>
        </div>
        {tab === "definicoes" && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo workflow
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="definicoes">Definições ({defs.length})</TabsTrigger>
          <TabsTrigger value="execucoes">Execuções ({runs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="definicoes" className="space-y-3 mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : defs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum workflow criado.</p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro
                </Button>
              </CardContent>
            </Card>
          ) : (
            defs.map((d) => (
              <Card key={d.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{d.nome}</span>
                      <Badge variant={d.is_active ? "default" : "secondary"}>
                        {d.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline">v{d.current_version}</Badge>
                      {d.escopo_area && (
                        <Badge variant="outline" className="text-xs">
                          {d.escopo_area}
                        </Badge>
                      )}
                    </div>
                    {d.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{d.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAtivo(d)}>
                      {d.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="execucoes" className="space-y-3 mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : runs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma execução ainda.</p>
              </CardContent>
            </Card>
          ) : (
            runs.map((r) => (
              <Card
                key={r.id}
                className="hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => abrirRun(r)}
              >
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{defNome(r.workflow_definition_id)}</span>
                      <Badge className={statusBadge(r.status)} variant="outline">
                        {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Etapa {r.current_stage_ordem}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Iniciado em {new Date(r.iniciado_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDef ? "Editar workflow" : "Novo workflow"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={defName} onChange={(e) => setDefName(e.target.value)} />
              </div>
              <div>
                <Label>Área (opcional)</Label>
                <Input
                  value={defArea}
                  onChange={(e) => setDefArea(e.target.value)}
                  placeholder="Ex: Compras, Jurídico"
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={defDesc}
                onChange={(e) => setDefDesc(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-base">Etapas do fluxo</Label>
              <p className="text-xs text-muted-foreground">
                Defina a sequência de aprovações. Cada etapa é executada após a anterior.
              </p>
            </div>

            {/* Canvas vertical */}
            <div className="space-y-2">
              {stages.map((s, idx) => (
                <div key={idx}>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="py-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <Input
                            value={s.nome}
                            onChange={(e) => updateStage(idx, { nome: e.target.value })}
                            className="font-medium"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStage(idx)}
                          disabled={stages.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Tipo de ação</Label>
                          <Select
                            value={s.tipo_acao}
                            onValueChange={(v) => updateStage(idx, { tipo_acao: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_ACAO.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Papel aprovador</Label>
                          <Input
                            value={s.aprovador_role || ""}
                            onChange={(e) =>
                              updateStage(idx, { aprovador_role: e.target.value || null })
                            }
                            placeholder="Ex: administrador"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">SLA (horas)</Label>
                          <Input
                            type="number"
                            value={s.sla_horas ?? ""}
                            onChange={(e) =>
                              updateStage(idx, {
                                sla_horas: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </div>
                      </div>

                      <ConditionalRulesEditor
                        regras={s.regras}
                        totalEtapas={stages.length}
                        etapaAtualOrdem={idx + 1}
                        onChange={(regras) => updateStage(idx, { regras })}
                      />
                    </CardContent>
                  </Card>

                  {idx < stages.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full" onClick={addStage}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar etapa
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarDefinicao} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run detail */}
      <Dialog open={runDetailOpen} onOpenChange={setRunDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRun ? defNome(selectedRun.workflow_definition_id) : "Execução"}
            </DialogTitle>
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusBadge(selectedRun.status)} variant="outline">
                  {selectedRun.status}
                </Badge>
                <Badge variant="outline">Etapa atual: {selectedRun.current_stage_ordem}</Badge>
              </div>

              <div className="space-y-2">
                {runStages.map((rs, idx) => {
                  const isAtual =
                    rs.ordem === selectedRun.current_stage_ordem &&
                    selectedRun.status === "em_andamento";
                  const icon =
                    rs.status === "aprovado" || rs.status === "pulado" ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : rs.status === "rejeitado" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    );
                  return (
                    <div key={rs.id}>
                      <Card className={isAtual ? "border-primary border-2" : ""}>
                        <CardContent className="py-3 flex items-start gap-3">
                          {icon}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">Etapa {rs.ordem}</span>
                              <Badge className={statusBadge(rs.status)} variant="outline">
                                {rs.status}
                              </Badge>
                              {rs.decisao && (
                                <Badge variant="secondary" className="text-xs">
                                  {rs.decisao}
                                </Badge>
                              )}
                            </div>
                            {rs.comentario && (
                              <p className="text-sm text-muted-foreground mt-1">{rs.comentario}</p>
                            )}
                            {rs.executado_em && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Concluído em {new Date(rs.executado_em).toLocaleString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      {idx < runStages.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedRun.status === "em_andamento" && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => avancarRun("rejeitado")}
                    disabled={advancing}
                  >
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                    Rejeitar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => avancarRun("pulado")}
                    disabled={advancing}
                  >
                    Pular
                  </Button>
                  <Button onClick={() => avancarRun("aprovado")} disabled={advancing}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowBuilder;
