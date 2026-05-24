import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Database } from "lucide-react";

interface RetentionPolicy {
  id: string;
  nome: string;
  entidade: string;
  periodo_retencao_meses: number;
  acao_pos_retencao: string;
  base_legal: string | null;
  descricao: string | null;
  is_active: boolean;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
}

const BASE_LEGAL_OPTIONS = [
  { value: "consentimento", label: "Consentimento do Titular" },
  { value: "contrato", label: "Execução de Contrato" },
  { value: "obrigacao_legal", label: "Obrigação Legal" },
  { value: "interesse_legitimo", label: "Interesse Legítimo" },
  { value: "protecao_credito", label: "Proteção ao Crédito" },
];

const ENTITIES = [
  { value: "contratos", label: "Contratos" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "profiles", label: "Usuários" },
  { value: "contract_attachments", label: "Anexos" },
];

interface NewPolicyForm {
  nome: string;
  entidade: string;
  periodo_retencao_meses: number;
  acao_pos_retencao: string;
  base_legal: string;
  descricao: string;
}

interface RetentionPoliciesSectionProps {
  policies: RetentionPolicy[];
  isCreatingPolicy: boolean;
  onOpenChange: (open: boolean) => void;
  newPolicy: NewPolicyForm;
  onNewPolicyChange: (policy: NewPolicyForm) => void;
  onCreatePolicy: () => void;
  onTogglePolicy: (policy: RetentionPolicy) => void;
}

export function RetentionPoliciesSection({
  policies,
  isCreatingPolicy,
  onOpenChange,
  newPolicy,
  onNewPolicyChange,
  onCreatePolicy,
  onTogglePolicy,
}: RetentionPoliciesSectionProps) {
  const setField = <K extends keyof NewPolicyForm>(key: K, value: NewPolicyForm[K]) =>
    onNewPolicyChange({ ...newPolicy, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreatingPolicy} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Política
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Política de Retenção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Política</Label>
                <Input
                  value={newPolicy.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  placeholder="Ex: Retenção de Contratos"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Entidade</Label>
                  <Select value={newPolicy.entidade} onValueChange={(v) => setField("entidade", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITIES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período (meses)</Label>
                  <Input
                    type="number"
                    value={newPolicy.periodo_retencao_meses}
                    onChange={(e) => setField("periodo_retencao_meses", parseInt(e.target.value) || 60)}
                    min={1}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ação Pós-Retenção</Label>
                  <Select value={newPolicy.acao_pos_retencao} onValueChange={(v) => setField("acao_pos_retencao", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anonimizar">Anonimizar</SelectItem>
                      <SelectItem value="excluir">Excluir</SelectItem>
                      <SelectItem value="arquivar">Arquivar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base Legal</Label>
                  <Select value={newPolicy.base_legal} onValueChange={(v) => setField("base_legal", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BASE_LEGAL_OPTIONS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={newPolicy.descricao}
                  onChange={(e) => setField("descricao", e.target.value)}
                  placeholder="Justificativa da política"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={onCreatePolicy} disabled={!newPolicy.nome}>Criar Política</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {policies.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Nenhuma política configurada"
          description="Configure políticas de retenção de dados"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {policies.map((policy) => (
            <Card key={policy.id} className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{policy.nome}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {ENTITIES.find((e) => e.value === policy.entidade)?.label || policy.entidade}
                    </CardDescription>
                  </div>
                  <Switch checked={policy.is_active} onCheckedChange={() => onTogglePolicy(policy)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período:</span>
                    <span>{policy.periodo_retencao_meses} meses</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ação:</span>
                    <Badge variant="outline" className="capitalize">{policy.acao_pos_retencao}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Legal:</span>
                    <span className="text-xs">
                      {BASE_LEGAL_OPTIONS.find((b) => b.value === policy.base_legal)?.label || "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
