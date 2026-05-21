import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, TIPO_CONTRATO_OPTIONS } from "@/lib/lexflow-constants";
import { Plus } from "lucide-react";

interface Props {
  trigger?: React.ReactNode;
}

const initialState = {
  titulo: "",
  descricao: "",
  tipo_contrato: "prestacao_servicos",
  departamento: AREAS[0],
  urgencia: "media",
  data_necessidade: "",
  valor_estimado: "",
  fornecedor_sugerido: "",
  justificativa: "",
};

/**
 * Criação interna de requisição (CTA "Nova requisição" no app).
 * Distinta da página pública RequisicaoPublica.tsx — pré-preenche solicitante
 * com o usuário autenticado e dispara fluxo via RLS.
 */
export function NovaRequisicaoDialog({ trigger }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim()) e.titulo = "Informe o objeto da contratação";
    if (!form.descricao.trim() || form.descricao.length < 10)
      e.descricao = "Descrição mínima de 10 caracteres";
    if (!form.departamento) e.departamento = "Selecione a área";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();

      const { data: orgData } = await supabase.rpc("current_user_org");

      const payload = {
        organization_id: orgData as unknown as string,
        solicitante_nome: profile?.full_name || user.email || "Usuário",
        solicitante_email: profile?.email || user.email || "",
        solicitante_telefone: profile?.phone || null,
        departamento: form.departamento,
        tipo_contrato: form.tipo_contrato as never,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        justificativa: form.justificativa.trim() || null,
        urgencia: form.urgencia,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        data_necessidade: form.data_necessidade || null,
        fornecedor_sugerido: form.fornecedor_sugerido.trim() || null,
        status: "pendente",
      };

      const { error } = await supabase.from("contract_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      toast({ title: "Requisição criada", description: "Encaminhada para triagem." });
      setOpen(false);
      setForm(initialState);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Falha ao criar", description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova requisição
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova requisição contratual</DialogTitle>
          <DialogDescription>
            Padronize a entrada para o jurídico priorizar e iniciar a elaboração.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="titulo">Objeto da contratação *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Contratação de software de monitoramento"
            />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Área solicitante *</Label>
            <Select
              value={form.departamento}
              onValueChange={(v) => setForm({ ...form, departamento: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de demanda *</Label>
            <Select
              value={form.tipo_contrato}
              onValueChange={(v) => setForm({ ...form, tipo_contrato: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_CONTRATO_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={form.urgencia} onValueChange={(v) => setForm({ ...form, urgencia: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="data">Data desejada</Label>
            <Input
              id="data"
              type="date"
              value={form.data_necessidade}
              onChange={(e) => setForm({ ...form, data_necessidade: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valor">Valor estimado (R$)</Label>
            <Input
              id="valor"
              type="number"
              min={0}
              step="0.01"
              value={form.valor_estimado}
              onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="fornecedor">Contraparte / fornecedor sugerido</Label>
            <Input
              id="fornecedor"
              value={form.fornecedor_sugerido}
              onChange={(e) => setForm({ ...form, fornecedor_sugerido: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="min-h-[90px]"
              placeholder="O que precisa ser contratado e contexto operacional"
            />
            {errors.descricao && <p className="text-xs text-destructive">{errors.descricao}</p>}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="just">Justificativa</Label>
            <Textarea
              id="just"
              value={form.justificativa}
              onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
              className="min-h-[70px]"
              placeholder="Por que esta contratação é necessária agora"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => validate() && mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Enviando..." : "Enviar para triagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
