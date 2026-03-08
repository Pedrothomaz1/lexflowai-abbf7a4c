import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnimatedCard,
  AnimatedCardContent,
  AnimatedCardHeader,
} from "@/components/ui/animated-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { CheckCircle2 } from "lucide-react";

interface NovaAprovacao {
  status: string;
  comentario: string;
}

interface ContractApprovalCardProps {
  canApprove: boolean;
  userAlreadyApproved: boolean;
  novaAprovacao: NovaAprovacao;
  onNovaAprovacaoChange: (value: NovaAprovacao) => void;
  onAddAprovacao: () => void;
}

export function ContractApprovalCard({
  canApprove,
  userAlreadyApproved,
  novaAprovacao,
  onNovaAprovacaoChange,
  onAddAprovacao,
}: ContractApprovalCardProps) {
  if (canApprove && !userAlreadyApproved) {
    return (
      <AnimatedCard>
        <AnimatedCardHeader>
          <h3 className="text-lg font-semibold">Nova Aprovação</h3>
        </AnimatedCardHeader>
        <AnimatedCardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select
              value={novaAprovacao.status}
              onValueChange={(value) => onNovaAprovacaoChange({ ...novaAprovacao, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Comentário</Label>
            <Textarea
              value={novaAprovacao.comentario}
              onChange={(e) => onNovaAprovacaoChange({ ...novaAprovacao, comentario: e.target.value })}
              rows={3}
              placeholder="Adicione um comentário..."
              className="resize-none"
            />
          </div>
          <AnimatedButton onClick={onAddAprovacao} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Registrar Aprovação
          </AnimatedButton>
        </AnimatedCardContent>
      </AnimatedCard>
    );
  }

  if (canApprove && userAlreadyApproved) {
    return (
      <AnimatedCard className="border-primary/30 bg-primary/5">
        <AnimatedCardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">Aprovação Registrada</h3>
          </div>
        </AnimatedCardHeader>
        <AnimatedCardContent>
          <p className="text-sm text-muted-foreground">
            Você já registrou sua aprovação para este contrato. Cada usuário pode aprovar apenas uma vez.
          </p>
        </AnimatedCardContent>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard className="border-muted">
      <AnimatedCardHeader>
        <h3 className="text-lg font-semibold text-muted-foreground">Aprovação</h3>
      </AnimatedCardHeader>
      <AnimatedCardContent>
        <p className="text-sm text-muted-foreground">
          Apenas usuários com perfil de <strong>Consultoria Jurídica</strong> ou <strong>Administrador</strong> podem
          aprovar contratos.
        </p>
      </AnimatedCardContent>
    </AnimatedCard>
  );
}
