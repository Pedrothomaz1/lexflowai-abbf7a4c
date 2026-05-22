import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Inbox, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  cnpj: string | null;
  usuarios_estimados: number | null;
  plano_interesse: string | null;
  mensagem: string | null;
  status: string;
  notas: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  convertido: "Convertido",
  descartado: "Descartado",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "convertido") return "default";
  if (s === "em_contato") return "secondary";
  if (s === "descartado") return "outline";
  return "secondary";
};

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ativos");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Erro ao carregar leads: " + error.message);
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = leads.filter((l) => {
    if (filter === "ativos") return l.status === "novo" || l.status === "em_contato";
    if (filter === "all") return true;
    return l.status === filter;
  });

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from("sales_leads")
      .update({ status })
      .eq("id", id)
      .select()
      .maybeSingle();
    setSavingId(null);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Status atualizado");
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const copyForOrgCreation = (lead: Lead) => {
    const text = [
      `Nome empresa: ${lead.empresa || lead.nome}`,
      `CNPJ: ${lead.cnpj || ""}`,
      `Dono (nome): ${lead.nome}`,
      `Dono (e-mail): ${lead.email}`,
      `Telefone: ${lead.telefone || ""}`,
      `Plano: ${lead.plano_interesse || "pro"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Dados copiados — cole no formulário de criar organização");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Leads de planos
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Contatos vindos da página pública <code className="text-xs">/planos</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos (novo + em contato)</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="em_contato">Em contato</SelectItem>
              <SelectItem value="convertido">Convertidos</SelectItem>
              <SelectItem value="descartado">Descartados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum lead nessa categoria.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{l.nome}</div>
                    <div className="text-xs text-muted-foreground">{l.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.empresa || "—"}</TableCell>
                  <TableCell>
                    {l.plano_interesse ? (
                      <Badge variant="outline" className="capitalize">{l.plano_interesse}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(l.status)}>{statusLabel[l.status] || l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={l.status}
                      onValueChange={(v) => updateStatus(l.id, v)}
                      disabled={savingId === l.id}
                    >
                      <SelectTrigger className="w-36 inline-flex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="em_contato">Em contato</SelectItem>
                        <SelectItem value="convertido">Convertido</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">E-mail:</span> <a href={`mailto:${selected.email}`} className="text-primary">{selected.email}</a></div>
                  <div><span className="text-muted-foreground">Telefone:</span> {selected.telefone || "—"}</div>
                  <div><span className="text-muted-foreground">Empresa:</span> {selected.empresa || "—"}</div>
                  <div><span className="text-muted-foreground">CNPJ:</span> {selected.cnpj || "—"}</div>
                  <div><span className="text-muted-foreground">Usuários:</span> {selected.usuarios_estimados ?? "—"}</div>
                  <div><span className="text-muted-foreground">Plano:</span> {selected.plano_interesse || "—"}</div>
                </div>
                {selected.mensagem && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
                    <div className="bg-muted/40 rounded p-3 whitespace-pre-wrap">{selected.mensagem}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => copyForOrgCreation(selected)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar dados
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${selected.email}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Responder
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Próximo passo: vá em <strong>Clientes → Nova organização</strong> e cole os dados acima. Depois, marque este lead como "Convertido".
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
