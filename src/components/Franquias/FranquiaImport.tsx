import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  parseFranquiasXLSX,
  generateFranquiasTemplate,
  FranquiaImportResult,
} from "@/utils/franquiaXlsxParser";
import { cn } from "@/lib/utils";

interface FranquiaImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: FranquiaImportResult[]) => Promise<void>;
}

export function FranquiaImport({ open, onOpenChange, onImport }: FranquiaImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseResults, setParseResults] = useState<FranquiaImportResult[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const results = await parseFranquiasXLSX(buffer);
      
      if (results.length === 0) {
        setError("Nenhum dado encontrado no arquivo. Verifique se o formato está correto.");
        return;
      }
      
      setParseResults(results);
    } catch (err) {
      console.error("Erro ao processar arquivo:", err);
      setError("Erro ao processar o arquivo. Verifique se o formato está correto.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDownloadTemplate = async () => {
    const buffer = await generateFranquiasTemplate();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_franquias.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parseResults) return;
    
    const validResults = parseResults.filter((r) => r.status !== "error");
    if (validResults.length === 0) {
      setError("Nenhum registro válido para importar");
      return;
    }

    setIsImporting(true);
    try {
      await onImport(validResults);
      setParseResults(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Erro na importação:", err);
      setError("Erro ao importar os dados. Tente novamente.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParseResults(null);
    setError(null);
    onOpenChange(false);
  };

  const stats = parseResults
    ? {
        total: parseResults.length,
        valid: parseResults.filter((r) => r.status === "valid").length,
        warning: parseResults.filter((r) => r.status === "warning").length,
        error: parseResults.filter((r) => r.status === "error").length,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Franquias
          </DialogTitle>
          <DialogDescription>
            Importe múltiplas franquias de uma planilha Excel
          </DialogDescription>
        </DialogHeader>

        {!parseResults ? (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste um arquivo Excel aqui ou
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="sr-only"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Selecionar Arquivo</span>
                </Button>
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Baixar Template</p>
                <p className="text-xs text-muted-foreground">
                  Use nosso modelo de planilha para facilitar a importação
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="font-medium">{stats?.total}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">{stats?.valid}</span>
              </div>
              {(stats?.warning ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-600">{stats?.warning}</span>
                </div>
              )}
              {(stats?.error ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-600">{stats?.error}</span>
                </div>
              )}
            </div>

            {/* Preview Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Mensagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResults.map((result) => (
                    <TableRow
                      key={result.rowIndex}
                      className={cn(
                        result.status === "error" && "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      <TableCell className="font-mono text-sm">
                        {result.rowIndex}
                      </TableCell>
                      <TableCell>
                        {result.status === "valid" && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                        {result.status === "warning" && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Aviso
                          </Badge>
                        )}
                        {result.status === "error" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {result.data.nome_completo || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.data.cnpj || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {result.data.status_vigencia}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {[...result.errors, ...result.warnings].map((msg, i) => (
                          <div key={i} className={result.errors.includes(msg) ? "text-red-600" : "text-yellow-600"}>
                            {msg}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                onClick={() => setParseResults(null)}
                disabled={isImporting}
              >
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || stats?.valid === 0}
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {stats?.valid} Franquia{(stats?.valid ?? 0) !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
