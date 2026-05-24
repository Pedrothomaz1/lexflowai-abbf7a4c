import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, RefreshCw, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Row {
  id: string;
  nome: string;
  plano: string;
  status: string;
  trial_ends_at: string | null;
  proximo_vencimento: string | null;
  ultimo_pagamento_em: string | null;
  ciclo_cobranca: string;
  valor_mensal_centavos: number | null;
  notas_cobranca: string | null;
}

function fmtBRL(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);
}

function statusVencimento(date: string | null) {
  if (!date) return null;
  const dias = differenceInDays(parseISO(date), new Date());
  if (dias < -5) return { label: `Atraso ${-dias}d`, variant: "destructive" as const };
  if (dias < 0) return { label: `Vencido ${-dias}d`, variant: "destructive" as const };
  if (dias === 0) return { label: "Vence hoje", variant: "destructive" as const };
  if (dias <= 7) return { label: `Em ${dias}d`, variant: "secondary" as const };
  return { label: `Em ${dias}d`, variant: "outline" as const };
}

export default function CobrancaTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Partial<Row> & { valor_mensal_reais?: string }>({});
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("id, nome, plano, status, trial_ends_at, proximo_vencimento, ultimo_pagamento_em, ciclo_cobranca, valor_mensal_centavos, notas_cobranca")
      .order("proximo_vencimento", { ascending: true, nullsFirst: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      trial_ends_at: r.trial_ends_at,
      proximo_vencimento: r.proximo_vencimento,
      ultimo_pagamento_em: r.ultimo_pagamento_em,
      ciclo_cobranca: r.ciclo_cobranca,
      valor_mensal_reais: r.valor_mensal_centavos != null ? (r.valor_mensal_centavos / 100).toFixed(2) : "",
      notas_cobranca: r.notas_cobranca || "",
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const centavos = form.valor_mensal_reais && form.valor_mensal_reais.trim()
      ? Math.round(parseFloat(form.valor_mensal_reais.replace(",", ".")) * 100)
      : null;

    const { data, error } = await supabase.rpc("super_admin_update_billing", {
      _org_id: editing.id,
      _trial_ends_at: form.trial_ends_at || null,
      _proximo_vencimento: form.proximo_vencimento || null,
      _ultimo_pagamento_em: form.ultimo_pagamento_em || null,
      _ciclo_cobranca: form.ciclo_cobranca || null,
      _valor_mensal_centavos: centavos,
      _notas_cobranca: form.notas_cobranca || null,
    });
    setSaving(false);
    if (error || !(data as any)?.success) {
      return toast.error("Falha: " + (error?.message || (data as any)?.error));
    }
    toast.success("Cobrança atualizada");
    setEditing(null);
    load();
  };

  const runCron = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("cron-billing-alerts", { body: {} });
    setRunning(false);
    if (error) return toast.error("Falha: " + error.message);
    const d = data as any;
    toast.success(`Verificação: ${d?.candidates || 0} candidatos · ${d?.sent || 0} enviados · ${d?.skipped || 0} já enviados`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cobrança & MRR
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runCron} disabled={running}>
            <Play className={`h-4 w-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            Rodar alertas agora
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor/mês</TableHead>
                <TableHead>Trial até</TableHead>
                <TableHead>Próx. vencimento</TableHead>
                <TableHead>Último pgto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma organização</TableCell></TableRow>}
              {!loading && rows.map((r) => {
                const venc = statusVencimento(r.proximo_vencimento);
                const trial = statusVencimento(r.trial_ends_at);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell><Badge variant="outline">{r.plano}</Badge></TableCell>
                    <TableCell className="text-sm">{fmtBRL(r.valor_mensal_centavos)}</TableCell>
                    <TableCell className="text-sm">
                      {r.trial_ends_at ? (
                        <div className="flex flex-col gap-1">
                          <span>{format(parseISO(r.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {trial && <Badge variant={trial.variant} className="w-fit text-xs">{trial.label}</Badge>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.proximo_vencimento ? (
                        <div className="flex flex-col gap-1">
                          <span>{format(parseISO(r.proximo_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {venc && <Badge variant={venc.variant} className="w-fit text-xs">{venc.label}</Badge>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.ultimo_pagamento_em ? format(parseISO(r.ultimo_pagamento_em), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cobrança — {editing?.nome}</DialogTitle>
            <DialogDescription>Datas alimentam o cron diário de alertas.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Trial expira em</Label>
              <Input type="date" value={form.trial_ends_at || ""} onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <Select value={form.ciclo_cobranca || "mensal"} onValueChange={(v) => setForm({ ...form, ciclo_cobranca: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Próximo vencimento</Label>
              <Input type="date" value={form.proximo_vencimento || ""} onChange={(e) => setForm({ ...form, proximo_vencimento: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Último pagamento</Label>
              <Input type="date" value={form.ultimo_pagamento_em || ""} onChange={(e) => setForm({ ...form, ultimo_pagamento_em: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Valor mensal (R$, opcional — sobrescreve plano)</Label>
              <Input
                inputMode="decimal"
                placeholder="497.00"
                value={form.valor_mensal_reais || ""}
                onChange={(e) => setForm({ ...form, valor_mensal_reais: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Notas internas</Label>
              <Textarea
                rows={2}
                value={form.notas_cobranca || ""}
                onChange={(e) => setForm({ ...form, notas_cobranca: e.target.value })}
                placeholder="Ex: Pagamento via PIX, NF mensal enviada dia 5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
