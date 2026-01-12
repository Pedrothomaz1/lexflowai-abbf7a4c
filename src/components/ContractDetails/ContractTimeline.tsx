import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  FileEdit, 
  Send, 
  CheckCircle, 
  FileSignature, 
  PlayCircle, 
  StopCircle,
  XCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  date: string | null;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  icon: React.ComponentType<{ className?: string }>;
}

interface ContractTimelineProps {
  status: string;
  createdAt: string;
  dataInicio: string | null;
  dataFim: string | null;
  dataAssinatura: string | null;
}

export function ContractTimeline({
  status,
  createdAt,
  dataInicio,
  dataFim,
  dataAssinatura,
}: ContractTimelineProps) {
  const getStatusOrder = (s: string) => {
    const order: Record<string, number> = {
      rascunho: 0,
      em_aprovacao: 1,
      aprovado: 2,
      assinado: 3,
      vigente: 4,
      encerrado: 5,
      cancelado: -1,
    };
    return order[s] ?? 0;
  };

  const currentOrder = getStatusOrder(status);

  const events: TimelineEvent[] = [
    {
      id: 'created',
      date: createdAt,
      label: 'Criado',
      status: 'completed',
      icon: FileEdit,
    },
    {
      id: 'em_aprovacao',
      date: null,
      label: 'Em Aprovação',
      status: currentOrder >= 1 ? 'completed' : currentOrder === 0 ? 'pending' : 'skipped',
      icon: Send,
    },
    {
      id: 'aprovado',
      date: null,
      label: 'Aprovado',
      status: currentOrder >= 2 ? 'completed' : currentOrder === 1 ? 'current' : 'pending',
      icon: CheckCircle,
    },
    {
      id: 'assinado',
      date: dataAssinatura,
      label: 'Assinado',
      status: currentOrder >= 3 ? 'completed' : currentOrder === 2 ? 'current' : 'pending',
      icon: FileSignature,
    },
    {
      id: 'vigente',
      date: dataInicio,
      label: 'Vigente',
      status: currentOrder >= 4 ? 'completed' : currentOrder === 3 ? 'current' : 'pending',
      icon: PlayCircle,
    },
    {
      id: 'encerrado',
      date: dataFim,
      label: 'Encerramento',
      status: currentOrder >= 5 ? 'completed' : 'pending',
      icon: StopCircle,
    },
  ];

  // Handle cancelled status specially
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Contrato Cancelado</p>
          <p className="text-sm text-muted-foreground">
            Este contrato foi cancelado e não está mais ativo.
          </p>
        </div>
      </div>
    );
  }

  const getStatusClasses = (eventStatus: TimelineEvent['status']) => {
    switch (eventStatus) {
      case 'completed':
        return {
          dot: 'bg-success border-success',
          line: 'bg-success',
          text: 'text-foreground',
        };
      case 'current':
        return {
          dot: 'bg-primary border-primary animate-pulse',
          line: 'bg-border',
          text: 'text-primary font-medium',
        };
      case 'pending':
        return {
          dot: 'bg-muted border-border',
          line: 'bg-border',
          text: 'text-muted-foreground',
        };
      case 'skipped':
        return {
          dot: 'bg-muted border-border',
          line: 'bg-muted',
          text: 'text-muted-foreground line-through',
        };
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-thin">
        {events.map((event, index) => {
          const Icon = event.icon;
          const classes = getStatusClasses(event.status);
          const isLast = index === events.length - 1;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center relative flex-1 min-w-[80px]"
            >
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={cn(
                    "absolute top-4 left-1/2 w-full h-0.5",
                    classes.line
                  )} 
                />
              )}
              
              {/* Dot */}
              <div 
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center",
                  classes.dot
                )}
              >
                <Icon className={cn(
                  "h-4 w-4",
                  event.status === 'completed' ? 'text-success-foreground' :
                  event.status === 'current' ? 'text-primary-foreground' :
                  'text-muted-foreground'
                )} />
              </div>
              
              {/* Label */}
              <span className={cn("text-xs mt-2 text-center", classes.text)}>
                {event.label}
              </span>
              
              {/* Date */}
              {event.date && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(event.date), "dd/MM/yy", { locale: ptBR })}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
