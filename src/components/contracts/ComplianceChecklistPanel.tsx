import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ListChecks } from "lucide-react";

interface Props {
  contratoId: string;
  onChanged?: () => void;
}

type Item = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  obrigatorio: boolean;
  status: string;
  justificativa: string | null;
  ccs_id: string | null;
};

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "atendido", label: "Atendido" },
  { value: "excecao", label: "Exceção" },
  { value: "nao_aplicavel", label: "Não aplicável" },
];

export function ComplianceChecklistPanel({ contratoId, onChanged }: Props) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data: itens, error: e1 } = await supabase
      .from("compliance_items")
      .select("id,codigo,titulo,descricao,obrigatorio,ordem,checklist_id,compliance_checklists!inner(organization_id)")
      .eq("compliance_checklists.organization_id", organization.id)
      .order("ordem", { ascending: true });
    if (e1) {
      toast({ title: "Erro ao carregar checklist", description: e1.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: status, error: e2 } = await supabase
      .from("contract_compliance_status")
      .select("id,item_id,status,justificativa")
      .eq("contrato_id", contratoId);
    if (e2) {
      toast({ title: "Erro ao carregar status", description: e2.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map = new Map((status ?? []).map((s) => [s.item_id, s]));
    setItems(
      (itens ?? []).map((i) => {
        const s = map.get(i.id);
        return {
          id: i.id,
          codigo: i.codigo,
          titulo: i.titulo,
          descricao: i.descricao,
          obrigatorio: i.obrigatorio,
          status: s?.status ?? "pendente",
          justificativa: s?.justificativa ?? "",
          ccs_id: s?.id ?? null,
        };
      }),
    );
    setLoading(false);
  }, [contratoId, organization?.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateItem = async (item: Item, patch: Partial<Item>) => {
    if (!organization?.id) return;
    const next = { ...item, ...patch };
    setItems((prev) => prev.map((p) => (p.id === item.id ? next : p)));
    if (item.ccs_id) {
      const { error } = await supabase
        .from("contract_compliance_status")
        .update({ status: next.status, justificativa: next.justificativa, verificado_em: new Date().toISOString() })
        .eq("id", item.ccs_id)
        .select()
        .maybeSingle();
      if (error) toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      else onChanged?.();
    } else {
      const { data, error } = await supabase
        .from("contract_compliance_status")
        .insert({
          organization_id: organization.id,
          contrato_id: contratoId,
          item_id: item.id,
          status: next.status,
          justificativa: next.justificativa,
        })
        .select("id")
        .maybeSingle();
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else {
        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...next, ccs_id: data?.id ?? null } : p)));
        onChanged?.();
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando checklist…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" /> Checklist de compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum item de checklist cadastrado. Configure templates em <strong>Compliance &gt; Checklists</strong>.
          </p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{it.codigo}</span>
                    {it.titulo}
                    {it.obrigatorio && <Badge variant="destructive">Obrigatório</Badge>}
                  </p>
                  {it.descricao && <p className="text-sm text-muted-foreground mt-1">{it.descricao}</p>}
                </div>
                <Select value={it.status} onValueChange={(v) => void updateItem(it, { status: v })}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(it.status === "excecao" || it.status === "nao_aplicavel") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Justificativa</Label>
                  <Textarea
                    value={it.justificativa ?? ""}
                    onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, justificativa: e.target.value } : p)))}
                    onBlur={() => void updateItem(it, { justificativa: it.justificativa })}
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
