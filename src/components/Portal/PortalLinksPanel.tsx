import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Link2,
  Copy,
  XCircle,
  Eye,
  MessageSquare,
  ChevronDown,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { handleDbError } from "@/utils/dbErrorHandler";

interface Token {
  id: string;
  token: string;
  contraparte_email: string;
  contraparte_nome: string | null;
  escopo: string;
  expires_at: string;
  revoked_at: string | null;
  last_access_at: string | null;
  access_count: number;
  created_at: string;
}

interface Evento {
  id: string;
  acao: string;
  ip: string | null;
  created_at: string;
  metadata: any;
}

export function PortalLinksPanel({ contratoId }: { contratoId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Record<string, Evento[]>>({});
  const [loadingEventos, setLoadingEventos] = useState<Record<string, boolean>>({});
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("portal_externo_tokens")
      .select("*")
      .eq("contrato_id", contratoId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(handleDbError(error).message);
    } else {
      setTokens(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [contratoId]);

  async function loadEventos(tokenId: string) {
    if (eventos[tokenId]) return;
    setLoadingEventos((s) => ({ ...s, [tokenId]: true }));
    const { data } = await supabase
      .from("portal_externo_eventos")
      .select("id, acao, ip, created_at, metadata")
      .eq("token_id", tokenId)
      .order("created_at", { ascending: false })
      .limit(50);
    setEventos((s) => ({ ...s, [tokenId]: data || [] }));
    setLoadingEventos((s) => ({ ...s, [tokenId]: false }));
  }

  async function revogar(id: string) {
    setRevoking(id);
    const { error } = await supabase
      .from("portal_externo_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    setRevoking(null);
    if (error) {
      toast.error(handleDbError(error).message);
      return;
    }
    toast.success("Link revogado.");
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  function escopoLabel(escopo: string) {
    return escopo === "view" ? "Visualizar" : escopo === "comment" ? "Comentar" : "Assinar";
  }

  function acaoLabel(acao: string) {
    return acao === "view" ? "Acesso" : acao === "comment" ? "Comentário" : acao;
  }

  function acaoIcon(acao: string) {
    return acao === "comment" ? (
      <MessageSquare className="h-3 w-3" />
    ) : (
      <Eye className="h-3 w-3" />
    );
  }

  function status(t: Token) {
    if (t.revoked_at) return { label: "Revogado", variant: "outline" as const };
    if (new Date(t.expires_at) < new Date())
      return { label: "Expirado", variant: "outline" as const };
    return { label: "Ativo", variant: "default" as const };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando links...
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum link de portal gerado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Links do portal ({tokens.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tokens.map((t) => {
          const st = status(t);
          const isAtivo = st.label === "Ativo";
          return (
            <Collapsible
              key={t.id}
              onOpenChange={(open) => open && loadEventos(t.id)}
              className="rounded-lg border bg-card"
            >
              <div className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {t.contraparte_nome || t.contraparte_email}
                    </p>
                    <Badge variant={st.variant} className="text-xs">
                      {st.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {escopoLabel(t.escopo)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {t.contraparte_email}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expira{" "}
                      {format(new Date(t.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span>{t.access_count} acesso(s)</span>
                    {t.last_access_at && (
                      <span>
                        Último:{" "}
                        {format(new Date(t.last_access_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAtivo && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyLink(t.token)}
                        title="Copiar link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => revogar(t.id)}
                        disabled={revoking === t.id}
                        title="Revogar link"
                      >
                        {revoking === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <div className="border-t px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
                  {loadingEventos[t.id] ? (
                    <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando log...
                    </div>
                  ) : (eventos[t.id]?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhum evento.</p>
                  ) : (
                    eventos[t.id].map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-2 text-xs py-1"
                      >
                        {acaoIcon(e.acao)}
                        <span className="font-medium">{acaoLabel(e.acao)}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(e.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        {e.ip && (
                          <span className="text-muted-foreground ml-auto font-mono">
                            {e.ip.split(",")[0]}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
