import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  FileSignature,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExtractedData {
  titulo?: string;
  numero_contrato?: string;
  tipo?: string;
  contratante?: {
    nome?: string;
    documento?: string;
  };
  contratada?: {
    nome?: string;
    documento?: string;
  };
  valor_total?: number;
  data_inicio?: string;
  data_fim?: string;
  data_assinatura?: string;
  objeto?: string;
  clausulas_principais?: Array<{
    numero?: string;
    titulo?: string;
    resumo?: string;
  }>;
  confianca?: number;
}

interface PDFDataExtractorProps {
  fileUrl: string;
  contratoId?: string;
  onDataExtracted?: (data: ExtractedData) => void;
  onApplyData?: (data: ExtractedData) => void;
}

export function PDFDataExtractor({ 
  fileUrl, 
  contratoId, 
  onDataExtracted, 
  onApplyData 
}: PDFDataExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('extrair-dados-pdf', {
        body: { fileUrl, contratoId }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao extrair dados');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha na extração');
      }

      setExtractedData(data.data);
      onDataExtracted?.(data.data);
      toast.success("Dados extraídos com sucesso!");
    } catch (err) {
      console.error('Extraction error:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error("Erro na extração: " + message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyData?.(extractedData);
      toast.success("Dados aplicados ao formulário");
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-muted';
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTipoLabel = (tipo?: string) => {
    const tipos: Record<string, string> = {
      'prestacao_servicos': 'Prestação de Serviços',
      'fornecimento': 'Fornecimento',
      'locacao': 'Locação',
      'confidencialidade': 'Confidencialidade',
      'parceria': 'Parceria',
      'outro': 'Outro'
    };
    return tipos[tipo || ''] || tipo || 'Não identificado';
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Extração Automática por IA</CardTitle>
          </div>
          {extractedData?.confianca !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confiança:</span>
              <Badge variant="outline" className="gap-1">
                <div className={`h-2 w-2 rounded-full ${getConfidenceColor(extractedData.confianca)}`} />
                {extractedData.confianca}%
              </Badge>
            </div>
          )}
        </div>
        <CardDescription>
          Extraia automaticamente dados do PDF usando inteligência artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData && !isExtracting && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Clique no botão abaixo para extrair automaticamente informações do contrato
            </p>
            <Button onClick={handleExtract} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Extrair Dados do PDF
            </Button>
          </div>
        )}

        {isExtracting && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Analisando documento...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Isso pode levar alguns segundos
            </p>
            <Progress value={undefined} className="w-48 mt-4" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro na extração</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {extractedData && (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  Informações Básicas
                </h4>
                <div className="grid gap-3">
                  {extractedData.titulo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <p className="text-sm font-medium">{extractedData.titulo}</p>
                    </div>
                  )}
                  {extractedData.numero_contrato && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Número do Contrato</Label>
                      <p className="text-sm font-medium">{extractedData.numero_contrato}</p>
                    </div>
                  )}
                  {extractedData.tipo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Badge variant="secondary">{getTipoLabel(extractedData.tipo)}</Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Parties */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Partes Envolvidas
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {extractedData.contratante && (
                    <div className="p-3 border rounded-lg">
                      <Label className="text-xs text-muted-foreground">Contratante</Label>
                      <p className="text-sm font-medium">{extractedData.contratante.nome || '-'}</p>
                      {extractedData.contratante.documento && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {extractedData.contratante.documento}
                        </p>
                      )}
                    </div>
                  )}
                  {extractedData.contratada && (
                    <div className="p-3 border rounded-lg">
                      <Label className="text-xs text-muted-foreground">Contratada</Label>
                      <p className="text-sm font-medium">{extractedData.contratada.nome || '-'}</p>
                      {extractedData.contratada.documento && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {extractedData.contratada.documento}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Values and Dates */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Valores e Datas
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {extractedData.valor_total !== undefined && (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Valor Total</Label>
                        <p className="text-sm font-medium">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(extractedData.valor_total)}
                        </p>
                      </div>
                    </div>
                  )}
                  {extractedData.data_inicio && (
                    <div className="p-3 border rounded-lg">
                      <Label className="text-xs text-muted-foreground">Data de Início</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(extractedData.data_inicio), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}
                  {extractedData.data_fim && (
                    <div className="p-3 border rounded-lg">
                      <Label className="text-xs text-muted-foreground">Data de Término</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(extractedData.data_fim), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}
                  {extractedData.data_assinatura && (
                    <div className="p-3 border rounded-lg">
                      <Label className="text-xs text-muted-foreground">Data de Assinatura</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(extractedData.data_assinatura), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Object */}
              {extractedData.objeto && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Objeto do Contrato</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {extractedData.objeto}
                    </p>
                  </div>
                </>
              )}

              {/* Main Clauses */}
              {extractedData.clausulas_principais && extractedData.clausulas_principais.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium">Cláusulas Principais Identificadas</h4>
                    <div className="space-y-2">
                      {extractedData.clausulas_principais.map((clausula, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {clausula.numero && (
                              <Badge variant="outline" className="text-xs">
                                {clausula.numero}
                              </Badge>
                            )}
                            <span className="font-medium text-sm">{clausula.titulo}</span>
                          </div>
                          {clausula.resumo && (
                            <p className="text-xs text-muted-foreground">{clausula.resumo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex gap-2 pt-2">
                <Button onClick={handleApply} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar ao Formulário
                </Button>
                <Button variant="outline" onClick={handleExtract}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reextrair
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
