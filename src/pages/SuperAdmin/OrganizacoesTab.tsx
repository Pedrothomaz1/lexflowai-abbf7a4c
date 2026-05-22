import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Ban, RefreshCw, Search, Building2, Plus, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CnpjAutoFillInput } from "@/components/ui/cnpj-autofill-input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrgRow {
  id: string;
  nome: string;
  cnpj: string | null;
  status: string;
  created_at: string;
  aprovada_em: string | null;
  motivo_suspensao: string | null;
  criador_email: string | null;
  total_membros: number;
}

const statusLabel: Record<string, string> = {
  pendente_aprovacao: "Aguardando aprovação",
  ativa: "Ativa",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "ativa") return "default";
  if (s === "pendente_aprovacao") return "secondary";
  if (s === "suspensa") return "destructive";
  return "outline";
};

export default function OrganizacoesTab() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suspendOrg, setSuspendOrg] = useState<OrgRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newOrg, setNewOrg] = useState({
    nome: "", cnpj: "", owner_email: "", owner_nome: "", plano: "pro",
    telefone: "", cidade: "", estado: "",
  });
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [createdEmailSent, setCreatedEmailSent] = useState(false);

  const resetCreate = () => {
    setNewOrg({ nome: "", cnpj: "", owner_email: "", owner_nome: "", plano: "pro", telefone: "", cidade: "", estado: "" });
    setCreatedInviteUrl(null);
    setCreatedEmailSent(false);
  };

  const createClientOrg = async () => {
    if (!newOrg.nome.trim()) return toast.error("Informe o nome da empresa");
    if (!newOrg.owner_email.trim()) return toast.error("Informe o e-mail do dono");
    setCreateLoading(true);
    const { data, error } = await supabase.functions.invoke("super-admin-create-client-org", {
      body: newOrg,
    });
    setCreateLoading(false);
    if (error || !(data as any)?.ok) {
      return toast.error("Falha: " + (error?.message || (data as any)?.error || "erro desconhecido"));
    }
    const d = data as any;
    setCreatedInviteUrl(d.invite_url);
    setCreatedEmailSent(!!d.email_sent);
    if (d.email_sent) {
      toast.success("Organização criada e e-mail enviado ao dono");
    } else {
      toast.warning("Organização criada. E-mail não enviado — copie o link abaixo");
    }
    load();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("super_admin_organizations_view" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar organizações");
      console.error(error);
    } else {
      setOrgs((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = orgs.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.nome?.toLowerCase().includes(s) ||
      o.cnpj?.toLowerCase().includes(s) ||
      o.criador_email?.toLowerCase().includes(s)
    );
  });

  const approve = async (org: OrgRow) => {
    setActionLoading(true);
    const { data, error } = await supabase.rpc("approve_organization", { _org_id: org.id });
    setActionLoading(false);
    if (error || !(data as any)?.success) {
      toast.error("Falha ao aprovar: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success(`${org.nome} aprovada`);
    load();
  };

  const suspend = async () => {
    if (!suspendOrg) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc("suspend_organization", {
      _org_id: suspendOrg.id,
      _motivo: suspendReason || null,
    });
    setActionLoading(false);
    if (error || !(data as any)?.success) {
      toast.error("Falha ao suspender: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success(`${suspendOrg.nome} suspensa`);
    setSuspendOrg(null);
    setSuspendReason("");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Button size="sm" onClick={() => { resetCreate(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova organização cliente
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente_aprovacao">Aguardando aprovação</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="suspensa">Suspensas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criador</TableHead>
                <TableHead className="text-center">Membros</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma organização encontrada
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{org.cnpj || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(org.status)}>{statusLabel[org.status] || org.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{org.criador_email || "—"}</TableCell>
                    <TableCell className="text-center">{org.total_membros}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      {org.status !== "ativa" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approve(org)}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {org.status !== "suspensa" && org.status !== "cancelada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuspendOrg(org)}
                          disabled={actionLoading}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Suspender
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!suspendOrg} onOpenChange={(o) => !o && setSuspendOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender {suspendOrg?.nome}</DialogTitle>
            <DialogDescription>
              Os usuários desta organização perderão acesso imediato. Os dados são preservados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opcional, visível ao cliente)</label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Ex: Inadimplência. Entre em contato para reativar."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOrg(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={suspend} disabled={actionLoading}>
              Suspender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreate(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova organização cliente</DialogTitle>
            <DialogDescription>
              Cria a empresa já ativa e envia e-mail ao dono com link para definir senha e acessar.
            </DialogDescription>
          </DialogHeader>

          {!createdInviteUrl ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome da empresa *</Label>
                  <Input value={newOrg.nome} onChange={(e) => setNewOrg({ ...newOrg, nome: e.target.value })} placeholder="Ex: Acme S.A." />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <CnpjAutoFillInput
                    value={newOrg.cnpj}
                    onChange={(v) => setNewOrg((p) => ({ ...p, cnpj: v }))}
                    onDataFetched={(data) => {
                      setNewOrg((p) => ({
                        ...p,
                        nome: p.nome || data.nome || p.nome,
                        cidade: p.cidade || data.cidade || p.cidade,
                        estado: p.estado || data.uf || p.estado,
                        telefone: p.telefone || data.telefone || p.telefone,
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Plano</Label>
                  <Select value={newOrg.plano} onValueChange={(v) => setNewOrg({ ...newOrg, plano: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome do dono</Label>
                  <Input value={newOrg.owner_nome} onChange={(e) => setNewOrg({ ...newOrg, owner_nome: e.target.value })} placeholder="João Silva" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail do dono *</Label>
                  <Input type="email" value={newOrg.owner_email} onChange={(e) => setNewOrg({ ...newOrg, owner_email: e.target.value })} placeholder="joao@acme.com" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O dono receberá um e-mail com link para definir senha (válido por 14 dias). Ele entra como administrador da empresa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <p className="text-sm font-medium">
                  {createdEmailSent ? "✓ E-mail enviado para " + newOrg.owner_email : "⚠ E-mail não enviado — compartilhe o link manualmente:"}
                </p>
                <div className="flex gap-2">
                  <Input value={createdInviteUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(createdInviteUrl); toast.success("Link copiado"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!createdInviteUrl ? (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancelar</Button>
                <Button onClick={createClientOrg} disabled={createLoading}>
                  {createLoading ? "Criando..." : "Criar e enviar e-mail"}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setCreateOpen(false); resetCreate(); }}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
