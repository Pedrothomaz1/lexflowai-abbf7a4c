import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";

export type CalendarObligation = {
  id: string;
  contrato_id: string;
  titulo: string;
  descricao: string;
  data_vencimento: string;
  tipo: string;
  valor: number;
  status: string;
  contratos: {
    numero_contrato: string;
    titulo: string;
  };
};

interface CalendarViewProps {
  obligations: CalendarObligation[];
  onDateSelect?: (date: Date) => void;
  className?: string;
}

export function CalendarView({ obligations, onDateSelect, className }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getObligationsForDate = (date: Date) => {
    return obligations.filter((obl) =>
      isSameDay(new Date(obl.data_vencimento), date)
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; variant: "outline" | "default" | "destructive"; icon: React.ComponentType<{ className?: string }> } } = {
      pendente: { label: "Pendente", variant: "outline", icon: Clock },
      concluido: { label: "Concluído", variant: "default", icon: CheckCircle2 },
      atrasado: { label: "Atrasado", variant: "destructive", icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: { [key: string]: { label: string; variant: "default" | "secondary" | "outline" } } = {
      pagamento: { label: "Pagamento", variant: "default" },
      entrega: { label: "Entrega", variant: "secondary" },
      renovacao: { label: "Renovação", variant: "outline" },
      outro: { label: "Outro", variant: "outline" },
    };
    const config = tipos[tipo] || tipos.outro;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const firstDayOfMonth = getDay(startOfMonth(currentDate));
  const paddingDays = Array(firstDayOfMonth).fill(null);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    onDateSelect?.(day);
  };

  const selectedDateObligations = selectedDate ? getObligationsForDate(selectedDate) : [];

  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>
      {/* Calendar Grid */}
      <AnimatedCard hoverScale={1} className="lg:col-span-2">
        <AnimatedCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold capitalize">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
            </div>
            <div className="flex gap-2">
              <AnimatedButton variant="outline" size="sm" onClick={previousMonth}>
                ←
              </AnimatedButton>
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
              >
                Hoje
              </AnimatedButton>
              <AnimatedButton variant="outline" size="sm" onClick={nextMonth}>
                →
              </AnimatedButton>
            </div>
          </div>
        </AnimatedCardHeader>
        <AnimatedCardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="min-h-[60px]" />
            ))}
            {daysInMonth.map((day, index) => {
              const dayObligations = getObligationsForDate(day);
              const hasObligations = dayObligations.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasUrgent = dayObligations.some((o) => o.status === "atrasado");

              return (
                <motion.button
                  key={day.toISOString()}
                  onClick={() => handleDateSelect(day)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2 text-center rounded-lg transition-all relative min-h-[60px] flex flex-col items-center border border-transparent",
                    isToday(day) && "bg-primary/10 border-primary/30 font-semibold",
                    isSelected && "ring-2 ring-primary bg-primary/5",
                    !isToday(day) && !isSelected && "hover:bg-accent",
                    hasUrgent && !isSelected && "bg-destructive/5",
                  )}
                >
                  <span className={cn(
                    "text-sm",
                    isToday(day) && "text-primary font-bold"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasObligations && (
                    <div className="mt-1 flex gap-0.5 flex-wrap justify-center">
                      {dayObligations.slice(0, 3).map((obl, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            obl.status === "atrasado" && "bg-destructive",
                            obl.status === "pendente" && "bg-warning",
                            obl.status === "concluido" && "bg-success"
                          )}
                        />
                      ))}
                      {dayObligations.length > 3 && (
                        <span className="text-2xs text-muted-foreground">
                          +{dayObligations.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </AnimatedCardContent>
      </AnimatedCard>

      {/* Selected Date Details */}
      <AnimatedCard hoverScale={1} className="h-fit">
        <AnimatedCardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedDateObligations.length > 0
              ? `${selectedDateObligations.length} obrigação(ões)`
              : "Nenhuma obrigação"}
          </p>
        </AnimatedCardHeader>
        <AnimatedCardContent>
          <AnimatePresence mode="wait">
            {selectedDateObligations.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {selectedDate
                    ? "Nenhuma obrigação nesta data"
                    : "Clique em uma data para ver os detalhes"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="obligations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin"
              >
                {selectedDateObligations.map((obligation, index) => (
                  <motion.div
                    key={obligation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm text-foreground line-clamp-2">
                        {obligation.titulo}
                      </h4>
                      {getTipoBadge(obligation.tipo)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {obligation.contratos?.numero_contrato} - {obligation.contratos?.titulo}
                    </p>
                    {obligation.valor && (
                      <p className="text-sm font-semibold text-primary">
                        R$ {Number(obligation.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {getStatusBadge(obligation.status)}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedCardContent>
      </AnimatedCard>
    </div>
  );
}

export default CalendarView;
