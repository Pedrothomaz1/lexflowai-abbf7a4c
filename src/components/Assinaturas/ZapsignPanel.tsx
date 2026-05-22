import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  FileSignature, Send, BellRing, XCircle, ExternalLink, Plus, Trash2, Loader2, CheckCircle2, Clock, XOctagon,
} from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

interface Props { contratoId: string; arquivoUrl?: string | null }

interface SignerForm {
  nome: string;
  email: string;
  telefone?: string;
  lado: "empresa" | "contraparte" | "testemunha";
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
  enviado: { label: "Enviado", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300", icon: Send },
  parcialmente_assinado: { label: "Parcialmente assinado", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: Clock },
  concluido: { label: "Concluído", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  recusado: { label: "Recusado", color: "bg-destructive/15 text-destructive", icon: XOctagon },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground", icon: XCircle },
  expirado: { label: "Expirado", color: "bg-destructive/15 text-destructive", icon: XOctagon },
};

const SIGNER_STATUS_META: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  visualizado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  assinado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  recusado: "bg-destructive/15 text-destructive",
};

export function ZapsignPanel({ contratoId, arquivoUrl }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [expira, setExpira] = useState<number>(30);
  const [signers, setSigners] = useState<SignerForm[]>([
    { nome: "", email: "", telefone: "", lado: "contraparte" },
  ]);

  const envelopesQ = useQuery({
    queryKey: ["zap-envelopes", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_envelopes")
        .select("*, signature_signers(*), signature_events(id, tipo, descricao, created_at)")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const limpos = signers.filter((s) => s.nome.trim() && s.email.trim());
      if (limpos.length === 0) throw new Error("Adicione ao menos um signatário");
      const { data, error } = await supabase.functions.invoke("zapsign-criar-envelope", {
        body: {
          contrato_id: contratoId,
          assunto: assunto || undefined,
          mensagem: mensagem || undefined,
          expires_in_days: expira || undefined,
          signers: limpos,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha ao enviar");
      return data.envelope;
    },
    onSuccess: () => {
      toast({ title: "Envelope enviado", description: "Assinatura iniciada via ZapSign." });
      setOpen(false);
      setAssunto(""); setMensagem(""); setExpira(30);
      setSigners([{ nome: "", email: "", telefone: "", lado: "contraparte" }]);
      qc.invalidateQueries({ queryKey: ["zap-envelopes", contratoId] });
    },
    onError: (e: any) => {
      toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" });
    },
  });

  const cancelar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { data, error } = await supabase.functions.invoke("zapsign-cancelar-envelope", {
        body: { envelope_id: id, motivo },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
    },
    onSuccess: () => {
      toast({ title: "Envelope cancelado" });
      qc.invalidateQueries({ queryKey: ["zap-envelopes", contratoId] });
    },
    onError: (e: any) => toast({ title: "Falha ao cancelar", description: e.message, variant: "destructive" }),
  });

  const lembrar = useMutation({
    mutationFn: async ({ envelope_id, signer_id }: { envelope_id: string; signer_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("zapsign-lembrar-signatarios", {
        body: { envelope_id, signer_id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Lembrete enviado", description: `${data?.enviados ?? 0} envio(s)` });
      qc.invalidateQueries({ queryKey: ["zap-envelopes", contratoId] });
    },
    onError: (e: any) => toast({ title: "Falha ao lembrar", description: e.message, variant: "destructive" }),
  });

  const setSigner = (i: number, patch: Partial<SignerForm>) =>
    setSigners((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addSigner = () =>
    setSigners((s) => [...s, { nome: "", email: "", telefone: "", lado: "contraparte" }]);
  const removeSigner = (i: number) =>
    setSigners((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s));

  const envelopes = envelopesQ.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" /> Assinatura eletrônica · ZapSign
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Envie o contrato para assinatura e acompanhe o status em tempo real.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!arquivoUrl}>
                <Send className="h-4 w-4 mr-2" /> Novo envelope
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Enviar para assinatura</DialogTitle>
                <DialogDescription>
                  Os signatários receberão o link de assinatura por e-mail.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assunto</Label>
                    <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Contrato de prestação de serviços" />
                  </div>
                  <div>
                    <Label>Expira em (dias)</Label>
                    <Input type="number" min={1} max={365} value={expira} onChange={(e) => setExpira(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label>Mensagem (opcional)</Label>
                  <Textarea rows={2} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Signatários</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addSigner}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {signers.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">Nome</Label>
                        <Input value={s.nome} onChange={(e) => setSigner(i, { nome: e.target.value })} />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">E-mail</Label>
                        <Input type="email" value={s.email} onChange={(e) => setSigner(i, { email: e.target.value })} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Lado</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={s.lado}
                          onChange={(e) => setSigner(i, { lado: e.target.value as SignerForm["lado"] })}
                        >
                          <option value="empresa">Empresa</option>
                          <option value="contraparte">Contraparte</option>
                          <option value="testemunha">Testemunha</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeSigner(i)} disabled={signers.length === 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
                  {criar.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!arquivoUrl && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300 mb-4">
              Anexe um documento ao contrato antes de enviar para assinatura.
            </div>
          )}
          {envelopesQ.isLoading && (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
          {!envelopesQ.isLoading && envelopes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum envelope enviado ainda.</p>
          )}
          <div className="space-y-3">
            {envelopes.map((env: any) => {
              const meta = STATUS_META[env.status] || STATUS_META.rascunho;
              const Icon = meta.icon;
              const ativo = ["enviado", "parcialmente_assinado"].includes(env.status);
              return (
                <div key={env.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{env.assunto || "Envelope"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Enviado em {new Date(env.sent_at || env.created_at).toLocaleString("pt-BR")}
                        {env.expires_at && ` · expira em ${new Date(env.expires_at).toLocaleDateString("pt-BR")}`}
                      </div>
                    </div>
                    <Badge className={meta.color + " gap-1"}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {(env.signature_signers || []).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-sm gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{s.nome}</span>
                          <span className="text-muted-foreground truncate">· {s.email}</span>
                          <Badge variant="outline" className="text-[10px]">{s.lado}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={SIGNER_STATUS_META[s.status] || ""}>{s.status}</Badge>
                          {s.sign_url && (
                            <a href={s.sign_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                              <ExternalLink className="h-3 w-3" /> link
                            </a>
                          )}
                          {ativo && s.status === "pendente" && (
                            <Button size="sm" variant="ghost" onClick={() => lembrar.mutate({ envelope_id: env.id, signer_id: s.id })} disabled={lembrar.isPending}>
                              <BellRing className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                    {env.signed_file_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={env.signed_file_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Documento assinado
                        </a>
                      </Button>
                    )}
                    {ativo && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => lembrar.mutate({ envelope_id: env.id })} disabled={lembrar.isPending}>
                          <BellRing className="h-3.5 w-3.5 mr-1" /> Lembrar todos
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar envelope
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar envelope?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Os signatários não poderão mais assinar. Essa ação é irreversível.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelar.mutate({ id: env.id })}>
                                Confirmar cancelamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
