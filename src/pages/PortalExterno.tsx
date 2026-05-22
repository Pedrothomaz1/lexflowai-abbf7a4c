import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scale, Loader2, AlertCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalExterno() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [comentario, setComentario] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { data: resp, error: e } = await supabase.functions.invoke("portal-externo-publico", {
        body: { action: "view", token },
      });
      if (e) throw e;
      if (!resp?.ok) throw new Error(resp?.error || "Acesso negado");
      setData(resp);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(); }, [token]);

  async function postComment() {
    if (!comentario.trim()) return;
    setPosting(true);
    try {
      const { data: resp, error: e } = await supabase.functions.invoke("portal-externo-publico", {
        body: { action: "comment", token, comentario },
      });
      if (e) throw e;
      if (!resp?.ok) throw new Error(resp?.error || "Falha");
      toast.success("Comentário enviado.");
      setComentario("");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Falha");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> Acesso indisponível</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const c = data?.contrato;
  const canComment = ["comment", "sign"].includes(data?.contraparte?.escopo);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-semibold">LexFlow — Portal da Contraparte</span>
          </div>
          <Badge variant="outline">Acesso válido até {format(new Date(data.expires_at), "dd/MM/yyyy", { locale: ptBR })}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{c.titulo}</CardTitle>
            <CardDescription>Contrato {c.numero_contrato} · {c.tipo}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-muted-foreground">Status</p><p className="font-medium">{c.status}</p></div>
            <div><p className="text-muted-foreground">Início</p><p className="font-medium">{c.data_inicio || "-"}</p></div>
            <div><p className="text-muted-foreground">Fim</p><p className="font-medium">{c.data_fim || "-"}</p></div>
            <div><p className="text-muted-foreground">Valor</p><p className="font-medium">{c.valor_total ? `${c.moeda || "BRL"} ${Number(c.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</p></div>
            {c.descricao && <div className="col-span-2 md:col-span-4"><p className="text-muted-foreground">Descrição</p><p>{c.descricao}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de negociação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.negociacoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma interação ainda.</p>}
            {data.negociacoes.map((n: any) => (
              <div key={n.id} className={`border rounded-lg p-3 ${n.autor_lado === "contraparte" ? "bg-muted/50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={n.autor_lado === "contraparte" ? "secondary" : "default"}>{n.autor_lado}</Badge>
                    <span className="text-muted-foreground">{n.tipo}</span>
                    {n.metadata?.autor_nome && <span className="font-medium">{n.metadata.autor_nome}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "dd/MM/yy HH:mm")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.conteudo}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {canComment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar comentário</CardTitle>
              <CardDescription>Identificado como {data.contraparte.nome || data.contraparte.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Escreva seu comentário ou contraproposta..." />
              <Button onClick={postComment} disabled={posting || !comentario.trim()}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
