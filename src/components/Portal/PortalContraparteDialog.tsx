import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Loader2 } from "lucide-react";
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
  const [escopo, setEscopo] = useState<"view" | "comment" | "sign">("comment");
  const [validade, setValidade] = useState(14);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-portal-contraparte", {
        body: { contratoId, contraparteEmail: email, contraparteNome: nome, escopo, validadeDias: validade },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro");
      setUrl(data.url);
      toast.success("Link gerado.");
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
    setUrl(null); setEmail(""); setNome(""); setEscopo("comment"); setValidade(14);
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
            <p className="text-sm text-muted-foreground">Envie este link à contraparte. Acesso expira em {validade} dias.</p>
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
          </div>
        )}
        <DialogFooter>
          {!url && (
            <Button onClick={handleSubmit} disabled={loading || !email}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
