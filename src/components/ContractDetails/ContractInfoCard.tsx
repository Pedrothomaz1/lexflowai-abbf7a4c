import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Calendar,
  Clock,
  Tag,
} from "lucide-react";
import {
  AnimatedCard,
  AnimatedCardContent,
  AnimatedCardHeader,
} from "@/components/ui/animated-card";
import { FileText } from "lucide-react";

interface Contrato {
  valor_total: number | null;
  moeda: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_assinatura: string | null;
  updated_at: string;
  tags: string[] | null;
  descricao: string | null;
  observacoes: string | null;
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
  highlight?: boolean;
}

function InfoItem({ icon: Icon, label, value, capitalize = false, highlight = false }: InfoItemProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className={`font-medium ${capitalize ? "capitalize" : ""} ${highlight ? "text-primary text-lg" : ""}`}>
        {value}
      </p>
    </div>
  );
}

interface ContractInfoCardProps {
  contrato: Contrato;
}

export function ContractInfoCard({ contrato }: ContractInfoCardProps) {
  return (
    <AnimatedCard>
      <AnimatedCardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Informações do Contrato</h3>
        </div>
      </AnimatedCardHeader>
      <AnimatedCardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {contrato.valor_total && (
            <InfoItem
              icon={DollarSign}
              label="Valor Total"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: contrato.moeda || "BRL",
              }).format(contrato.valor_total)}
              highlight
            />
          )}
          {contrato.data_inicio && (
            <InfoItem
              icon={Calendar}
              label="Data de Início"
              value={new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}
            />
          )}
          {contrato.data_fim && (
            <InfoItem
              icon={Calendar}
              label="Data de Término"
              value={new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
            />
          )}
          {contrato.data_assinatura && (
            <InfoItem
              icon={Calendar}
              label="Data de Assinatura"
              value={new Date(contrato.data_assinatura).toLocaleDateString("pt-BR")}
            />
          )}
          <InfoItem
            icon={Clock}
            label="Última Atualização"
            value={new Date(contrato.updated_at).toLocaleDateString("pt-BR")}
          />
        </div>

        {contrato.tags && contrato.tags.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {contrato.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {contrato.descricao && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Descrição</h4>
              <p className="text-sm leading-relaxed">{contrato.descricao}</p>
            </div>
          </>
        )}

        {contrato.observacoes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Observações</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{contrato.observacoes}</p>
            </div>
          </>
        )}
      </AnimatedCardContent>
    </AnimatedCard>
  );
}
