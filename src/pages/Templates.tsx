import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Sparkles,
  History,
  Copy,
  Save,
} from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

type Template = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  categoria: string | null;
  current_version: number;
  is_active: boolean;
  created_at: string;
};

type Version = {
  id: string;
  template_id: string;
  versao: number;
  conteudo: string;
  variaveis: any;
  is_published: boolean;
  changelog: string | null;
  created_at: string;
};

const TIPOS = [
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "fornecimento", label: "Fornecimento" },
  { value: "locacao", label: "Locação" },
  { value: "confidencialidade", label: "Confidencialidade (NDA)" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

const extrairVariaveis = (conteudo: string): string[] => {
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const set = new Set<string>();
  let m;
  while ((m = regex.exec(conteudo)) !== null) set.add(m[1]);
  return Array.from(set);
};

const Templates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("prestacao_servicos");
  const [conteudo, setConteudo] = useState("");
  const [changelog, setChangelog] = useState("");
  const [saving, setSaving] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);

  const [genOpen, setGenOpen] = useState(false);
  const [genTemplate, setGenTemplate] = useState<Template | null>(null);
  const [genVersion, setGenVersion] = useState<Version | null>(null);
  const [genValores, setGenValores] = useState<Record<string, string>>({});
  const [genResultado, setGenResultado] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) handleDbError(error);
    setTemplates((data as Template[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const variaveis = useMemo(() => extrairVariaveis(conteudo), [conteudo]);

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setTipo("prestacao_servicos");
    setConteudo("");
    setChangelog("");
    setEditorOpen(true);
  };

  const openEdit = async (t: Template) => {
    setEditing(t);
    setNome(t.nome);
    setDescricao(t.descricao || "");
    setTipo(t.tipo || "outro");
    setChangelog("");
    // carrega conteúdo da versão atual
    const { data, error } = await supabase
      .from("template_versions")
      .select("conteudo")
      .eq("template_id", t.id)
      .eq("versao", t.current_version)
      .maybeSingle();
    if (error) handleDbError(error);
    setConteudo(data?.conteudo || "");
    setEditorOpen(true);
  };

  const salvar = async () => {
    if (!nome.trim() || !conteudo.trim()) {
      toast({ title: "Nome e conteúdo são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      const { data: orgRes } = await supabase.rpc("current_user_org" as any);
      const orgId = orgRes as string;
      if (!orgId) throw new Error("Organização não encontrada");

      const vars = extrairVariaveis(conteudo);
      let templateId = editing?.id;
      let novaVersao = editing ? editing.current_version + 1 : 1;

      if (editing) {
        const { data, error } = await supabase
          .from("document_templates")
          .update({
            nome,
            descricao: descricao || null,
            tipo: tipo as any,
            current_version: novaVersao,
          })
          .eq("id", editing.id)
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao atualizar");
      } else {
        const { data, error } = await supabase
          .from("document_templates")
          .insert({
            nome,
            descricao: descricao || null,
            tipo: tipo as any,
            organization_id: orgId,
            created_by: user.id,
            current_version: 1,
          })
          .select()
          .maybeSingle();
        if (error || !data) throw error || new Error("Falha ao criar");
        templateId = data.id;
        novaVersao = 1;
      }

      const { error: vErr } = await supabase.from("template_versions").insert({
        template_id: templateId!,
        organization_id: orgId,
        created_by: user.id,
        versao: novaVersao,
        conteudo,
        variaveis: vars as any,
        is_published: true,
        changelog: changelog || (editing ? "Atualização" : "Versão inicial"),
      });
      if (vErr) throw vErr;

      toast({ title: "Template salvo", description: `Versão ${novaVersao} publicada.` });
      setEditorOpen(false);
      await carregar();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (t: Template) => {
    if (!confirm(`Excluir "${t.nome}"? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from("document_templates").delete().eq("id", t.id);
    if (error) {
      handleDbError(error);
      return;
    }
    toast({ title: "Template excluído" });
    await carregar();
  };

  const toggleAtivo = async (t: Template) => {
    const { data, error } = await supabase
      .from("document_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      handleDbError(error);
      return;
    }
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? (data as Template) : x)));
  };

  const abrirHistorico = async (t: Template) => {
    const { data, error } = await supabase
      .from("template_versions")
      .select("*")
      .eq("template_id", t.id)
      .order("versao", { ascending: false });
    if (error) handleDbError(error);
    setVersions((data as Version[]) || []);
    setHistoryOpen(true);
  };

  const abrirGerar = async (t: Template) => {
    const { data, error } = await supabase
      .from("template_versions")
      .select("*")
      .eq("template_id", t.id)
      .eq("versao", t.current_version)
      .maybeSingle();
    if (error || !data) {
      handleDbError(error);
      return;
    }
    const v = data as Version;
    setGenTemplate(t);
    setGenVersion(v);
    const vars = Array.isArray(v.variaveis) ? v.variaveis : extrairVariaveis(v.conteudo);
    const inicial: Record<string, string> = {};
    vars.forEach((k: string) => (inicial[k] = ""));
    setGenValores(inicial);
    setGenResultado("");
    setGenOpen(true);
  };

  const gerarDocumento = async () => {
    if (!genVersion) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-documento", {
        body: {
          template_version_id: genVersion.id,
          valores: genValores,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenResultado(data.conteudo_gerado || "");
      const faltando = data.variaveis_faltando as string[] | undefined;
      if (faltando && faltando.length > 0) {
        toast({
          title: "Variáveis não preenchidas",
          description: faltando.join(", "),
        });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copiarResultado = () => {
    navigator.clipboard.writeText(genResultado);
    toast({ title: "Copiado para a área de transferência" });
  };

  const getTipoLabel = (t: string | null) =>
    TIPOS.find((x) => x.value === t)?.label || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando templates...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Templates de Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Modelos versionados com variáveis dinâmicas para geração rápida de documentos.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum template encontrado. Crie seu primeiro template!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <FileText className="h-7 w-7 text-primary" />
                  <div className="flex gap-1 flex-wrap justify-end">
                    <Badge variant={t.is_active ? "default" : "secondary"}>
                      {t.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">v{t.current_version}</Badge>
                  </div>
                </div>
                <CardTitle className="mt-3">{t.nome}</CardTitle>
                <CardDescription>
                  {getTipoLabel(t.tipo)}
                  {t.descricao && ` — ${t.descricao}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex flex-wrap gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => abrirGerar(t)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Gerar
                </Button>
                <Button variant="outline" size="sm" onClick={() => abrirHistorico(t)} title="Histórico">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleAtivo(t)}>
                  {t.is_active ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => excluir(t)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Editar Template (v${editing.current_version} → v${editing.current_version + 1})`
                : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{nome_variavel}}`}</code>{" "}
              para criar campos dinâmicos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={12}
                placeholder="Ex: Contrato firmado entre {{contratante}} e {{contratado}}..."
                className="font-mono text-sm"
              />
            </div>
            {variaveis.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">
                  Variáveis detectadas ({variaveis.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {variaveis.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs font-mono">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {editing && (
              <div>
                <Label>Changelog (opcional)</Label>
                <Input
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="O que mudou nesta versão?"
                />
              </div>
            )}
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

      {/* Histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de versões</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma versão.</p>
            ) : (
              versions.map((v) => (
                <Card key={v.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{v.versao}</Badge>
                        {v.is_published && <Badge>Publicada</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {v.changelog && (
                      <p className="text-sm text-muted-foreground">{v.changelog}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gerar documento */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar documento — {genTemplate?.nome}
            </DialogTitle>
            <DialogDescription>
              Preencha as variáveis para gerar o documento final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {Object.keys(genValores).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este template não tem variáveis dinâmicas.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(genValores).map((k) => (
                  <div key={k}>
                    <Label className="font-mono text-xs">{`{{${k}}}`}</Label>
                    <Input
                      value={genValores[k]}
                      onChange={(e) =>
                        setGenValores((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {genResultado && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Documento gerado</Label>
                  <Button variant="outline" size="sm" onClick={copiarResultado}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                  </Button>
                </div>
                <Textarea
                  value={genResultado}
                  readOnly
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Fechar</Button>
            <Button onClick={gerarDocumento} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
