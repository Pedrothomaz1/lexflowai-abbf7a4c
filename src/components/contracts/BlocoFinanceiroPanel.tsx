import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Banknote } from "lucide-react";

interface Props {
  contratoId: string;
  onSaved?: () => void;
}

type Financeiro = {
  forma_pagamento: string;
  condicao_pagamento: string;
  qtd_parcelas: string;
  valor_parcela: string;
  dia_vencimento: string;
  indice_reajuste: string;
  periodicidade_reajuste: string;
  multa_atraso_pct: string;
  juros_mora_pct: string;
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
};

const EMPTY: Financeiro = {
  forma_pagamento: "",
  condicao_pagamento: "",
  qtd_parcelas: "",
  valor_parcela: "",
  dia_vencimento: "",
  indice_reajuste: "",
  periodicidade_reajuste: "",
  multa_atraso_pct: "",
  juros_mora_pct: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
};

export function BlocoFinanceiroPanel({ contratoId, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Financeiro>(EMPTY);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c, error } = await supabase
        .from("contratos")
        .select(
          "forma_pagamento,condicao_pagamento,qtd_parcelas,valor_parcela,dia_vencimento,indice_reajuste,periodicidade_reajuste,multa_atraso_pct,juros_mora_pct,dados_bancarios",
        )
        .eq("id", contratoId)
        .maybeSingle();
      if (error) {
        toast({ title: "Erro ao carregar dados financeiros", description: error.message, variant: "destructive" });
      } else if (c) {
        const db = (c.dados_bancarios as Record<string, string> | null) ?? {};
        setData({
          forma_pagamento: c.forma_pagamento ?? "",
          condicao_pagamento: c.condicao_pagamento ?? "",
          qtd_parcelas: c.qtd_parcelas?.toString() ?? "",
          valor_parcela: c.valor_parcela?.toString() ?? "",
          dia_vencimento: c.dia_vencimento?.toString() ?? "",
          indice_reajuste: c.indice_reajuste ?? "",
          periodicidade_reajuste: c.periodicidade_reajuste ?? "",
          multa_atraso_pct: c.multa_atraso_pct?.toString() ?? "",
          juros_mora_pct: c.juros_mora_pct?.toString() ?? "",
          banco: db.banco ?? "",
          agencia: db.agencia ?? "",
          conta: db.conta ?? "",
          pix: db.pix ?? "",
        });
      }
      setLoading(false);
    })();
  }, [contratoId, toast]);

  const set = (k: keyof Financeiro) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      forma_pagamento: data.forma_pagamento || null,
      condicao_pagamento: data.condicao_pagamento || null,
      qtd_parcelas: data.qtd_parcelas ? Number(data.qtd_parcelas) : null,
      valor_parcela: data.valor_parcela ? Number(data.valor_parcela) : null,
      dia_vencimento: data.dia_vencimento ? Number(data.dia_vencimento) : null,
      indice_reajuste: data.indice_reajuste || null,
      periodicidade_reajuste: data.periodicidade_reajuste || null,
      multa_atraso_pct: data.multa_atraso_pct ? Number(data.multa_atraso_pct) : null,
      juros_mora_pct: data.juros_mora_pct ? Number(data.juros_mora_pct) : null,
      dados_bancarios: {
        banco: data.banco || null,
        agencia: data.agencia || null,
        conta: data.conta || null,
        pix: data.pix || null,
      },
    };
    const { error } = await supabase.from("contratos").update(payload).eq("id", contratoId).select().maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados financeiros salvos" });
      onSaved?.();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" /> Bloco Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Forma de pagamento" value={data.forma_pagamento} onChange={set("forma_pagamento")} placeholder="boleto, pix, transferência…" />
          <Field label="Condição de pagamento" value={data.condicao_pagamento} onChange={set("condicao_pagamento")} placeholder="à vista, 30/60/90…" />
          <Field label="Qtd. parcelas" value={data.qtd_parcelas} onChange={set("qtd_parcelas")} type="number" />
          <Field label="Valor da parcela (R$)" value={data.valor_parcela} onChange={set("valor_parcela")} type="number" />
          <Field label="Dia de vencimento" value={data.dia_vencimento} onChange={set("dia_vencimento")} type="number" placeholder="1-31" />
          <Field label="Índice de reajuste" value={data.indice_reajuste} onChange={set("indice_reajuste")} placeholder="IPCA, IGPM, INPC…" />
          <Field label="Periodicidade de reajuste" value={data.periodicidade_reajuste} onChange={set("periodicidade_reajuste")} placeholder="anual, semestral…" />
          <Field label="Multa por atraso (%)" value={data.multa_atraso_pct} onChange={set("multa_atraso_pct")} type="number" />
          <Field label="Juros de mora (%)" value={data.juros_mora_pct} onChange={set("juros_mora_pct")} type="number" />
        </div>

        <div className="pt-2">
          <h4 className="text-sm font-semibold mb-2">Dados bancários</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Banco" value={data.banco} onChange={set("banco")} />
            <Field label="Agência" value={data.agencia} onChange={set("agencia")} />
            <Field label="Conta" value={data.conta} onChange={set("conta")} />
            <Field label="Chave PIX" value={data.pix} onChange={set("pix")} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={onChange} type={type} placeholder={placeholder} />
    </div>
  );
}
