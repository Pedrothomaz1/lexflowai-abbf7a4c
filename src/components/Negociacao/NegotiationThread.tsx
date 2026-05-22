import { useState } from "react";
import { useNegociacoes, type NegotiationTipo, type NegotiationLado } from "@/hooks/useNegociacoes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Check, X, FileText, ArrowLeftRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_LABEL: Record<NegotiationTipo, string> = {
  proposta: "Proposta",
  contraproposta: "Contraproposta",
  comentario: "Comentário",
  aceite: "Aceite",
  rejeicao: "Rejeição",
};

const TIPO_VARIANT: Record<NegotiationTipo, "default" | "secondary" | "destructive" | "outline"> = {
  proposta: "default",
  contraproposta: "secondary",
  comentario: "outline",
  aceite: "default",
  rejeicao: "destructive",
};

interface Props {
  contratoId: string;
}

export function NegotiationThread({ contratoId }: Props) {
  const { data: items = [], isLoading, create, decide } = useNegociacoes(contratoId);
  const [tipo, setTipo] = useState<NegotiationTipo>("proposta");
  const [lado, setLado] = useState<NegotiationLado>("interno");
  const [conteudo, setConteudo] = useState("");

  const handleSubmit = async () => {
    if (!conteudo.trim()) return;
    await create.mutateAsync({
      contrato_id: contratoId,
      tipo,
      autor_lado: lado,
      conteudo: conteudo.trim(),
    });
    setConteudo("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Negociação auditável
        </CardTitle>
        <CardDescription>
          Registre propostas, contrapropostas, comentários e decisões. Toda interação fica versionada e auditada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as NegotiationTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="contraproposta">Contraproposta</SelectItem>
                <SelectItem value="comentario">Comentário</SelectItem>
                <SelectItem value="aceite">Aceite</SelectItem>
                <SelectItem value="rejeicao">Rejeição</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Lado</label>
            <Select value={lado} onValueChange={(v) => setLado(v as NegotiationLado)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="contraparte">Contraparte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={!conteudo.trim() || create.isPending}
              className="w-full"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Registrar
            </Button>
          </div>
        </div>
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Descreva a proposta, contraproposta ou comentário..."
          rows={3}
        />

        <Separator />

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando histórico...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum registro de negociação ainda.
          </div>
        ) : (
          <ol className="space-y-3">
            {items.map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={TIPO_VARIANT[n.tipo]}>{TIPO_LABEL[n.tipo]}</Badge>
                  <Badge variant="outline" className="capitalize">{n.autor_lado}</Badge>
                  <Badge variant={n.status === "aceito" ? "default" : n.status === "rejeitado" ? "destructive" : "secondary"}>
                    {n.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                {n.conteudo && (
                  <p className="text-sm whitespace-pre-wrap text-foreground">{n.conteudo}</p>
                )}
                {n.arquivo_url && (
                  <a
                    href={n.arquivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <FileText className="h-3 w-3" /> Anexo
                  </a>
                )}
                {n.status === "aberto" && n.tipo !== "aceite" && n.tipo !== "rejeicao" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide.mutate({ id: n.id, status: "aceito" })}
                      disabled={decide.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide.mutate({ id: n.id, status: "rejeitado" })}
                      disabled={decide.isPending}
                    >
                      <X className="h-3 w-3 mr-1" /> Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide.mutate({ id: n.id, status: "superado" })}
                      disabled={decide.isPending}
                    >
                      Marcar como superado
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
