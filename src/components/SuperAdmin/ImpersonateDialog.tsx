import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string | null;
  orgNome: string | null;
}

export function ImpersonateDialog({ open, onOpenChange, orgId, orgNome }: Props) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);

  const reset = () => { setMotivo(""); setLink(null); setTargetEmail(null); };

  const handle = async () => {
    if (!orgId) return;
    if (motivo.trim().length < 10) return toast.error("Motivo precisa ter ao menos 10 caracteres");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("super-admin-impersonate", {
      body: { target_organization_id: orgId, motivo: motivo.trim() },
    });
    setLoading(false);
    if (error || !(data as any)?.ok) {
      return toast.error("Falha: " + (error?.message || (data as any)?.error || "erro"));
    }
    setLink((data as any).action_link);
    setTargetEmail((data as any).target_email);
    toast.success("Link gerado. Abra em janela anônima para não derrubar sua sessão.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Acessar como — {orgNome}</DialogTitle>
          <DialogDescription>
            Gera um link de acesso único como o dono da organização. Todo acesso fica registrado na auditoria.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Use apenas para diagnóstico de chamados. O cliente NÃO é notificado, mas a ação fica registrada na aba Auditoria com seu ID, IP e motivo.
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <Label>Motivo (obrigatório)</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Chamado #1234 — usuário relata que dashboard não carrega após login"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{motivo.length}/500</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert>
              <AlertDescription className="text-xs">
                Link gerado para <strong>{targetEmail}</strong>. Abra em <strong>janela anônima</strong> para preservar sua sessão de Super Admin.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => window.open(link, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em nova aba
            </Button>
          </div>
        )}

        <DialogFooter>
          {!link ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handle} disabled={loading}>
                {loading ? "Gerando..." : "Gerar link de acesso"}
              </Button>
            </>
          ) : (
            <Button onClick={() => { onOpenChange(false); reset(); }}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
