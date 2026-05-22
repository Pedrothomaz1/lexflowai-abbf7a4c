import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  contratoTitulo: string;
  onSuccess?: () => void;
}

const INDICES = ["IPCA", "IGPM", "INPC", "Manual"];

export function RegistrarReajusteDialog({ open, onOpenChange, contratoId, contratoTitulo, onSuccess }: Props) {
  const [indice, setIndice] = useState("IPCA");
  const [percentual, setPercentual] = useState<string>("");
  const [vigenciaInicio, setVigenciaInicio] = useState<string>(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const pct = Number(percentual.replace(",", "."));
    if (!Number.isFinite(pct)) {
      toast({ title: "Percentual inválido", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("registrar-reajuste", {
        body: { contrato_id: contratoId, indice, percentual: pct, vigencia_inicio: vigenciaInicio, observacao },
      });
      if (error) throw error;
      if (data?.ok === false) {
        toast({ title: "Não foi possível registrar", description: data?.error ?? "Verifique permissões.", variant: "destructive" });
      } else {
        toast({ title: "Reajuste registrado", description: `Novo valor: R$ ${Number(data?.valor_novo ?? 0).toLocaleString("pt-BR")}` });
        onSuccess?.();
        onOpenChange(false);
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
          <DialogTitle>Registrar reajuste</DialogTitle>
          <DialogDescription>{contratoTitulo}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>Índice *</Label>
            <Select value={indice} onValueChange={setIndice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDICES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Percentual % *</Label>
            <Input value={percentual} onChange={(e) => setPercentual(e.target.value)} placeholder="ex: 4,5" />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Vigência início *</Label>
            <Input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !percentual}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
