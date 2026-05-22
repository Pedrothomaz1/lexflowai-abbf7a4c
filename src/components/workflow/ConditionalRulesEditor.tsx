import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GitFork, AlertTriangle } from "lucide-react";

export type ConditionalRule = {
  campo: "valor_total" | "tipo_contrato" | "area";
  op: "gt" | "gte" | "lt" | "lte" | "eq" | "in";
  valor: string;
  jump_to_ordem: number | null;
};

const CAMPOS = [
  { v: "valor_total", l: "Valor total (R$)" },
  { v: "tipo_contrato", l: "Tipo de contrato" },
  { v: "area", l: "Área responsável" },
];

const OPS_NUM = [
  { v: "gt", l: ">" }, { v: "gte", l: "≥" },
  { v: "lt", l: "<" }, { v: "lte", l: "≤" },
  { v: "eq", l: "=" },
];
const OPS_STR = [
  { v: "eq", l: "igual a" },
  { v: "in", l: "está em (separe por vírgula)" },
];

export type StagesRulesMap = Record<number, ConditionalRule[]>;

/**
 * Valida regras de uma etapa.
 * - Valor ausente / numérico inválido
 * - jump_to_ordem ausente, igual à própria etapa ou fora do intervalo
 * - Regras duplicadas
 * - Loops entre etapas (DFS sobre o grafo de saltos)
 */
export function validateRulesForStage(
  rules: ConditionalRule[],
  etapaAtualOrdem: number,
  totalEtapas: number,
  allStagesRules?: StagesRulesMap,
): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  rules.forEach((r, i) => {
    const idx = i + 1;
    if (!r.valor || !String(r.valor).trim()) {
      errs.push(`Regra ${idx}: informe um valor.`);
    }
    if (r.campo === "valor_total" && r.valor && isNaN(Number(r.valor))) {
      errs.push(`Regra ${idx}: valor numérico inválido.`);
    }
    if (!r.jump_to_ordem) {
      errs.push(`Regra ${idx}: selecione a etapa de destino.`);
    } else {
      if (r.jump_to_ordem === etapaAtualOrdem) {
        errs.push(`Regra ${idx}: destino não pode ser a própria etapa.`);
      }
      if (r.jump_to_ordem < 1 || r.jump_to_ordem > totalEtapas) {
        errs.push(`Regra ${idx}: etapa de destino fora do intervalo.`);
      }
      if (allStagesRules) {
        const visited = new Set<number>([etapaAtualOrdem]);
        const stack: number[] = [r.jump_to_ordem];
        while (stack.length) {
          const cur = stack.pop()!;
          if (visited.has(cur)) {
            errs.push(`Regra ${idx}: cria loop (etapa ${cur} já visitada).`);
            break;
          }
          visited.add(cur);
          for (const nr of allStagesRules[cur] ?? []) {
            if (nr.jump_to_ordem) stack.push(nr.jump_to_ordem);
          }
        }
      }
    }
    const key = `${r.campo}|${r.op}|${String(r.valor).trim()}`;
    if (seen.has(key)) errs.push(`Regra ${idx}: duplicada.`);
    seen.add(key);
  });
  return errs;
}

type Props = {
  regras: { rules?: ConditionalRule[] } | null | undefined;
  totalEtapas: number;
  etapaAtualOrdem: number;
  allStagesRules?: StagesRulesMap;
  onChange: (regras: { rules: ConditionalRule[] }) => void;
};

export function ConditionalRulesEditor({
  regras, totalEtapas, etapaAtualOrdem, allStagesRules, onChange,
}: Props) {
  const rules: ConditionalRule[] = regras?.rules ?? [];

  const errors = useMemo(
    () => validateRulesForStage(rules, etapaAtualOrdem, totalEtapas, allStagesRules),
    [rules, etapaAtualOrdem, totalEtapas, allStagesRules],
  );

  const update = (idx: number, patch: Partial<ConditionalRule>) => {
    const next = rules.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ rules: next });
  };
  const add = () => {
    onChange({
      rules: [
        ...rules,
        { campo: "valor_total", op: "gt", valor: "", jump_to_ordem: null },
      ],
    });
  };
  const remove = (idx: number) => {
    onChange({ rules: rules.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" />
          Regras condicionais ({rules.length})
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sem regras. O fluxo segue para a etapa seguinte por padrão.
        </p>
      )}

      {rules.map((r, idx) => {
        const opsList = r.campo === "valor_total" ? OPS_NUM : OPS_STR;
        return (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-end bg-background rounded p-2"
          >
            <div>
              <Label className="text-[10px] uppercase">Se</Label>
              <Select
                value={r.campo}
                onValueChange={(v: any) => update(idx, { campo: v, op: v === "valor_total" ? "gt" : "eq" })}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPOS.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase">Op.</Label>
              <Select value={r.op} onValueChange={(v: any) => update(idx, { op: v })}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {opsList.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase">Valor</Label>
              <Input
                className="h-8"
                value={r.valor}
                placeholder={r.campo === "valor_total" ? "100000" : "ex: prestacao_servicos"}
                onChange={(e) => update(idx, { valor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Pular p/ etapa</Label>
              <Select
                value={r.jump_to_ordem?.toString() ?? ""}
                onValueChange={(v) => update(idx, { jump_to_ordem: Number(v) })}
              >
                <SelectTrigger className="h-8"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalEtapas }, (_, i) => i + 1)
                    .filter(n => n !== etapaAtualOrdem)
                    .map(n => (
                      <SelectItem key={n} value={n.toString()}>Etapa {n}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => remove(idx)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        );
      })}

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {e}
            </p>
          ))}
        </div>
      )}

      {rules.length > 0 && errors.length === 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">i</Badge>
          A primeira regra que casar define o próximo estágio.
        </p>
      )}
    </div>
  );
}
