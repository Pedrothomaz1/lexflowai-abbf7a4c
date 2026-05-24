import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CnpjStatusBadge } from "./CnpjStatusBadge";
import type { CnpjVerifyResult } from "@/hooks/useCnpjVerification";
import { Building2, MapPin, Calendar, Briefcase, Mail, Phone, Clock } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: CnpjVerifyResult | null;
  cnpj?: string;
  fornecedorId?: string;
}

function fmtCnpj(v?: string) {
  const c = (v || "").replace(/\D/g, "");
  if (c.length !== 14) return v || "";
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function CnpjDetailsDialog({ open, onOpenChange, result, cnpj, fornecedorId }: Props) {
  const { logAction } = useAuditLog();
  const loggedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !result) return;
    const cleaned = (cnpj || "").replace(/\D/g, "");
    const key = `${cleaned}:${result.verificado_em ?? ""}:${result.cached ? "c" : "f"}`;
    if (loggedKeyRef.current === key) return;
    loggedKeyRef.current = key;

    const camposRetornados = Object.entries({
      situacao: result.situacao,
      situacao_data: result.situacao_data,
      nome: result.nome,
      fantasia: result.fantasia,
      atividade_principal: result.atividade_principal?.text,
      logradouro: result.endereco?.logradouro,
      numero: result.endereco?.numero,
      bairro: result.endereco?.bairro,
      municipio: result.endereco?.municipio,
      uf: result.endereco?.uf,
      cep: result.endereco?.cep,
      email: result.email,
      telefone: result.telefone,
    })
      .filter(([, v]) => v != null && v !== "")
      .map(([k]) => k);

    logAction({
      acao: "view",
      entidade: "fornecedor",
      entidade_id: fornecedorId,
      metadata: {
        contexto: "cnpj_details_modal",
        cnpj: cleaned,
        status: result.status,
        situacao: result.situacao,
        cached: !!result.cached,
        verificado_em: result.verificado_em,
        campos_retornados: camposRetornados,
      },
    });
  }, [open, result, cnpj, fornecedorId, logAction]);

  if (!result) return null;
  const e = result.endereco || {};
  const enderecoLinha = [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.bairro,
    [e.municipio, e.uf].filter(Boolean).join("/"),
    e.cep ? `CEP ${e.cep}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Receita Federal
          </DialogTitle>
          <DialogDescription>
            Consulta via ReceitaWS para o CNPJ {fmtCnpj(cnpj)}
            {result.cached && " (resultado em cache)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-sm text-muted-foreground">Situação cadastral</p>
              <p className="font-semibold">{result.situacao || "—"}</p>
            </div>
            <CnpjStatusBadge status={result.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={Building2} label="Razão Social" value={result.nome} />
            <Field icon={Building2} label="Nome Fantasia" value={result.fantasia} />
            <Field
              icon={Calendar}
              label="Data da situação"
              value={result.situacao_data || "—"}
            />
            <Field
              icon={Clock}
              label="Verificado em"
              value={fmtDateTime(result.verificado_em)}
            />
            <Field
              icon={Briefcase}
              label="Atividade principal"
              value={
                result.atividade_principal?.text
                  ? `${result.atividade_principal.code ?? ""} ${result.atividade_principal.text}`.trim()
                  : "—"
              }
              full
            />
            <Field icon={MapPin} label="Endereço" value={enderecoLinha || "—"} full />
            <Field icon={Mail} label="E-mail" value={result.email} />
            <Field icon={Phone} label="Telefone" value={result.telefone} />
          </div>

          {result.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {result.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  full,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}
