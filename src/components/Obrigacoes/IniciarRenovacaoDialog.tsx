import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  contratoTitulo: string;
  onSuccess?: () => void;
}

export function IniciarRenovacaoDialog({ open, onOpenChange, contratoId, contratoTitulo, onSuccess }: Props) {
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("iniciar-renovacao", {
        body: { contrato_id: contratoId, observacao },
      });
      if (error) throw error;
      if (data?.ok === false) {
        toast({ title: "Não foi possível iniciar", description: data?.error ?? "Verifique permissões.", variant: "destructive" });
      } else {
        toast({ title: "Renovação iniciada", description: "Fluxo de renovação criado." });
        onSuccess?.();
        onOpenChange(false);
        setObservacao("");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar renovação</DialogTitle>
          <DialogDescription>{contratoTitulo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Observação</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Motivo, condições, contexto..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
