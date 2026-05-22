import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FormField = {
  key: string;
  label: string;
  tipo: "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "email";
  obrigatorio?: boolean;
  opcoes?: string[];
  ajuda?: string;
};

interface Props {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

export const DynamicFormRenderer = ({
  fields,
  initialValues = {},
  onSubmit,
  submitting,
  submitLabel = "Enviar",
}: Props) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setVal = (key: string, v: any) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.obrigatorio && (v === undefined || v === null || v === "" || v === false)) {
        errs[f.key] = "Campo obrigatório";
      }
      if (f.tipo === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        errs[f.key] = "E-mail inválido";
      }
      if (typeof v === "string" && v.length > 5000) {
        errs[f.key] = "Máximo 5000 caracteres";
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => {
        const err = errors[f.key];
        const v = values[f.key] ?? "";
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>
              {f.label}
              {f.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
            {f.tipo === "textarea" ? (
              <Textarea
                id={f.key}
                value={v}
                onChange={(e) => setVal(f.key, e.target.value)}
                maxLength={5000}
                rows={4}
              />
            ) : f.tipo === "select" ? (
              <Select value={v || undefined} onValueChange={(val) => setVal(f.key, val)}>
                <SelectTrigger id={f.key}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(f.opcoes || []).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.tipo === "checkbox" ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={f.key}
                  checked={!!values[f.key]}
                  onCheckedChange={(c) => setVal(f.key, !!c)}
                />
                {f.ajuda && <span className="text-sm text-muted-foreground">{f.ajuda}</span>}
              </div>
            ) : (
              <Input
                id={f.key}
                type={
                  f.tipo === "number" ? "number" :
                  f.tipo === "date" ? "date" :
                  f.tipo === "email" ? "email" : "text"
                }
                value={v}
                onChange={(e) => setVal(f.key, e.target.value)}
                maxLength={500}
              />
            )}
            {f.ajuda && f.tipo !== "checkbox" && (
              <p className="text-xs text-muted-foreground">{f.ajuda}</p>
            )}
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
        );
      })}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Enviando..." : submitLabel}
      </Button>
    </form>
  );
};
