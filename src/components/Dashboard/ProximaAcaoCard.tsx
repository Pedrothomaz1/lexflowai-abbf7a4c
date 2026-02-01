import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  FileText,
  Timer,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProximaAcaoCardProps {
  stats: {
    vencendo7Dias: number;
    vencendo30Dias: number;
    aprovacoesPendentes: number;
    riscosAltos: number;
  };
  className?: string;
}

type AcaoUrgente = {
  tipo: 'critico' | 'alerta' | 'atencao' | 'ok';
  titulo: string;
  descricao: string;
  acao: string;
  rota: string;
  icone: typeof AlertTriangle;
  quantidade?: number;
};

function determinarAcaoUrgente(stats: ProximaAcaoCardProps['stats']): AcaoUrgente {
  // 1. Contratos vencendo em < 7 dias (crítico)
  if (stats.vencendo7Dias > 0) {
    return {
      tipo: 'critico',
      titulo: `${stats.vencendo7Dias} contrato${stats.vencendo7Dias > 1 ? 's' : ''} vence${stats.vencendo7Dias > 1 ? 'm' : ''} em menos de 7 dias`,
      descricao: 'Revise e decida: renovar, renegociar ou encerrar antes do prazo.',
      acao: 'Ver contratos urgentes',
      rota: '/alertas',
      icone: AlertTriangle,
      quantidade: stats.vencendo7Dias,
    };
  }

  // 2. Contratos vencendo em < 30 dias (alerta)
  if (stats.vencendo30Dias > 0) {
    return {
      tipo: 'alerta',
      titulo: `${stats.vencendo30Dias} contrato${stats.vencendo30Dias > 1 ? 's' : ''} vence${stats.vencendo30Dias > 1 ? 'm' : ''} em 30 dias`,
      descricao: 'Antecipe a decisão para evitar correria de última hora.',
      acao: 'Ver contratos',
      rota: '/alertas',
      icone: Clock,
      quantidade: stats.vencendo30Dias,
    };
  }

  // 3. Aprovações pendentes > 5 dias (atenção)
  if (stats.aprovacoesPendentes > 0) {
    return {
      tipo: 'atencao',
      titulo: `${stats.aprovacoesPendentes} aprovação${stats.aprovacoesPendentes > 1 ? 'ões' : ''} pendente${stats.aprovacoesPendentes > 1 ? 's' : ''}`,
      descricao: 'Contratos aguardando decisão. Atrasos podem impactar prazos.',
      acao: 'Revisar aprovações',
      rota: '/workflows',
      icone: Timer,
      quantidade: stats.aprovacoesPendentes,
    };
  }

  // 4. Riscos altos sem revisão (informativo)
  if (stats.riscosAltos > 0) {
    return {
      tipo: 'atencao',
      titulo: `${stats.riscosAltos} contrato${stats.riscosAltos > 1 ? 's' : ''} com risco alto`,
      descricao: 'Contratos identificados com cláusulas que precisam de atenção.',
      acao: 'Ver análises',
      rota: '/contratos',
      icone: Shield,
      quantidade: stats.riscosAltos,
    };
  }

  // 5. Tudo sob controle
  return {
    tipo: 'ok',
    titulo: 'Tudo sob controle',
    descricao: 'Não há ações urgentes no momento. Continue monitorando.',
    acao: 'Ver todos os contratos',
    rota: '/contratos',
    icone: CheckCircle2,
  };
}

export function ProximaAcaoCard({ stats, className }: ProximaAcaoCardProps) {
  const navigate = useNavigate();
  const acao = determinarAcaoUrgente(stats);
  const Icon = acao.icone;

  const variantStyles = {
    critico: {
      badge: 'bg-destructive text-destructive-foreground',
      border: 'border-destructive/30',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    alerta: {
      badge: 'bg-warning text-warning-foreground',
      border: 'border-warning/30',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    atencao: {
      badge: 'bg-info text-info-foreground',
      border: 'border-info/30',
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
    },
    ok: {
      badge: 'bg-success text-success-foreground',
      border: 'border-success/30',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  };

  const style = variantStyles[acao.tipo];

  return (
    <Card className={cn("card-elevated", style.border, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Próxima Ação
          </CardTitle>
          <Badge className={cn("text-xs font-medium", style.badge)}>
            {acao.tipo === 'critico' && 'Urgente'}
            {acao.tipo === 'alerta' && 'Atenção'}
            {acao.tipo === 'atencao' && 'Informativo'}
            {acao.tipo === 'ok' && 'OK'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-lg shrink-0", style.iconBg)}>
            <Icon className={cn("h-6 w-6", style.iconColor)} />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-foreground">{acao.titulo}</p>
            <p className="text-sm text-muted-foreground">{acao.descricao}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate(acao.rota)} 
          className="w-full gap-2"
          variant={acao.tipo === 'critico' ? 'destructive' : 'default'}
        >
          {acao.acao}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
