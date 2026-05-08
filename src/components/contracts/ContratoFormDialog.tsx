import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, X, Loader2 } from "lucide-react";
import { InlineFornecedorForm } from "./InlineFornecedorForm";

type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string | null;
  cpf?: string | null;
  cnpj_status?: string | null;
};

interface ContratoFormData {
  numero_contrato: string;
  titulo: string;
  descricao: string;
  tipo: string;
  valor_total: string;
  moeda: string;
  data_inicio: string;
  data_fim: string;
  fornecedor_id: string;
}

interface ContratoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ContratoFormData;
  onFormDataChange: (data: ContratoFormData) => void;
  uploadedFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  fornecedores: Fornecedor[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  onFornecedorCreated?: (fornecedor: Fornecedor) => void;
}

export function ContratoFormDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  uploadedFiles,
  onFileSelect,
  onRemoveFile,
  fornecedores,
  onSubmit,
  submitting,
  onFornecedorCreated,
}: ContratoFormDialogProps) {
  const [showNewFornecedor, setShowNewFornecedor] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="btn-cta">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Contrato de Serviço
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>Preencha os dados do contrato</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_contrato">Número do Contrato *</Label>
              <Input
                id="numero_contrato"
                value={formData.numero_contrato}
                onChange={(e) => onFormDataChange({ ...formData, numero_contrato: e.target.value })}
                required
                placeholder="Ex: CT-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => onFormDataChange({ ...formData, tipo: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prestacao_servicos">Prestação de Serviço</SelectItem>
                  <SelectItem value="fornecimento">Fornecimento</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="confidencialidade">Confidencialidade</SelectItem>
                  <SelectItem value="parceria">Parceria</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => onFormDataChange({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => onFormDataChange({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Anexos (múltiplos arquivos)</Label>
            <Input
              id="arquivo"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={onFileSelect}
              multiple
            />
            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              {!showNewFornecedor && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowNewFornecedor(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo Fornecedor
                </Button>
              )}
            </div>

            {showNewFornecedor ? (
              <InlineFornecedorForm
                onCreated={(newFornecedor) => {
                  onFornecedorCreated?.(newFornecedor);
                  onFormDataChange({ ...formData, fornecedor_id: newFornecedor.id });
                  setShowNewFornecedor(false);
                }}
                onCancel={() => setShowNewFornecedor(false)}
              />
            ) : (
              <Select
                value={formData.fornecedor_id}
                onValueChange={(value) => onFormDataChange({ ...formData, fornecedor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => onFormDataChange({ ...formData, valor_total: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moeda">Moeda</Label>
              <Select
                value={formData.moeda}
                onValueChange={(value) => onFormDataChange({ ...formData, moeda: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => onFormDataChange({ ...formData, data_inicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Término *</Label>
              <Input
                id="data_fim"
                type="date"
                value={formData.data_fim}
                onChange={(e) => onFormDataChange({ ...formData, data_fim: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
