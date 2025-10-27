import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Eye, Building } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

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
  { id: "rascunho", label: "Rascunho", color: "bg-muted" },
  { id: "em_aprovacao", label: "Em Aprovação", color: "bg-accent" },
  { id: "aprovado", label: "Aprovado", color: "bg-primary/20" },
  { id: "assinado", label: "Assinado", color: "bg-primary/30" },
  { id: "vigente", label: "Vigente", color: "bg-primary/40" },
  { id: "encerrado", label: "Encerrado", color: "bg-secondary/30" },
  { id: "cancelado", label: "Cancelado", color: "bg-destructive/20" },
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

    // Se soltou sobre um card, pegar o status da coluna pai
    const contrato = contratos.find(c => c.id === over.id);
    if (contrato) {
      newStatus = contrato.status;
    }

    // Verificar se é uma coluna válida
    if (!statusColumns.find(col => col.id === newStatus)) {
      setActiveId(null);
      return;
    }

    const contratoAtual = contratos.find(c => c.id === contratoId);
    if (contratoAtual && contratoAtual.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Atualizar localmente
    setContratos(prev =>
      prev.map(c => (c.id === contratoId ? { ...c, status: newStatus } : c))
    );

    // Atualizar no banco
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
      fetchContratos(); // Recarregar em caso de erro
    } else {
      toast({
        title: "Status atualizado com sucesso!",
      });

      // Se mudou para "em_aprovacao", enviar notificação WhatsApp
      if (newStatus === "em_aprovacao" && contratoAtual) {
        try {
          const { error: notifError } = await supabase.functions.invoke(
            'enviar-notificacao-whatsapp',
            {
              body: {
                contratoId: contratoId,
                contratoNumero: contratoAtual.numero_contrato,
                contratoTitulo: contratoAtual.titulo,
                novoStatus: newStatus,
              },
            }
          );

          if (notifError) {
            console.error('Erro ao enviar notificação WhatsApp:', notifError);
            toast({
              title: "Status atualizado",
              description: "Porém não foi possível enviar a notificação via WhatsApp.",
            });
          } else {
            toast({
              title: "Aprovadores notificados!",
              description: "Mensagem enviada via WhatsApp.",
            });
          }
        } catch (notifError) {
          console.error('Erro ao enviar notificação:', notifError);
        }
      }
    }

    setActiveId(null);
  };

  const getFornecedorNome = (fornecedorId: string | null) => {
    if (!fornecedorId) return "-";
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nome || "-";
  };

  const getContratosByStatus = (status: string) => {
    return contratos.filter(c => c.status === status);
  };

  const activeContrato = contratos.find(c => c.id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kanban de Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Arraste os contratos para alterar o status
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {statusColumns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <DroppableColumn
                id={column.id}
                label={column.label}
                color={column.color}
                contratos={getContratosByStatus(column.id)}
                getFornecedorNome={getFornecedorNome}
                onViewContrato={(id) => navigate(`/contratos/${id}`)}
              />
            </div>
          ))}
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
  contratos,
  getFornecedorNome,
  onViewContrato,
}: {
  id: string;
  label: string;
  color: string;
  contratos: Contrato[];
  getFornecedorNome: (id: string | null) => string;
  onViewContrato: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 border-dashed transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className={`${color} p-3 rounded-t-lg`}>
        <h3 className="font-semibold text-sm">
          {label} ({contratos.length})
        </h3>
      </div>
      <div className="p-2 space-y-2 min-h-[200px]">
        {contratos.map(contrato => (
          <DraggableCard
            key={contrato.id}
            contrato={contrato}
            fornecedorNome={getFornecedorNome(contrato.fornecedor_id)}
            onView={onViewContrato}
          />
        ))}
      </div>
    </div>
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
    cursor: 'grabbing',
  } : { cursor: 'grab' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <ContratoCard
        contrato={contrato}
        fornecedorNome={fornecedorNome}
        onView={onView}
      />
    </div>
  );
};

const ContratoCard = ({
  contrato,
  fornecedorNome,
  isDragging = false,
  onView,
}: {
  contrato: Contrato;
  fornecedorNome: string;
  isDragging?: boolean;
  onView?: (id: string) => void;
}) => {
  return (
    <Card
      className={`${
        isDragging ? "opacity-80 shadow-2xl scale-105" : ""
      } hover:shadow-md transition-all`}
    >
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium line-clamp-2">
          {contrato.titulo}
        </CardTitle>
        <Badge variant="outline" className="text-xs w-fit mt-1">
          {contrato.numero_contrato}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building className="h-3 w-3" />
          <span className="truncate">{fornecedorNome}</span>
        </div>

        {contrato.valor_total && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
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
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(contrato.data_inicio).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              -{" "}
              {new Date(contrato.data_fim).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </div>
        )}

        {onView && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onView(contrato.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver Detalhes
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default Kanban;
