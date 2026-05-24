import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ListTodo, 
  Plus, 
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  Edit,
  DollarSign,
  CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AnimatedCard, AnimatedCardContent, AnimatedCardHeader } from "@/components/ui/animated-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { handleDbError } from "@/utils/dbErrorHandler";

interface Obligation {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  data_vencimento: string;
  valor: number | null;
  status: string | null;
  responsavel_id: string | null;
  concluido_em: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface ContractObligationsProps {
  contratoId: string;
}

const OBLIGATION_TYPES = [
  { value: 'pagamento', label: 'Pagamento' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'notificacao', label: 'Notificação' },
  { value: 'outro', label: 'Outro' },
];

export function ContractObligations({ contratoId }: ContractObligationsProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'outro',
    data_vencimento: undefined as Date | undefined,
    valor: '',
    responsavel_id: '',
  });

  useEffect(() => {
    fetchObligations();
    fetchProfiles();
  }, [contratoId]);

  const fetchObligations = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_obligations")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      setObligations(data || []);
    } catch (error: any) {
      console.error("Error fetching obligations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    if (data) setProfiles(data);
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'outro',
      data_vencimento: undefined,
      valor: '',
      responsavel_id: '',
    });
    setEditingObligation(null);
  };

  const handleOpenDialog = (obligation?: Obligation) => {
    if (obligation) {
      setEditingObligation(obligation);
      setFormData({
        titulo: obligation.titulo,
        descricao: obligation.descricao || '',
        tipo: obligation.tipo || 'outro',
        data_vencimento: new Date(obligation.data_vencimento),
        valor: obligation.valor?.toString() || '',
        responsavel_id: obligation.responsavel_id || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.data_vencimento) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha o título e a data de vencimento.",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Organização não encontrada",
        description: "Finalize o onboarding ou verifique seu acesso.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const obligationData = {
        contrato_id: contratoId,
        organization_id: organization.id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        data_vencimento: formData.data_vencimento.toISOString(),
        valor: formData.valor ? parseFloat(formData.valor) : null,
        responsavel_id: formData.responsavel_id || null,
        status: 'pendente',
      };

      if (editingObligation) {
        const { error } = await supabase
          .from("contract_obligations")
          .update(obligationData)
          .eq("id", editingObligation.id);

        if (error) throw error;
        toast({ title: "Obrigação atualizada!" });
      } else {
        const { error } = await supabase
          .from("contract_obligations")
          .insert([obligationData]);

        if (error) {
          if (error.message.includes("row-level security") || error.code === "42501") {
            throw new Error("Sem permissão para criar obrigação. Verifique seu acesso.");
          }
          throw error;
        }
        toast({ title: "Obrigação criada!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchObligations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: handleDbError(error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (obligation: Obligation) => {
    try {
      const isCompleting = obligation.status !== 'concluido';
      const { error } = await supabase
        .from("contract_obligations")
        .update({
          status: isCompleting ? 'concluido' : 'pendente',
          concluido_em: isCompleting ? new Date().toISOString() : null,
        })
        .eq("id", obligation.id);

      if (error) throw error;

      toast({
        title: isCompleting ? "Obrigação concluída!" : "Obrigação reaberta",
      });
      fetchObligations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: handleDbError(error).message,
      });
    }
  };

  const handleDelete = async (obligationId: string) => {
    try {
      const { error } = await supabase
        .from("contract_obligations")
        .delete()
        .eq("id", obligationId);

      if (error) throw error;

      toast({ title: "Obrigação removida" });
      setObligations(prev => prev.filter(o => o.id !== obligationId));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: handleDbError(error).message,
      });
    }
  };

  const getUrgencyInfo = (dueDate: string, status: string | null) => {
    if (status === 'concluido') {
      return { level: 'completed', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 };
    }

    const daysUntil = differenceInDays(new Date(dueDate), new Date());
    
    if (isPast(new Date(dueDate)) && !isToday(new Date(dueDate))) {
      return { level: 'overdue', color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle };
    }
    if (daysUntil <= 7) {
      return { level: 'urgent', color: 'text-warning', bg: 'bg-warning/10', icon: Clock };
    }
    return { level: 'normal', color: 'text-muted-foreground', bg: 'bg-muted', icon: Calendar };
  };

  const getTypeLabel = (type: string | null) => {
    const found = OBLIGATION_TYPES.find(t => t.value === type);
    return found?.label || type || 'Outro';
  };

  const getResponsibleName = (responsavelId: string | null) => {
    if (!responsavelId) return null;
    const profile = profiles.find(p => p.id === responsavelId);
    return profile?.full_name || 'Usuário';
  };

  const filteredObligations = obligations.filter(o => {
    if (filter === 'pending') return o.status !== 'concluido';
    if (filter === 'completed') return o.status === 'concluido';
    return true;
  });

  const pendingCount = obligations.filter(o => o.status !== 'concluido').length;
  const overdueCount = obligations.filter(o => 
    o.status !== 'concluido' && isPast(new Date(o.data_vencimento)) && !isToday(new Date(o.data_vencimento))
  ).length;

  return (
    <AnimatedCard>
      <AnimatedCardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Obrigações Contratuais</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                </span>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueCount} atrasada{overdueCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingObligation ? 'Editar Obrigação' : 'Nova Obrigação'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Pagamento da 1ª parcela"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OBLIGATION_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de Vencimento *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.data_vencimento && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.data_vencimento 
                              ? format(formData.data_vencimento, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.data_vencimento}
                            onSelect={(date) => setFormData({ ...formData, data_vencimento: date })}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select
                        value={formData.responsavel_id || "none"}
                        onValueChange={(v) => setFormData({ ...formData, responsavel_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {profiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Detalhes adicionais..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Salvando..." : editingObligation ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </AnimatedCardHeader>
      <AnimatedCardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Carregando obrigações...
          </div>
        ) : filteredObligations.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={filter === 'all' ? "Nenhuma obrigação" : `Nenhuma obrigação ${filter === 'pending' ? 'pendente' : 'concluída'}`}
            description="Adicione obrigações como pagamentos, entregas ou notificações."
          />
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filteredObligations.map((obligation, index) => {
                const urgency = getUrgencyInfo(obligation.data_vencimento, obligation.status);
                const UrgencyIcon = urgency.icon;
                const responsibleName = getResponsibleName(obligation.responsavel_id);
                const isCompleted = obligation.status === 'concluido';

                return (
                  <motion.div
                    key={obligation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      urgency.bg,
                      isCompleted && "opacity-70"
                    )}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleToggleComplete(obligation)}
                      className="mt-1"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn(
                            "font-medium text-sm",
                            isCompleted && "line-through text-muted-foreground"
                          )}>
                            {obligation.titulo}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(obligation.tipo)}
                            </Badge>
                            <span className={cn("text-xs flex items-center gap-1", urgency.color)}>
                              <UrgencyIcon className="h-3 w-3" />
                              {format(new Date(obligation.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {obligation.valor && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(obligation.valor)}
                              </span>
                            )}
                            {responsibleName && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {responsibleName}
                              </span>
                            )}
                          </div>
                          {obligation.descricao && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {obligation.descricao}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(obligation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(obligation.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </AnimatedCardContent>
    </AnimatedCard>
  );
}
