import { useState } from "react";
import { X, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardFilters } from "@/hooks/useDashboardFilters";

interface Props {
  filters: DashboardFilters;
  activeCount: number;
  onChange: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  onReset: () => void;
}

const PERIODOS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "ytd", label: "Ano até hoje" },
];

const TIPOS = [
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "fornecimento", label: "Fornecimento" },
  { value: "locacao", label: "Locação" },
  { value: "confidencialidade", label: "Confidencialidade" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

const STATUS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "em_aprovacao", label: "Em aprovação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "assinado", label: "Assinado" },
  { value: "vigente", label: "Vigente" },
  { value: "encerrado", label: "Encerrado" },
  { value: "cancelado", label: "Cancelado" },
];

export function DashboardFiltersBar({ filters, activeCount, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const toggleArray = (key: "tipo" | "status" | "area", value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    onChange(key, next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.periodo} onValueChange={v => onChange("periodo", v)}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODOS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{activeCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => toggleArray("tipo", t.value)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      filters.tipo.includes(t.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STATUS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleArray("status", s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      filters.status.includes(s.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {filters.tipo.map(t => (
        <Badge key={t} variant="secondary" className="gap-1">
          {TIPOS.find(x => x.value === t)?.label || t}
          <button onClick={() => toggleArray("tipo", t)}><X className="h-3 w-3" /></button>
        </Badge>
      ))}
      {filters.status.map(s => (
        <Badge key={s} variant="secondary" className="gap-1">
          {STATUS.find(x => x.value === s)?.label || s}
          <button onClick={() => toggleArray("status", s)}><X className="h-3 w-3" /></button>
        </Badge>
      ))}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
