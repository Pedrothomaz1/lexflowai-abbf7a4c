import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planoInteresse?: string;
  planoLabel?: string;
}

export function LeadDialog({ open, onOpenChange, planoInteresse, planoLabel }: LeadDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    cnpj: "",
    usuarios_estimados: "",
    mensagem: "",
  });

  const reset = () => {
    setForm({ nome: "", email: "", telefone: "", empresa: "", cnpj: "", usuarios_estimados: "", mensagem: "" });
    setDone(false);
  };

  const handleClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  const submit = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("lead-novo-plano", {
      body: {
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        empresa: form.empresa.trim() || null,
        cnpj: form.cnpj.replace(/\D/g, "") || null,
        usuarios_estimados: form.usuarios_estimados ? Number(form.usuarios_estimados) : null,
        plano_interesse: planoInteresse || null,
        mensagem: form.mensagem.trim() || null,
      },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "Não foi possível enviar agora. Tente novamente.");
      return;
    }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Recebemos seu contato!</h3>
            <p className="text-sm text-muted-foreground">
              Entraremos em contato em até 1 dia útil. Verifique sua caixa de entrada.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">Fechar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Falar com o time LexFlow</DialogTitle>
              <DialogDescription>
                {planoLabel ? `Interesse no plano ${planoLabel}. ` : ""}
                Respondemos em até 1 dia útil.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="lead-nome">Nome*</Label>
                <Input id="lead-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">E-mail*</Label>
                <Input id="lead-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-tel">Telefone</Label>
                <Input id="lead-tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 90000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-empresa">Empresa</Label>
                <Input id="lead-empresa" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-cnpj">CNPJ</Label>
                <Input id="lead-cnpj" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="lead-usr">Usuários estimados</Label>
                <Input id="lead-usr" type="number" min={1} value={form.usuarios_estimados} onChange={(e) => setForm({ ...form, usuarios_estimados: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="lead-msg">Mensagem</Label>
                <Textarea id="lead-msg" rows={3} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Conte um pouco sobre seu cenário…" />
              </div>
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full mt-2">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar contato
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
