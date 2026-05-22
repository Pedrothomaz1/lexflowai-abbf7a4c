import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Loader2 } from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obrigacaoId: string;
  obrigacaoTitulo: string;
  onSuccess?: () => void;
}

export function EvidenciaUploadDialog({ open, onOpenChange, obrigacaoId, obrigacaoTitulo, onSuccess }: Props) {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !organization?.id || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${organization.id}/${obrigacaoId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("obligation-evidences")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("contract_obligations")
        .update({
          evidencia_url: path,
          status: "concluido",
          concluido_em: new Date().toISOString(),
          concluido_por: user.id,
          observacao_conclusao: observacao || null,
        })
        .eq("id", obrigacaoId)
        .select("id")
        .maybeSingle();
      if (updErr) throw updErr;

      toast({ title: "Evidência anexada", description: "Obrigação concluída com comprovante." });
      onSuccess?.();
      onOpenChange(false);
      setFile(null);
      setObservacao("");
    } catch (e: any) {
      toast({ title: "Erro", description: handleDbError(e).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar evidência</DialogTitle>
          <DialogDescription>{obrigacaoTitulo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Arquivo comprobatório *</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Contexto da entrega..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Anexar e concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
