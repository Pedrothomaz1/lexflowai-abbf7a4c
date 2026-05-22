import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Plus,
  Trash2,
  Save,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  Link2,
} from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";
import { DynamicFormRenderer, type FormField } from "@/components/Requisicoes/DynamicFormRenderer";

type Form = {
  id: string;
  nome: string;
  descricao: string | null;
  is_active: boolean;
  current_version: number;
  escopo_area: string | null;
  created_at: string;
};

const TIPOS_CAMPO = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Checkbox" },
  { value: "email", label: "E-mail" },
];

const FormBuilder = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("request_forms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) handleDbError(error);
    setForms((data as Form[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setArea("");
    setFields([
      { key: "titulo", label: "Título", tipo: "text", obrigatorio: true },
      { key: "descricao", label: "Descrição", tipo: "textarea", obrigatorio: true },
    ]);
    setEditorOpen(true);
  };

  const openEdit = async (f: Form) => {
    setEditing(f);
    setNome(f.nome);
    setDescricao(f.descricao || "");
    setArea(f.escopo_area || "");
    const { data, error } = await supabase
      .from("request_form_versions")
      .select("schema_campos")
      .eq("form_id", f.id)
      .eq("versao", f.current_version)
      .maybeSingle();
    if (error) handleDbError(error);
    const schema = (data?.schema_campos as any) || [];
    setFields(Array.isArray(schema) ? schema : []);
    setEditorOpen(true);
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: `campo_${prev.length + 1}`,
        label: `Campo ${prev.length + 1}`,
        tipo: "text",
        obrigatorio: false,
      },
    ]);
  };

  const updateField = (idx: number, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));

  const moveField = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const salvar = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Adicione ao menos um campo", variant: "destructive" });
      return;
    }
    const keys = new Set<string>();
    for (const f of fields) {
      if (!f.key.trim() || !f.label.trim()) {
        toast({ title: "Todos os campos precisam de chave e rótulo", variant: "destructive" });
        return;
      }
      if (keys.has(f.key)) {
        toast({ title: `Chave duplicada: ${f.key}`, variant: "destructive" });
        return;
      }
      keys.add(f.key);
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      const { data: orgRes } = await supabase.rpc("current_user_org" as any);
      const orgId = orgRes as string;
      if (!orgId) throw new Error("Organização não encontrada");

      let formId = editing?.id;
      let novaVersao = editing ? editing.current_version + 1 : 1;

      if (editing) {
        const { data, error } = await supabase
          .from("request_forms")
          .update({
            nome,
            descricao: descricao || null,
            escopo_area: area || null,
            current_version: novaVersao,
          })
          .eq("id", editing.id)
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao atualizar");
      } else {
        const { data, error } = await supabase
          .from("request_forms")
          .insert({
            nome,
            descricao: descricao || null,
            escopo_area: area || null,
            organization_id: orgId,
            created_by: user.id,
            current_version: 1,
          })
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao criar");
        formId = data.id;
        novaVersao = 1;
      }

      const { error: vErr } = await supabase.from("request_form_versions").insert({
        form_id: formId!,
        organization_id: orgId,
        created_by: user.id,
        versao: novaVersao,
        schema_campos: fields as any,
        is_published: true,
        changelog: editing ? "Atualização do schema" : "Versão inicial",
      });
      if (vErr) throw vErr;

      toast({ title: "Formulário salvo", description: `Versão ${novaVersao} publicada.` });
      setEditorOpen(false);
      await carregar();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (f: Form) => {
    const { data, error } = await supabase
      .from("request_forms")
      .update({ is_active: !f.is_active })
      .eq("id", f.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      handleDbError(error);
      return;
    }
    setForms((prev) => prev.map((x) => (x.id === f.id ? (data as Form) : x)));
  };

  const copiarLink = (f: Form) => {
    const url = `${window.location.origin}/requisicao/form/${f.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Construtor de Formulários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie formulários de requisição personalizados por área ou tipo de contrato.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo formulário
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum formulário criado.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <Card key={f.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{f.nome}</span>
                    <Badge variant={f.is_active ? "default" : "secondary"}>
                      {f.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">v{f.current_version}</Badge>
                    {f.escopo_area && (
                      <Badge variant="outline" className="text-xs">{f.escopo_area}</Badge>
                    )}
                  </div>
                  {f.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{f.descricao}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => copiarLink(f)}>
                    <Link2 className="h-4 w-4 mr-1" /> Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAtivo(f)}>
                    {f.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                    <Edit3 className="h-4 w-4 mr-1" /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editar formulário (v${editing.current_version} → v${editing.current_version + 1})` : "Novo formulário"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna esquerda: meta + campos */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div>
                  <Label>Área</Label>
                  <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex: TI, Compras" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Campos ({fields.length})</Label>
                  <Button size="sm" variant="outline" onClick={addField}>
                    <Plus className="h-4 w-4 mr-1" /> Campo
                  </Button>
                </div>

                {fields.map((f, idx) => (
                  <Card key={idx} className="border-l-4 border-l-primary">
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeField(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Rótulo</Label>
                          <Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Chave</Label>
                          <Input
                            value={f.key}
                            onChange={(e) =>
                              updateField(idx, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={f.tipo} onValueChange={(v) => updateField(idx, { tipo: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_CAMPO.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                          <Checkbox
                            id={`req-${idx}`}
                            checked={f.obrigatorio}
                            onCheckedChange={(c) => updateField(idx, { obrigatorio: !!c })}
                          />
                          <Label htmlFor={`req-${idx}`} className="text-xs">Obrigatório</Label>
                        </div>
                      </div>
                      {f.tipo === "select" && (
                        <div>
                          <Label className="text-xs">Opções (separadas por vírgula)</Label>
                          <Input
                            value={(f.opcoes || []).join(", ")}
                            onChange={(e) =>
                              updateField(idx, {
                                opcoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="Opção 1, Opção 2, Opção 3"
                          />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Texto de ajuda</Label>
                        <Input
                          value={f.ajuda || ""}
                          onChange={(e) => updateField(idx, { ajuda: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Coluna direita: preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Pré-visualização
                </Label>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{nome || "Sem nome"}</CardTitle>
                  {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
                </CardHeader>
                <CardContent>
                  <DynamicFormRenderer
                    fields={fields}
                    onSubmit={() => { toast({ title: "Preview — sem envio" }); }}
                    submitLabel="Enviar (preview)"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar e publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormBuilder;
