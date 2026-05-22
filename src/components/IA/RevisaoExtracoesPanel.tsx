import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Check, X, Edit3, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

type Extracao = {
  id: string;
  campo: string;
  valor_extraido: string | null;
  valor_aceito: string | null;
  confianca: number | null;
  status: string;
  trecho_origem: string | null;
  modelo: string | null;
};

type Risco = {
  id: string;
  clausula: string | null;
  tipo_risco: string | null;
  severidade: string;
  descricao: string | null;
  recomendacao: string | null;
  confianca: number | null;
  status: string;
  trecho_origem: string | null;
};

interface Props {
  contratoId: string;
}

const sevColor: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive border-destructive/30",
  media: "bg-warning/10 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

const statusColor: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  aceito: "bg-success/10 text-success",
  editado: "bg-primary/10 text-primary",
  descartado: "bg-destructive/10 text-destructive",
};

export const RevisaoExtracoesPanel = ({ contratoId }: Props) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [extracoes, setExtracoes] = useState<Extracao[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [loading, setLoading] = useState(true);
  const [analisando, setAnalisando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [ext, risk] = await Promise.all([
      supabase
        .from("ai_extractions")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_risk_reviews")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false }),
    ]);
    if (ext.error) handleDbError(ext.error, toast);
    if (risk.error) handleDbError(risk.error, toast);
    setExtracoes((ext.data as Extracao[]) || []);
    setRiscos((risk.data as Risco[]) || []);
    setLoading(false);
  }, [contratoId, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const rodarAnalise = async () => {
    setAnalisando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ia-extrair-campos", {
        body: { contrato_id: contratoId },
      });
      if (error) throw error;
      toast({
        title: "Análise concluída",
        description: `${data?.extracoes_inseridas ?? 0} campos e ${data?.riscos_inseridos ?? 0} riscos identificados.`,
      });
      await carregar();
    } catch (e: any) {
      toast({
        title: "Erro na análise",
        description: e?.message || "Falha ao executar análise estruturada.",
        variant: "destructive",
      });
    } finally {
      setAnalisando(false);
    }
  };

  const atualizarExtracao = async (id: string, patch: Partial<Extracao>) => {
    const { data, error } = await supabase
      .from("ai_extractions")
      .update({
        ...patch,
        revisado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error || !data) {
      handleDbError(error, toast);
      return;
    }
    setExtracoes((prev) => prev.map((e) => (e.id === id ? { ...e, ...(data as Extracao) } : e)));
  };

  const atualizarRisco = async (id: string, patch: Partial<Risco>) => {
    const { data, error } = await supabase
      .from("ai_risk_reviews")
      .update({
        ...patch,
        revisado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error || !data) {
      handleDbError(error, toast);
      return;
    }
    setRiscos((prev) => prev.map((r) => (r.id === id ? { ...r, ...(data as Risco) } : r)));
  };

  const aceitarExtracao = (e: Extracao) =>
    atualizarExtracao(e.id, { status: "aceito", valor_aceito: e.valor_aceito ?? e.valor_extraido });

  const descartarExtracao = (e: Extracao) =>
    atualizarExtracao(e.id, { status: "descartado" });

  const salvarEdicao = async (e: Extracao) => {
    await atualizarExtracao(e.id, { status: "editado", valor_aceito: valorEdicao });
    setEditandoId(null);
    setValorEdicao("");
  };

  const pendentes = extracoes.filter((e) => e.status === "pendente").length;
  const riscosPendentes = riscos.filter((r) => r.status === "pendente").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Revisão da IA
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Aceite, edite ou descarte os campos e riscos extraídos automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button onClick={rodarAnalise} disabled={analisando}>
                {analisando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Rodar análise
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Campos: </span>
              <span className="font-semibold">{extracoes.length}</span>
              {pendentes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendentes} pendentes
                </Badge>
              )}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div>
              <span className="text-muted-foreground">Riscos: </span>
              <span className="font-semibold">{riscos.length}</span>
              {riscosPendentes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {riscosPendentes} pendentes
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extrações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos extraídos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : extracoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma extração ainda. Clique em "Rodar análise" para começar.
            </p>
          ) : (
            extracoes.map((e) => (
              <div key={e.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{e.campo}</span>
                      <Badge className={statusColor[e.status] || ""} variant="secondary">
                        {e.status}
                      </Badge>
                      {typeof e.confianca === "number" && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(e.confianca * 100)}% conf.
                        </Badge>
                      )}
                    </div>
                    {editandoId === e.id ? (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={valorEdicao}
                          onChange={(ev) => setValorEdicao(ev.target.value)}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => salvarEdicao(e)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Valor: </span>
                        <span className="font-mono">
                          {e.valor_aceito ?? e.valor_extraido ?? "—"}
                        </span>
                      </p>
                    )}
                    {e.trecho_origem && (
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        "{e.trecho_origem}"
                      </p>
                    )}
                  </div>
                  {editandoId !== e.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => aceitarExtracao(e)}
                        disabled={e.status === "aceito"}
                        title="Aceitar"
                      >
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditandoId(e.id);
                          setValorEdicao(e.valor_aceito ?? e.valor_extraido ?? "");
                        }}
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => descartarExtracao(e)}
                        disabled={e.status === "descartado"}
                        title="Descartar"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Riscos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Riscos identificados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : riscos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum risco identificado.</p>
          ) : (
            riscos.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={sevColor[r.severidade] || sevColor.baixa} variant="outline">
                        {r.severidade}
                      </Badge>
                      {r.tipo_risco && (
                        <Badge variant="secondary" className="text-xs">
                          {r.tipo_risco}
                        </Badge>
                      )}
                      <Badge className={statusColor[r.status] || ""} variant="secondary">
                        {r.status}
                      </Badge>
                      {typeof r.confianca === "number" && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(r.confianca * 100)}%
                        </Badge>
                      )}
                    </div>
                    {r.clausula && (
                      <p className="text-sm font-medium mt-1">{r.clausula}</p>
                    )}
                    {r.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{r.descricao}</p>
                    )}
                    {r.recomendacao && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Recomendação: </span>
                        {r.recomendacao}
                      </p>
                    )}
                    {r.trecho_origem && (
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        "{r.trecho_origem}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => atualizarRisco(r.id, { status: "aceito" })}
                      disabled={r.status === "aceito"}
                      title="Aceitar"
                    >
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => atualizarRisco(r.id, { status: "descartado" })}
                      disabled={r.status === "descartado"}
                      title="Descartar"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevisaoExtracoesPanel;
