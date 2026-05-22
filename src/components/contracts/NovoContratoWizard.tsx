import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Upload, FileText, Loader2, Sparkles, X, ArrowRight, ArrowLeft } from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";
import { InlineFornecedorForm } from "./InlineFornecedorForm";

type Fornecedor = { id: string; nome: string; cnpj?: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedores: Fornecedor[];
  onFornecedorCreated?: (f: Fornecedor) => void;
  onCreated?: () => void;
}

type Step = "upload" | "extracao" | "revisao";

const EMPTY_FORM = {
  numero_contrato: "",
  titulo: "",
  descricao: "",
  tipo: "outro",
  valor_total: "",
  moeda: "BRL",
  data_inicio: "",
  data_fim: "",
  fornecedor_id: "",
};

export function NovoContratoWizard({
  open,
  onOpenChange,
  fornecedores,
  onFornecedorCreated,
  onCreated,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [extractionNote, setExtractionNote] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewFornecedor, setShowNewFornecedor] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep("upload");
      setFile(null);
      setFormData(EMPTY_FORM);
      setExtractionNote(null);
      setShowNewFornecedor(false);
    } else {
      // pré-gerar número
      (async () => {
        const { data } = await supabase
          .from("contratos")
          .select("numero_contrato")
          .order("created_at", { ascending: false })
          .limit(1);
        let next = `CT-${new Date().getFullYear()}-001`;
        if (data && data.length > 0) {
          const last = data[0].numero_contrato;
          const m = last.match(/(\d+)$/);
          if (m) {
            const n = parseInt(m[1]) + 1;
            const prefix = last.substring(0, last.length - m[1].length);
            next = `${prefix}${n.toString().padStart(m[1].length, "0")}`;
          }
        }
        setFormData((p) => ({ ...p, numero_contrato: next }));
      })();
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  const proceedToExtracao = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Anexe o contrato", description: "O upload do PDF/DOCX é obrigatório para iniciar." });
      return;
    }
    setStep("extracao");
    setExtracting(true);
    setExtractionNote(null);
    try {
      // 1) Ler texto do arquivo se for texto/docx-light — fallback: pular extração de campos
      let texto = "";
      if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        texto = await file.text();
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        try {
          texto = await file.text();
        } catch {
          texto = "";
        }
      }

      // Para PDFs a leitura via .text() pode vir suja; a extração de campos via texto exigirá ao menos 50 chars
      // Em paralelo chamamos a função analisar-contrato (que usa o arquivo no storage) só depois do upload.
      // Aqui vamos primeiro fazer upload temporário para conseguir signed URL.

      // Faremos: upload temporário -> analisar-contrato (datas) -> se texto disponível, ia-extrair-campos
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) {
        setExtractionNote("Sem organização ativa. Você pode revisar manualmente os campos.");
        return;
      }
      const tempPath = `${organization.id}/rascunhos/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("contratos-documentos")
        .upload(tempPath, file);
      if (upErr) {
        setExtractionNote("Não foi possível enviar o arquivo para análise. Preencha manualmente.");
        return;
      }
      // guarda o path para reaproveitar ao salvar
      (file as any).__tempPath = tempPath;

      // analisar contrato (datas + demais campos)
      try {
        const { data: dt } = await supabase.functions.invoke("analisar-contrato", {
          body: { fileUrl: tempPath },
        });
        if (dt?.success) {
          // tentar mapear fornecedor pelo nome
          let matchedFornecedorId = "";
          if (dt.fornecedor_nome && fornecedores.length > 0) {
            const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            const target = norm(dt.fornecedor_nome);
            const found = fornecedores.find((f) => {
              const n = norm(f.nome);
              return n === target || n.includes(target) || target.includes(n);
            });
            if (found) matchedFornecedorId = found.id;
          }

          setFormData((p) => ({
            ...p,
            data_inicio: dt.data_inicio || p.data_inicio,
            data_fim: dt.data_fim || p.data_fim,
            titulo: dt.titulo || p.titulo,
            descricao: dt.descricao || p.descricao,
            tipo: dt.tipo || p.tipo,
            valor_total: dt.valor_total || p.valor_total,
            moeda: dt.moeda || p.moeda,
            fornecedor_id: matchedFornecedorId || p.fornecedor_id,
          }));

          const partes: string[] = [];
          if (dt.data_inicio || dt.data_fim) partes.push("datas");
          if (dt.titulo) partes.push("título");
          if (dt.valor_total) partes.push("valor");
          if (dt.tipo) partes.push("tipo");
          if (matchedFornecedorId) partes.push("fornecedor");
          else if (dt.fornecedor_nome) partes.push(`fornecedor sugerido: "${dt.fornecedor_nome}" (não encontrado — selecione manualmente)`);

          setExtractionNote(
            partes.length > 0
              ? `Extraído: ${partes.join(", ")}. Revise antes de salvar.`
              : "Extração concluída sem campos identificáveis. Preencha manualmente."
          );
        } else {
          setExtractionNote("Não foi possível extrair dados. Preencha manualmente.");
        }
      } catch (e) {
        console.warn("analisar-contrato falhou:", e);
        setExtractionNote("Falha na extração IA. Preencha manualmente.");
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!organization?.id) {
      toast({ variant: "destructive", title: "Organização não encontrada" });
      return;
    }
    if (!formData.titulo || !formData.fornecedor_id || !formData.data_inicio || !formData.data_fim) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha título, fornecedor e datas." });
      return;
    }

    setSubmitting(true);
    try {
      const { data: ctt, error } = await supabase
        .from("contratos")
        .insert([{
          ...formData,
          organization_id: organization.id,
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
          created_by: user.id,
        }])
        .select("id")
        .single();

      if (error || !ctt) {
        toast({ variant: "destructive", title: "Erro ao criar contrato", description: handleDbError(error).message });
        return;
      }

      // Vincular anexo original
      if (file) {
        const tempPath = (file as any).__tempPath as string | undefined;
        let finalPath = tempPath;
        if (!finalPath) {
          finalPath = `${organization.id}/${user.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from("contratos-documentos").upload(finalPath, file);
          if (upErr) {
            console.error(upErr);
          }
        }
        if (finalPath) {
          await supabase.from("contract_attachments").insert({
            organization_id: organization.id,
            contrato_id: ctt.id,
            nome_arquivo: file.name,
            arquivo_url: finalPath,
            tipo_documento: file.type,
            tamanho_bytes: file.size,
            uploaded_by: user.id,
            is_original: true,
          });
        }
      }

      toast({ title: "Rascunho criado", description: "Revise os campos restantes e envie para análise." });
      onCreated?.();
      onOpenChange(false);
      navigate(`/contratos/${ctt.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Comece pelo upload do contrato. A IA extrai os principais dados."}
            {step === "extracao" && "Extraindo dados do contrato com IA…"}
            {step === "revisao" && "Revise os dados extraídos e complete o cadastro."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs">
          {(["upload", "extracao", "revisao"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={
                  "h-6 w-6 rounded-full grid place-items-center font-semibold " +
                  (step === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                {i + 1}
              </div>
              <span className={step === s ? "font-medium" : "text-muted-foreground"}>
                {s === "upload" ? "Upload" : s === "extracao" ? "Extração" : "Revisão"}
              </span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4">
            <label
              htmlFor="contrato-upload"
              className="block border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar o contrato</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX ou TXT</p>
              <input
                id="contrato-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {file && (
              <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={proceedToExtracao} disabled={!file}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step EXTRACAO */}
        {step === "extracao" && (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center gap-2 text-sm">
              {extracting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Lendo seu contrato com IA…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Extração concluída.</span>
                </>
              )}
            </div>
            {extractionNote && (
              <p className="text-xs text-center text-muted-foreground">{extractionNote}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={extracting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => setStep("revisao")} disabled={extracting}>
                Revisar dados <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step REVISAO */}
        {step === "revisao" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do contrato *</Label>
                <Input
                  value={formData.numero_contrato}
                  onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Título *</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fornecedor *</Label>
                {!showNewFornecedor && (
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowNewFornecedor(true)}>
                    + Novo fornecedor
                  </Button>
                )}
              </div>
              {showNewFornecedor ? (
                <InlineFornecedorForm
                  onCreated={(nf) => {
                    onFornecedorCreated?.(nf);
                    setFormData({ ...formData, fornecedor_id: nf.id });
                    setShowNewFornecedor(false);
                  }}
                  onCancel={() => setShowNewFornecedor(false)}
                />
              ) : (
                <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor total</Label>
                <Input type="number" step="0.01" value={formData.valor_total} onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={formData.moeda} onValueChange={(v) => setFormData({ ...formData, moeda: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Data início *</Label>
                <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data fim *</Label>
                <Input type="date" value={formData.data_fim} onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O bloco financeiro será liberado após o contrato passar pelos gates de validação.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("extracao")} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar rascunho
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
