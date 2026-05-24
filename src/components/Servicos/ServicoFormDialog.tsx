import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoriaConfig: Record<string, { label: string }> = {
  seguranca: { label: "Segurança" },
  manutencao: { label: "Manutenção" },
  higiene: { label: "Higiene" },
  infraestrutura: { label: "Infraestrutura" },
  veiculos: { label: "Veículos" },
  outros: { label: "Outros" },
};

interface Unidade {
  id: string;
  nome: string;
}

interface Especificacao {
  id: string;
  nome: string;
  categoria: string;
  validade_padrao_meses: number;
  dias_alerta_padrao: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface FormData {
  unidade_id: string;
  especificacao_id: string;
  itens_detalhados: string;
  quantidade: number;
  localizacao_fisica: string;
  data_ultima_troca: string;
  validade_meses: number;
  dias_antecedencia_alerta: number;
  prioridade: string;
  responsavel_id: string;
  valor_estimado: string;
  fornecedor_preferencial_id: string;
  observacoes: string;
}

interface ServicoFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingServico: { id: string } | null;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  especificacoes: Especificacao[];
  unidades: Unidade[];
  profiles: Profile[];
  fornecedores: Fornecedor[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onReset: () => void;
  onEspecificacaoChange: (id: string) => void;
}

export function ServicoFormDialog({
  isOpen,
  onOpenChange,
  editingServico,
  formData,
  onFormDataChange,
  especificacoes,
  unidades,
  profiles,
  fornecedores,
  isSubmitting,
  onSubmit,
  onReset,
  onEspecificacaoChange,
}: ServicoFormDialogProps) {
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    onFormDataChange({ ...formData, [key]: value });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingServico ? "Editar Serviço" : "Novo Serviço Periódico"}
          </DialogTitle>
          <DialogDescription>
            Cadastre um serviço com prazo de validade para acompanhamento automático.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Select
                value={formData.unidade_id}
                onValueChange={(v) => setField("unidade_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="especificacao">Tipo de Serviço *</Label>
              <Select
                value={formData.especificacao_id}
                onValueChange={onEspecificacaoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {especificacoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({categoriaConfig[e.categoria]?.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itens">Itens/Detalhamento</Label>
            <Input
              id="itens"
              value={formData.itens_detalhados}
              onChange={(e) => setField("itens_detalhados", e.target.value)}
              placeholder="Ex: 2 Extintores CO2 6kg + 1 PQS 4kg"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min={1}
                value={formData.quantidade}
                onChange={(e) => setField("quantidade", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao_fisica}
                onChange={(e) => setField("localizacao_fisica", e.target.value)}
                placeholder="Ex: 2º andar, corredor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(v) => setField("prioridade", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_ultima_troca">Data Última Execução *</Label>
              <Input
                id="data_ultima_troca"
                type="date"
                value={formData.data_ultima_troca}
                onChange={(e) => setField("data_ultima_troca", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validade_meses">Validade (meses)</Label>
              <Input
                id="validade_meses"
                type="number"
                min={1}
                value={formData.validade_meses}
                onChange={(e) => setField("validade_meses", parseInt(e.target.value) || 12)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dias_alerta">Dias Antecedência Alerta</Label>
              <Input
                id="dias_alerta"
                type="number"
                min={1}
                value={formData.dias_antecedencia_alerta}
                onChange={(e) => setField("dias_antecedencia_alerta", parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(v) => setField("responsavel_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor Preferencial</Label>
              <Select
                value={formData.fornecedor_preferencial_id}
                onValueChange={(v) => setField("fornecedor_preferencial_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor Estimado (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={formData.valor_estimado}
              onChange={(e) => setField("valor_estimado", e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onReset();
            }}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : editingServico ? "Salvar Alterações" : "Cadastrar Serviço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
