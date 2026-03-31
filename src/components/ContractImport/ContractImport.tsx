import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Users,
} from "lucide-react";
import {
  parseExcelFile,
  processImportedRow,
  generateExampleTemplate,
  ProcessedContract,
} from "@/utils/xlsxParser";
import { cleanDocument } from "@/utils/documentValidation";
import { cn } from "@/lib/utils";

interface ContractImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  fornecedores: { id: string; nome: string; cnpj?: string | null; cpf?: string | null }[];
}

type ImportStep = 'upload' | 'preview' | 'suppliers' | 'importing' | 'complete';

export function ContractImport({
  open,
  onOpenChange,
  onImportComplete,
  fornecedores,
}: ContractImportProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [contracts, setContracts] = useState<ProcessedContract[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  }>({ success: 0, failed: 0, errors: [] });
  const [isDragging, setIsDragging] = useState(false);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setContracts([]);
    setSelectedRows(new Set());
    setImporting(false);
    setProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      processFile(droppedFile);
    } else {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Por favor, envie um arquivo .xlsx",
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    
    try {
      const rows = await parseExcelFile(selectedFile);
      const processed = rows.map(row => {
        const contract = processImportedRow(row);
        
        // Tenta encontrar fornecedor existente
        const matchedFornecedor = findMatchingFornecedor(
          contract.parsed.contratada,
          contract.parsed.documento,
          fornecedores
        );
        
        if (matchedFornecedor) {
          contract.fornecedorId = matchedFornecedor.id;
          contract.fornecedorNome = matchedFornecedor.nome;
          contract.createFornecedor = false;
        } else if (contract.parsed.contratada) {
          contract.createFornecedor = true;
        }
        
        return contract;
      });
      
      setContracts(processed);
      
      // Seleciona todas as linhas válidas por padrão
      const validRows = new Set(
        processed
          .filter(c => c.validation.valid)
          .map(c => c.rowIndex)
      );
      setSelectedRows(validRows);
      
      setStep('preview');
      
      toast({
        title: "Arquivo processado",
        description: `${rows.length} linha(s) encontrada(s)`,
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  const findMatchingFornecedor = (
    nome: string,
    documento: string,
    fornecedores: { id: string; nome: string; cnpj?: string | null; cpf?: string | null }[]
  ) => {
    if (!nome && !documento) return null;
    
    // Primeiro tenta match por documento
    if (documento) {
      const cleanedDoc = cleanDocument(documento);
      const byDoc = fornecedores.find(f => {
        const fDoc = cleanDocument(f.cnpj || f.cpf || '');
        return fDoc === cleanedDoc;
      });
      if (byDoc) return byDoc;
    }
    
    // Depois tenta match por nome (case insensitive)
    if (nome) {
      const normalizedNome = nome.toLowerCase().trim();
      const byName = fornecedores.find(f => 
        f.nome.toLowerCase().trim() === normalizedNome
      );
      if (byName) return byName;
      
      // Match parcial
      const byPartialName = fornecedores.find(f => 
        f.nome.toLowerCase().includes(normalizedNome) ||
        normalizedNome.includes(f.nome.toLowerCase())
      );
      if (byPartialName) return byPartialName;
    }
    
    return null;
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === contracts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(contracts.map(c => c.rowIndex)));
    }
  };

  const selectAllValid = () => {
    const validRows = new Set(
      contracts
        .filter(c => c.validation.valid)
        .map(c => c.rowIndex)
    );
    setSelectedRows(validRows);
  };

  const selectAllWithWarnings = () => {
    const rowsWithWarnings = new Set(
      contracts
        .filter(c => c.validation.valid && c.validation.warnings.length > 0)
        .map(c => c.rowIndex)
    );
    setSelectedRows(rowsWithWarnings);
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const downloadTemplate = async () => {
    const blob = await generateExampleTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao_contratos.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateContractNumber = async (index: number): Promise<string> => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `IMP-${dateStr}-${String(index + 1).padStart(3, '0')}`;
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);
    setProgress(0);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Você precisa estar logado para importar contratos",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
      });
      setImporting(false);
      setStep('preview');
      return;
    }
    
    const selectedContracts = contracts.filter(c => selectedRows.has(c.rowIndex));
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (let i = 0; i < selectedContracts.length; i++) {
      const contract = selectedContracts[i];
      
      try {
        // Cria fornecedor se necessário
        let fornecedorId = contract.fornecedorId;
        
        if (contract.createFornecedor && contract.parsed.contratada) {
          const tipoPessoa = contract.parsed.documentoTipo === 'cpf' ? 'fisica' : 'juridica';
          
          const { data: newFornecedor, error: fornecedorError } = await supabase
            .from('fornecedores')
            .insert({
              nome: contract.parsed.contratada,
              cnpj: contract.parsed.documentoTipo === 'cnpj' ? contract.parsed.documento : null,
              cpf: contract.parsed.documentoTipo === 'cpf' ? contract.parsed.documento : null,
              tipo_pessoa: tipoPessoa,
              organization_id: organization.id,
              created_by: user.id,
            })
            .select('id')
            .single();
          
          if (fornecedorError) {
            console.error('Erro ao criar fornecedor:', fornecedorError);
          } else {
            fornecedorId = newFornecedor.id;
          }
        }
        
        // Gera número do contrato
        const numeroContrato = await generateContractNumber(i);
        
        // Insere o contrato
        const { error: contratoError } = await supabase
          .from('contratos')
          .insert({
            numero_contrato: numeroContrato,
            titulo: contract.parsed.titulo,
            descricao: contract.parsed.observacoes,
            tipo: 'outro', // Tipo padrão
            status: contract.parsed.status as any,
            valor_total: contract.parsed.valor,
            moeda: 'BRL',
            data_assinatura: contract.parsed.dataAssinatura,
            data_inicio: contract.parsed.dataInicio,
            data_fim: contract.parsed.dataFim,
            fornecedor_id: fornecedorId,
            observacoes: contract.parsed.observacoes,
            tags: contract.parsed.tags,
            metadata: contract.parsed.metadata,
            organization_id: organization.id,
            created_by: user.id,
          });
        
        if (contratoError) {
          results.failed++;
          results.errors.push(`Linha ${contract.rowIndex}: ${handleDbError(contratoError).message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Linha ${contract.rowIndex}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      setProgress(Math.round(((i + 1) / selectedContracts.length) * 100));
    }
    
    setImportResults(results);
    setImporting(false);
    setStep('complete');
    
    if (results.success > 0) {
      onImportComplete();
    }
  };

  const validCount = contracts.filter(c => c.validation.valid).length;
  const warningCount = contracts.filter(c => c.validation.warnings.length > 0).length;
  const errorCount = contracts.filter(c => !c.validation.valid).length;
  const newSuppliersCount = contracts.filter(c => c.createFornecedor).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Contratos via Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do arquivo Excel com os contratos para importar'}
            {step === 'preview' && 'Revise os dados e selecione os contratos para importar'}
            {step === 'suppliers' && 'Revise os fornecedores que serão criados'}
            {step === 'importing' && 'Importando contratos...'}
            {step === 'complete' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['upload', 'preview', 'importing', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ['upload', 'preview', 'importing', 'complete'].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-1",
                    ['upload', 'preview', 'importing', 'complete'].indexOf(step) > i
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Arraste o arquivo Excel aqui
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar
                </p>
                <Badge variant="outline">.xlsx</Badge>
              </div>

              <div className="flex items-center justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template de Exemplo
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Summary */}
              <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg justify-between items-center">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">{validCount} válidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm">{warningCount} com avisos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{errorCount} com erros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-info" />
                    <span className="text-sm">{newSuppliersCount} novos fornecedores</span>
                  </div>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllValid}
                    className="text-success border-success/30 hover:bg-success/10"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Selecionar válidos ({validCount})
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleAllRows}>
                    Selecionar todos ({contracts.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedRows.size === 0}
                  >
                    Limpar seleção
                  </Button>
                </div>
              </div>



              {/* Table */}
              <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="p-2 text-left w-10">
                        <Checkbox
                          checked={selectedRows.size === contracts.length}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                      <th className="p-2 text-left w-12">#</th>
                      <th className="p-2 text-left">Objeto</th>
                      <th className="p-2 text-left">Contratada</th>
                      <th className="p-2 text-left">Documento</th>
                      <th className="p-2 text-left">Valor</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left w-20">Validação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr
                        key={contract.rowIndex}
                        className={cn(
                          "border-t transition-colors",
                          selectedRows.has(contract.rowIndex)
                            ? "bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selectedRows.has(contract.rowIndex)}
                            onCheckedChange={() => toggleRowSelection(contract.rowIndex)}
                          />
                        </td>
                        <td className="p-2 text-muted-foreground font-mono">
                          {contract.rowIndex}
                        </td>
                        <td className="p-2 max-w-[200px] truncate" title={contract.parsed.titulo}>
                          {contract.parsed.titulo || <span className="text-destructive">—</span>}
                        </td>
                        <td className="p-2 max-w-[150px] truncate">
                          <div className="flex items-center gap-1">
                            {contract.parsed.contratada}
                            {contract.createFornecedor && (
                              <Badge variant="outline" className="text-xs ml-1">Novo</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2 font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {contract.parsed.documentoFormatado || '—'}
                            {contract.parsed.documento && (
                              contract.parsed.documentoValido ? (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )
                            )}
                          </div>
                        </td>
                        <td className="p-2 font-mono">
                          {contract.parsed.valor
                            ? new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(contract.parsed.valor)
                            : '—'}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {contract.parsed.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {contract.validation.valid ? (
                            contract.validation.warnings.length > 0 ? (
                              <div className="flex items-center gap-1" title={contract.validation.warnings.join('\n')}>
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              </div>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )
                          ) : (
                            <div className="flex items-center gap-1" title={contract.validation.errors.join('\n')}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedRows.size === 0}
                >
                  Importar {selectedRows.size} contrato(s)
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Importando contratos...</p>
                <p className="text-sm text-muted-foreground">
                  Por favor, aguarde. Não feche esta janela.
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} />
                <p className="text-center text-sm text-muted-foreground">
                  {progress}% concluído
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {importResults.success > 0 ? (
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <FileCheck className="h-8 w-8 text-success" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              )}
              
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Importação Concluída</p>
                <div className="flex gap-4 justify-center">
                  <span className="text-success">
                    {importResults.success} sucesso
                  </span>
                  {importResults.failed > 0 && (
                    <span className="text-destructive">
                      {importResults.failed} falha(s)
                    </span>
                  )}
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <ScrollArea className="max-h-40 w-full max-w-md border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Erros:</p>
                  {importResults.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">{error}</p>
                  ))}
                </ScrollArea>
              )}

              <Button onClick={handleClose}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
