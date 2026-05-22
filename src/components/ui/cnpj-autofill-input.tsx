import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentInput } from "@/components/ui/document-input";
import { Loader2, Search } from "lucide-react";
import { useCnpjVerification, type CnpjVerifyResult } from "@/hooks/useCnpjVerification";
import { CnpjStatusBadge } from "@/components/cnpj/CnpjStatusBadge";
import { CnpjDetailsDialog } from "@/components/cnpj/CnpjDetailsDialog";

export interface CnpjAutoFillData {
  nome?: string;
  fantasia?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

interface CnpjAutoFillInputProps {
  value: string;
  onChange: (value: string) => void;
  onDataFetched?: (data: CnpjAutoFillData, raw: CnpjVerifyResult) => void;
  disabled?: boolean;
  className?: string;
  /** Auto-busca quando o CNPJ ficar completo (14 dígitos). Padrão: true */
  autoLookup?: boolean;
  /** Texto exibido quando ainda não há verificação */
  hint?: string;
}

/**
 * Input de CNPJ com auto-preenchimento via ReceitaWS.
 * Quando o usuário termina de digitar (ou clica em Verificar), busca dados na
 * Receita Federal e dispara `onDataFetched` com os campos prontos para o pai
 * popular o formulário.
 */
export function CnpjAutoFillInput({
  value,
  onChange,
  onDataFetched,
  disabled,
  className,
  autoLookup = true,
  hint = "Verifique o CNPJ na Receita Federal",
}: CnpjAutoFillInputProps) {
  const { verify, loading, result, setResult } = useCnpjVerification();
  const [valid, setValid] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [autoLookedUp, setAutoLookedUp] = useState<string | null>(null);

  const runLookup = async (force = false) => {
    const r = await verify(value, { force });
    if (!r || r.status === "erro_consulta") return;
    const enderecoStr = r.endereco?.logradouro
      ? `${r.endereco.logradouro}${r.endereco.numero ? ", " + r.endereco.numero : ""}${r.endereco.bairro ? " - " + r.endereco.bairro : ""}`
      : undefined;
    onDataFetched?.(
      {
        nome: r.nome,
        fantasia: r.fantasia,
        email: r.email,
        telefone: r.telefone,
        endereco: enderecoStr,
        logradouro: r.endereco?.logradouro,
        numero: r.endereco?.numero,
        bairro: r.endereco?.bairro,
        cidade: r.endereco?.municipio,
        uf: r.endereco?.uf,
        cep: r.endereco?.cep,
      },
      r,
    );
  };

  const handleChange = (val: string, isValid: boolean) => {
    onChange(val);
    setValid(isValid);
    if (!isValid) {
      setResult(null);
      setAutoLookedUp(null);
      return;
    }
    if (autoLookup && isValid && autoLookedUp !== val) {
      setAutoLookedUp(val);
      runLookup(false);
    }
  };

  return (
    <div className={className}>
      <DocumentInput
        documentType="cnpj"
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
      {valid && (
        <div className="flex items-center justify-between gap-2 pt-1.5">
          {result ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="hover:opacity-80 transition-opacity"
              title="Ver detalhes da Receita Federal"
            >
              <CnpjStatusBadge status={result.status} />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{hint}</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={loading || disabled}
            onClick={() => runLookup(true)}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Search className="h-3 w-3 mr-1" />
            )}
            {result ? "Atualizar" : "Buscar dados"}
          </Button>
        </div>
      )}
      <CnpjDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        result={result}
        cnpj={value}
      />
    </div>
  );
}
