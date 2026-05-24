import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Sparkles, ArrowRight, ArrowLeft, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WizardStep = "upload" | "extracao" | "revisao";

interface ExtractedData {
  titulo?: string;
  numero_contrato?: string;
  tipo?: string;
  contratante?: { nome?: string; documento?: string };
  contratada?: { nome?: string; documento?: string };
  valor_total?: number;
  data_inicio?: string;
  data_fim?: string;
  data_assinatura?: string;
  objeto?: string;
  confianca?: number;
}

interface FormData {
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

interface Fornecedor {
  id: string;
  nome: string;
  cnpj?: string | null;
  cpf?: string | null;
}

interface NovoContratoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedores: Fornecedor[];
  initialFormData: FormData;
  onSuccess: () => void;
}

const STEPS: WizardStep[] = ["upload", "extracao", "revisao"];
const STEP_LABELS: Record<WizardStep, string> = {
  upload: "Upload",
  extracao: "Extração",
  revisao: "Revisão",
};

export function NovoContratoWizard({
  open,
  onOpenChange,
  fornecedores,
  initialFormData,
  onSuccess,
}: NovoContratoWizardProps) {
  const { organization } = useOrganization();
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setIsDragging(false);
    setUploading(false);
    setExtracting(false);
    setExtractionFailed(false);
    setUploadedPath(null);
    setFormData(initialFormData);
    setSubmitting(false);
  }, [initialFormData]);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (uploading || extracting || submitting) {
      return;
    }

    handleClose();
  }, [extracting, handleClose, onOpenChange, submitting, uploading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const applyExtractedData = (data: ExtractedData) => {
    setFormData((prev) => ({
      ...prev,
      titulo: data.titulo || prev.titulo,
      numero_contrato: data.numero_contrato || prev.numero_contrato,
      tipo: data.tipo || prev.tipo,
      valor_total: data.valor_total != null ? String(data.valor_total) : prev.valor_total,
      data_inicio: data.data_inicio || prev.data_inicio,
      data_fim: data.data_fim || prev.data_fim,
      descricao: data.objeto || prev.descricao,
    }));
  };

  const handleUploadAndExtract = async () => {
    if (!file || !organization?.id) return;

    setUploading(true);
    setStep("extracao");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const ext = file.name.split(".").pop();
      const path = `${organization.id}/${user.id}/${Date.now()}.${ext}`;

      // Upload direto via fetch para evitar o timeout global de 10s do client supabase
      const { data: uploadSession } = await supabase.auth.getSession();
      const uploadToken = uploadSession.session?.access_token;
      const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/contratos-documentos/${path}`;
      const uploadController = new AbortController();
      const uploadTimeout = setTimeout(() => uploadController.abort(), 120_000);
      let uploadResp: Response;
      try {
        uploadResp = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${uploadToken}`,
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: file,
          signal: uploadController.signal,
        });
      } finally {
        clearTimeout(uploadTimeout);
      }
      if (!uploadResp.ok) {
        const txt = await uploadResp.text().catch(() => "");
        throw new Error(`Upload falhou (${uploadResp.status}): ${txt.slice(0, 200)}`);
      }

      setUploadedPath(path);
      setUploading(false);
      setExtracting(true);

      // Bypass supabase.functions.invoke (its global fetch has a 10s abort timeout
      // that kills long extractions). Call edge function directly with a 90s timeout.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extrair-dados-pdf`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);

      let data: any = null;
      let fnError: unknown = null;
      try {
        const resp = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ fileUrl: path }),
          signal: controller.signal,
        });
        data = await resp.json().catch(() => null);
        if (!resp.ok) fnError = data?.error || `HTTP ${resp.status}`;
      } catch (e) {
        fnError = e;
      } finally {
        clearTimeout(timeoutId);
      }

      console.log("[NovoContratoWizard] extrair-dados-pdf response:", { data, fnError });

      if (fnError) {
        console.error("[NovoContratoWizard] Edge function error:", fnError);
        setExtractionFailed(true);
      } else if (data?.success && data.data) {
        applyExtractedData(data.data);
        setExtractionFailed(false);
      } else {
        console.error("[NovoContratoWizard] Extraction returned no data:", data);
        setExtractionFailed(true);
      }
      setStep("revisao");
    } catch (err) {
      console.error("[NovoContratoWizard] Exception during extraction:", err);
      setExtractionFailed(true);
      setStep("revisao");
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: newContrato, error } = await supabase
        .from("contratos")
        .insert({
          numero_contrato: formData.numero_contrato,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          tipo: formData.tipo,
          status: "vigente",
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
          moeda: formData.moeda,
          data_inicio: formData.data_inicio || null,
          data_fim: formData.data_fim || null,
          fornecedor_id: formData.fornecedor_id || null,
          organization_id: organization.id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (uploadedPath && newContrato?.id) {
        await supabase.from("contract_documents").insert({
          contrato_id: newContrato.id,
          file_name: file?.name || "documento.pdf",
          file_path: uploadedPath,
          file_size: file?.size || 0,
          mime_type: file?.type || "application/pdf",
          uploaded_by: user.id,
        }).then(() => null);
      }

      toast.success("Contrato criado com sucesso!");
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar contrato");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.indexOf(step);
  const subtitle: Record<WizardStep, string> = {
    upload: "Faça upload do arquivo do contrato para extrair dados automaticamente",
    extracao: extracting || uploading ? "Extraindo dados do contrato com IA..." : "Extração concluída",
    revisao: "Revise os dados extraídos e complete as informações",
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>{subtitle[step]}</DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : currentStepIndex > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "ml-1 text-sm hidden sm:inline",
                  step === s ? "font-semibold" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-2",
                    currentStepIndex > i ? "bg-primary/50" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("wizard-file-input")?.click()}
            >
              <input
                id="wizard-file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Arraste o contrato aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou clique para selecionar · PDF, DOC, DOCX
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleUploadAndExtract} disabled={!file}>
                Extrair com IA
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Extraction */}
        {step === "extracao" && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
            {uploading || extracting ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-medium">
                  {uploading ? "Enviando arquivo..." : "Analisando com IA..."}
                </p>
                <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
              </>
            ) : (
              <>
                <Sparkles className="h-12 w-12 text-primary" />
                <p className="text-lg font-semibold">Extração concluída.</p>
                {extractionFailed && (
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Não foi possível enviar o arquivo para análise. Preencha manualmente.
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setStep("upload"); setExtractionFailed(false); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={() => setStep("revisao")}>
                    Revisar dados
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Review form */}
        {step === "revisao" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wiz-numero">Número do Contrato *</Label>
                <Input
                  id="wiz-numero"
                  value={formData.numero_contrato}
                  onChange={(e) => setFormData((p) => ({ ...p, numero_contrato: e.target.value }))}
                  required
                  placeholder="Ex: CT-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData((p) => ({ ...p, tipo: v }))}
                >
                  <SelectTrigger id="wiz-tipo">
                    <SelectValue placeholder="Selecione" />
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
              <Label htmlFor="wiz-titulo">Título *</Label>
              <Input
                id="wiz-titulo"
                value={formData.titulo}
                onChange={(e) => setFormData((p) => ({ ...p, titulo: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-descricao">Descrição / Objeto</Label>
              <Textarea
                id="wiz-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-fornecedor">Fornecedor *</Label>
              <Select
                value={formData.fornecedor_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, fornecedor_id: v }))}
                required
              >
                <SelectTrigger id="wiz-fornecedor">
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wiz-valor">Valor Total</Label>
                <Input
                  id="wiz-valor"
                  type="number"
                  step="0.01"
                  value={formData.valor_total}
                  onChange={(e) => setFormData((p) => ({ ...p, valor_total: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-moeda">Moeda</Label>
                <Select
                  value={formData.moeda}
                  onValueChange={(v) => setFormData((p) => ({ ...p, moeda: v }))}
                >
                  <SelectTrigger id="wiz-moeda">
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
                <Label htmlFor="wiz-inicio">Data de Início *</Label>
                <Input
                  id="wiz-inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData((p) => ({ ...p, data_inicio: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-fim">Data de Término *</Label>
                <Input
                  id="wiz-fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData((p) => ({ ...p, data_fim: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("extracao")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Contrato
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
