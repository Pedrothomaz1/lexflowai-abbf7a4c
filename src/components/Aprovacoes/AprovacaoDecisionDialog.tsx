import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRegistrarDecisao } from "@/hooks/useAprovacoes";
import { toast } from "@/hooks/use-toast";
import { handleDbError } from "@/utils/dbErrorHandler";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepId: string;
  contratoTitulo?: string;
}

type Decisao = "aprovado" | "rejeitado" | "ajuste";

export function AprovacaoDecisionDialog({ open, onOpenChange, stepId, contratoTitulo }: Props) {
  const [decisao, setDecisao] = useState<Decisao>("aprovado");
  const [motivo, setMotivo] = useState("");
  const mutation = useRegistrarDecisao();

  const exigeMotivo = decisao !== "aprovado";

  const handleSubmit = async () => {
    if (exigeMotivo && motivo.trim().length < 5) {
      toast({ title: "Motivo obrigatório", description: "Mínimo 5 caracteres.", variant: "destructive" });
      return;
    }
    try {
      await mutation.mutateAsync({ step_id: stepId, decisao, motivo: motivo.trim() || undefined });
      toast({ title: "Decisão registrada", description: `Status: ${decisao}` });
      setMotivo("");
      setDecisao("aprovado");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: handleDbError(e).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decisão de aprovação</DialogTitle>
          <DialogDescription>
            {contratoTitulo ? `Contrato: ${contratoTitulo}` : "Registre sua decisão para este passo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Decisão</Label>
            <RadioGroup value={decisao} onValueChange={(v) => setDecisao(v as Decisao)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="aprovado" id="r-aprovado" />
                <Label htmlFor="r-aprovado" className="flex items-center gap-2 cursor-pointer font-normal">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Aprovar
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ajuste" id="r-ajuste" />
                <Label htmlFor="r-ajuste" className="flex items-center gap-2 cursor-pointer font-normal">
                  <AlertCircle className="h-4 w-4 text-warning" /> Solicitar ajuste
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="rejeitado" id="r-rejeitar" />
                <Label htmlFor="r-rejeitar" className="flex items-center gap-2 cursor-pointer font-normal">
                  <XCircle className="h-4 w-4 text-destructive" /> Rejeitar
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              Motivo {exigeMotivo && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={exigeMotivo ? "Descreva o motivo (mínimo 5 caracteres)" : "Opcional"}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Registrando..." : "Confirmar decisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
