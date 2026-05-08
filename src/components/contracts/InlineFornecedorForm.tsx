import { useState } from "react";
import { handleDbError } from "@/utils/dbErrorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentInput } from "@/components/ui/document-input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, UserPlus, Search } from "lucide-react";
import { useCnpjVerification } from "@/hooks/useCnpjVerification";
import { CnpjStatusBadge, isCnpjProblem } from "@/components/cnpj/CnpjStatusBadge";

type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string | null;
  cpf?: string | null;
};

interface InlineFornecedorFormProps {
  onCreated: (fornecedor: Fornecedor) => void;
  onCancel: () => void;
}

export function InlineFornecedorForm({ onCreated, onCancel }: InlineFornecedorFormProps) {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<"pj" | "pf">("pj");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [docValid, setDocValid] = useState(false);
  const [email, setEmail] = useState("");
  const { verify, loading: verifying, result: cnpjResult, setResult } = useCnpjVerification();

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }
    if (!organization?.id) return;

    if (tipoPessoa === "pj" && docValid) {
      const r = cnpjResult ?? (await verify(documento, { silent: true }));
      if (r && isCnpjProblem(r.status)) {
        toast({
          variant: "destructive",
          title: "CNPJ não está ativo",
          description: "Não é possível cadastrar fornecedor com CNPJ inativo.",
        });
        return;
      }
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setCreating(true);
    try {
      const insertData: Record<string, unknown> = {
        nome: nome.trim(),
        tipo_pessoa: tipoPessoa === "pj" ? "juridica" : "fisica",
        organization_id: organization.id,
        created_by: user.user.id,
        email: email || null,
      };

      if (tipoPessoa === "pj") {
        insertData.cnpj = documento || null;
        if (cnpjResult?.status) {
          insertData.cnpj_status = cnpjResult.status;
          insertData.cnpj_situacao_data = cnpjResult.situacao_data ?? null;
          insertData.cnpj_verificado_em = new Date().toISOString();
        }
      } else {
        insertData.cpf = documento || null;
      }

      const { data, error } = await supabase
        .from("fornecedores")
        .insert(insertData)
        .select("id, nome, cnpj, cpf")
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar fornecedor",
          description: handleDbError(error).message,
        });
        return;
      }

      toast({ title: "Fornecedor cadastrado!", description: `${data.nome} foi adicionado.` });
      onCreated(data);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-dashed border-primary/40 rounded-lg p-4 bg-primary/5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <UserPlus className="h-4 w-4" />
          Cadastro rápido de fornecedor
        </div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Nome *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Razão social ou nome"
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={tipoPessoa} onValueChange={(v) => { setTipoPessoa(v as "pj" | "pf"); setDocumento(""); }}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
              <SelectItem value="pf">Pessoa Física</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{tipoPessoa === "pj" ? "CNPJ" : "CPF"}</Label>
          <DocumentInput
            documentType={tipoPessoa === "pj" ? "cnpj" : "cpf"}
            value={documento}
            onChange={(val, valid) => { setDocumento(val); setDocValid(valid); setResult(null); }}
            showValidation={documento.length > 0}
            className="h-9"
          />
          {tipoPessoa === "pj" && docValid && (
            <div className="flex items-center justify-between gap-2 pt-1">
              {cnpjResult ? (
                <CnpjStatusBadge status={cnpjResult.status} />
              ) : (
                <span className="text-xs text-muted-foreground">Verifique na Receita Federal</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={verifying}
                onClick={async () => {
                  const r = await verify(documento, { force: true });
                  if (r && !nome.trim() && r.nome) setNome(r.nome);
                  if (r && !email && r.email) setEmail(r.email);
                }}
              >
                {verifying ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Search className="h-3 w-3 mr-1" />
                )}
                Verificar
              </Button>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={creating || !nome.trim()}>
          {creating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Salvar Fornecedor
        </Button>
      </div>
    </div>
  );
}
