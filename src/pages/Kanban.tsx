import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Eye, Building, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { AnimatedButton } from "@/components/ui/animated-button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion-container";
import { cn } from "@/lib/utils";

type Contrato = {
  id: string;
  numero_contrato: string;
  titulo: string;
  tipo: string;
  status: string;
  valor_total: number | null;
  moeda: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  fornecedor_id: string | null;
};

type Fornecedor = {
  id: string;
  nome: string;
};

const statusColumns = [
  { id: "rascunho", label: "Rascunho", color: "bg-muted", borderColor: "border-muted-foreground/20" },
  { id: "em_aprovacao", label: "Em Aprovação", color: "bg-warning/10", borderColor: "border-warning/30" },
  { id: "aprovado", label: "Aprovado", color: "bg-info/10", borderColor: "border-info/30" },
  { id: "assinado", label: "Assinado", color: "bg-primary/10", borderColor: "border-primary/30" },
  { id: "vigente", label: "Vigente", color: "bg-success/10", borderColor: "border-success/30" },
  { id: "encerrado", label: "Encerrado", color: "bg-secondary/30", borderColor: "border-secondary" },
  { id: "cancelado", label: "Cancelado", color: "bg-destructive/10", borderColor: "border-destructive/30" },
];

const Kanban = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchContratos();
    fetchFornecedores();
  }, []);

  const fetchContratos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar contratos",
        description: error.message,
      });
    } else {
      setContratos(data || []);
    }
    setLoading(false);
  };

  const fetchFornecedores = async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .order("nome");
    setFornecedores(data || []);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const contratoId = active.id as string;
    let newStatus = over.id as string;

    const contrato = contratos.find(c => c.id === over.id);
    if (contrato) {
      newStatus = contrato.status;
    }

    if (!statusColumns.find(col => col.id === newStatus)) {
      setActiveId(null);
      return;
    }

    const contratoAtual = contratos.find(c => c.id === contratoId);
    if (contratoAtual && contratoAtual.status === newStatus) {
      setActiveId(null);
      return;
    }

    setContratos(prev =>
      prev.map(c => (c.id === contratoId ? { ...c, status: newStatus } : c))
    );

    const { error } = await supabase
      .from("contratos")
      .update({ status: newStatus })
      .eq("id", contratoId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
      fetchContratos();
    } else {
      toast({
        title: "Status atualizado!",
        description: `Contrato movido para "${statusColumns.find(c => c.id === newStatus)?.label}"`,
      });

      if (newStatus === "em_aprovacao" && contratoAtual) {
        try {
          await supabase.functions.invoke('enviar-notificacao-whatsapp', {
            body: {
              contratoId: contratoId,
              contratoNumero: contratoAtual.numero_contrato,
              contratoTitulo: contratoAtual.titulo,
              novoStatus: newStatus,
            },
          });
        } catch (notifError) {
          console.error('Erro ao enviar notificação:', notifError);
        }
      }
    }

    setActiveId(null);
  };

  const getFornecedorNome = (fornecedorId: string | null) => {
    if (!fornecedorId) return "—";
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nome || "—";
  };

  const getContratosByStatus = (status: string) => {
    return contratos.filter(c => c.status === status);
  };

  const activeContrato = contratos.find(c => c.id === activeId);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Kanban de Contratos"
          description="Arraste os contratos entre colunas para alterar o status"
        />
      </FadeIn>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px] scrollbar-thin">
          <StaggerContainer className="flex gap-4">
            {statusColumns.map((column, index) => (
              <StaggerItem key={column.id}>
                <DroppableColumn
                  id={column.id}
                  label={column.label}
                  color={column.color}
                  borderColor={column.borderColor}
                  contratos={getContratosByStatus(column.id)}
                  getFornecedorNome={getFornecedorNome}
                  onViewContrato={(id) => navigate(`/contratos/${id}`)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <DragOverlay>
          {activeContrato && (
            <ContratoCard
              contrato={activeContrato}
              fornecedorNome={getFornecedorNome(activeContrato.fornecedor_id)}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

const DroppableColumn = ({
  id,
  label,
  color,
  borderColor,
  contratos,
  getFornecedorNome,
  onViewContrato,
}: {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  contratos: Contrato[];
  getFornecedorNome: (id: string | null) => string;
  onViewContrato: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 rounded-xl border-2 transition-all duration-200",
        isOver ? "border-primary bg-primary/5 scale-[1.02]" : `border-dashed ${borderColor}`,
      )}
    >
      <div className={cn("px-4 py-3 rounded-t-xl", color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{label}</h3>
          <Badge variant="secondary" className="text-xs">
            {contratos.length}
          </Badge>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {contratos.map((contrato, index) => (
            <motion.div
              key={contrato.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <DraggableCard
                contrato={contrato}
                fornecedorNome={getFornecedorNome(contrato.fornecedor_id)}
                onView={onViewContrato}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {contratos.length === 0 && (
          <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
            Nenhum contrato
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DraggableCard = ({
  contrato,
  fornecedorNome,
  onView,
}: {
  contrato: Contrato;
  fornecedorNome: string;
  onView: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contrato.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      <ContratoCard
        contrato={contrato}
        fornecedorNome={fornecedorNome}
        onView={onView}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const ContratoCard = ({
  contrato,
  fornecedorNome,
  isDragging = false,
  onView,
  dragHandleProps,
}: {
  contrato: Contrato;
  fornecedorNome: string;
  isDragging?: boolean;
  onView?: (id: string) => void;
  dragHandleProps?: any;
}) => {
  return (
    <motion.div
      whileHover={!isDragging ? { y: -2, boxShadow: "0 8px 25px -8px hsl(var(--primary) / 0.15)" } : undefined}
      className={cn(
        "bg-card rounded-lg border shadow-sm transition-all cursor-default",
        isDragging && "shadow-2xl scale-105 rotate-2",
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2 leading-tight">
              {contrato.titulo}
            </h4>
            <Badge variant="outline" className="text-2xs mt-1.5">
              {contrato.numero_contrato}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building className="h-3 w-3 shrink-0" />
            <span className="truncate">{fornecedorNome}</span>
          </div>

          {contrato.valor_total && (
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: contrato.moeda || "BRL",
                }).format(contrato.valor_total)}
              </span>
            </div>
          )}

          {contrato.data_inicio && contrato.data_fim && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {new Date(contrato.data_inicio).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                →{" "}
                {new Date(contrato.data_fim).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {onView && (
          <AnimatedButton
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onView(contrato.id);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver Detalhes
          </AnimatedButton>
        )}
      </div>
    </motion.div>
  );
};

export default Kanban;
