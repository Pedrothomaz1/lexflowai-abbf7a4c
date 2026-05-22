import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  contratoId: string;
  trigger?: React.ReactNode;
}

export function PortalContraparteDialog({ contratoId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [escopo, setEscopo] = useState<"view" | "comment" | "sign">("comment");
  const [validade, setValidade] = useState(14);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; error?: string } | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-portal-contraparte", {
        body: { contratoId, contraparteEmail: email, contraparteNome: nome, escopo, validadeDias: validade, enviarEmail, mensagem: mensagem || undefined },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro");
      setUrl(data.url);
      setEmailStatus(data.email ?? null);
      if (enviarEmail) {
        if (data.email?.sent) toast.success("Link gerado e e-mail enviado.");
        else toast.warning(`Link gerado, mas e-mail falhou: ${data.email?.error || "desconhecido"}`);
      } else {
        toast.success("Link gerado.");
      }
    } catch (e: any) {
      toast.error(e.message || "Falha");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  function reset() {
    setUrl(null); setEmail(""); setNome(""); setMensagem(""); setEscopo("comment"); setValidade(14); setEnviarEmail(true); setEmailStatus(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline"><Share2 className="h-4 w-4" /> Compartilhar com contraparte</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portal externo — contraparte</DialogTitle>
        </DialogHeader>
        {url ? (
          <div className="space-y-3">
            {emailStatus && (
              <div className={`flex items-start gap-2 text-sm rounded-md p-3 ${emailStatus.sent ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {emailStatus.sent ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
                <span>{emailStatus.sent ? `E-mail enviado para ${email}.` : `Falha no envio: ${emailStatus.error}`}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Link de acesso (expira em {validade} dias):</p>
            <div className="flex gap-2">
              <Input value={url} readOnly />
              <Button onClick={copyLink}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Nome da contraparte</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div>
              <Label>E-mail*</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contraparte@empresa.com" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Escopo</Label>
                <Select value={escopo} onValueChange={(v: any) => setEscopo(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Apenas visualizar</SelectItem>
                    <SelectItem value="comment">Visualizar e comentar</SelectItem>
                    <SelectItem value="sign">Visualizar, comentar e assinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" min={1} max={90} value={validade} onChange={(e) => setValidade(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Mensagem (opcional)</Label>
              <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem que será incluída no e-mail à contraparte." rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={enviarEmail} onCheckedChange={(c) => setEnviarEmail(!!c)} />
              Enviar e-mail automaticamente para a contraparte
            </label>
          </div>
        )}
        <DialogFooter>
          {!url && (
            <Button onClick={handleSubmit} disabled={loading || !email}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {enviarEmail ? "Gerar e enviar" : "Gerar link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
