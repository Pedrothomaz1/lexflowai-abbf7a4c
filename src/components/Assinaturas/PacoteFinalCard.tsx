import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  pacoteFinalUrl: string | null;
  pacoteFinalHash: string | null;
  congeladoEm: string | null;
}

export function PacoteFinalCard({ pacoteFinalUrl, pacoteFinalHash, congeladoEm }: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!congeladoEm) return null;

  const handleDownload = async () => {
    if (!pacoteFinalUrl) return;
    setDownloading(true);
    const { data, error } = await supabase.storage
      .from("final-packages")
      .createSignedUrl(pacoteFinalUrl, 60);
    setDownloading(false);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar link", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Pacote final assinado
          <Badge variant="default" className="gap-1">
            <Lock className="h-3 w-3" /> Imutável
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Contrato congelado em {new Date(congeladoEm).toLocaleString("pt-BR")}. Qualquer alteração está
          bloqueada por política de integridade.
        </p>
        {pacoteFinalHash && (
          <div className="text-xs font-mono break-all bg-muted p-2 rounded">
            SHA-256: {pacoteFinalHash}
          </div>
        )}
        {pacoteFinalUrl && (
          <Button onClick={handleDownload} disabled={downloading} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            {downloading ? "Gerando link…" : "Baixar pacote final"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
