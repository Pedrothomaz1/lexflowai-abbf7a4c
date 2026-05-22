import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PricingRow {
  plano: string;
  nome_exibicao: string;
  preco_mensal_centavos: number;
  ativo: boolean;
}

export default function PrecosTab() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { reais: string; ativo: boolean; nome: string }>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_pricing")
      .select("*")
      .order("preco_mensal_centavos", { ascending: true });
    if (error) toast.error("Erro: " + error.message);
    else {
      setRows((data as PricingRow[]) || []);
      const ev: typeof editValues = {};
      (data as PricingRow[] || []).forEach((r) => {
        ev[r.plano] = {
          reais: (r.preco_mensal_centavos / 100).toFixed(2).replace(".", ","),
          ativo: r.ativo,
          nome: r.nome_exibicao,
        };
      });
      setEditValues(ev);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (plano: string) => {
    const v = editValues[plano];
    if (!v) return;
    const centavos = Math.round(Number(v.reais.replace(",", ".")) * 100);
    if (Number.isNaN(centavos) || centavos < 0) {
      toast.error("Preço inválido");
      return;
    }
    setSavingId(plano);
    const { error } = await supabase
      .from("plan_pricing")
      .update({
        preco_mensal_centavos: centavos,
        ativo: v.ativo,
        nome_exibicao: v.nome.trim() || plano,
      })
      .eq("plano", plano)
      .select()
      .maybeSingle();
    setSavingId(null);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Preço atualizado — MRR recalculado");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Preços dos planos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Edite o preço mensal de cada plano. O MRR no dashboard recalcula automaticamente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => {
          const v = editValues[r.plano] || { reais: "0", ativo: true, nome: r.nome_exibicao };
          const isDirty =
            v.ativo !== r.ativo ||
            v.nome !== r.nome_exibicao ||
            Math.round(Number(v.reais.replace(",", ".")) * 100) !== r.preco_mensal_centavos;
          return (
            <div
              key={r.plano}
              className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_auto] gap-3 items-end border rounded-lg p-4 bg-card"
            >
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Plano (chave)
                </Label>
                <p className="font-mono text-sm">{r.plano}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome de exibição</Label>
                <Input
                  value={v.nome}
                  onChange={(e) =>
                    setEditValues({ ...editValues, [r.plano]: { ...v, nome: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço mensal (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={v.reais}
                  onChange={(e) =>
                    setEditValues({ ...editValues, [r.plano]: { ...v, reais: e.target.value } })
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={v.ativo}
                    onCheckedChange={(checked) =>
                      setEditValues({ ...editValues, [r.plano]: { ...v, ativo: checked } })
                    }
                  />
                  <span className="text-xs text-muted-foreground">{v.ativo ? "Ativo" : "Inativo"}</span>
                </div>
                <Button size="sm" disabled={!isDirty || savingId === r.plano} onClick={() => save(r.plano)}>
                  {savingId === r.plano ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
