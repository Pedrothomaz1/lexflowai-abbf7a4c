import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { motion } from "framer-motion";
import { 
  Copy, 
  RefreshCw, 
  Archive, 
  Edit, 
  ExternalLink,
  Send,
  Bell,
  MoreHorizontal,
  Trash2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContractQuickActionsProps {
  contratoId: string;
  contratoNumero: string;
  contratoTitulo: string;
  status: string;
  arquivoUrl: string | null;
  onRefresh: () => void;
}

export function ContractQuickActions({
  contratoId,
  contratoNumero,
  contratoTitulo,
  status,
  arquivoUrl,
  onRefresh,
}: ContractQuickActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      if (!organization?.id) {
        throw new Error("Organização não encontrada. Finalize o onboarding.");
      }

      // Fetch the current contract
      const { data: original, error: fetchError } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", contratoId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new contract based on the original
      const { data: newContract, error: insertError } = await supabase
        .from("contratos")
        .insert([{
          organization_id: organization.id,
          numero_contrato: `${original.numero_contrato}-COPIA`,
          titulo: `${original.titulo} (Cópia)`,
          descricao: original.descricao,
          tipo: original.tipo,
          status: 'rascunho',
          valor_total: original.valor_total,
          moeda: original.moeda,
          fornecedor_id: original.fornecedor_id,
          observacoes: original.observacoes,
          versao: 1,
        }])
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes("row-level security") || insertError.code === "42501") {
          throw new Error("Sem permissão para duplicar contrato. Verifique seu acesso.");
        }
        throw insertError;
      }

      toast({
        title: "Contrato duplicado!",
        description: "Uma cópia do contrato foi criada como rascunho.",
      });

      navigate(`/contratos/${newContract.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao duplicar",
        description: error.message,
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const { data, error } = await supabase
        .from("contratos")
        .update({ status: 'encerrado' })
        .eq("id", contratoId)
        .select()
        .maybeSingle();

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para arquivar contrato. Verifique seu acesso.");
        }
        throw error;
      }

      if (!data) {
        throw new Error("Sem permissão para arquivar este contrato. Somente administradores ou consultoria jurídica podem arquivar.");
      }

      toast({
        title: "Contrato arquivado",
        description: "O contrato foi movido para encerrado.",
      });

      onRefresh();
      setShowArchiveDialog(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao arquivar",
        description: error.message,
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!organization?.id) {
        throw new Error("Organização não encontrada. Finalize o onboarding.");
      }

      // Create an alert for 30 days from now
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + 30);

      const { error } = await supabase.from("contract_alerts").insert([{
        organization_id: organization.id,
        contrato_id: contratoId,
        titulo: `Lembrete: ${contratoTitulo}`,
        mensagem: `Revisar contrato ${contratoNumero}`,
        tipo_alerta: 'renovacao',
        data_alerta: alertDate.toISOString(),
        dias_antecedencia: 30,
      }]);

      if (error) {
        if (error.message.includes("row-level security") || error.code === "42501") {
          throw new Error("Sem permissão para criar alerta. Verifique seu acesso.");
        }
        throw error;
      }

      toast({
        title: "Alerta criado!",
        description: "Você será notificado em 30 dias.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar alerta",
        description: error.message,
      });
    }
  };

  const quickActions = [
    {
      id: 'duplicate',
      label: 'Duplicar',
      icon: Copy,
      onClick: handleDuplicate,
      loading: isDuplicating,
      show: true,
    },
    {
      id: 'alert',
      label: 'Criar Alerta',
      icon: Bell,
      onClick: handleCreateAlert,
      show: status === 'vigente',
    },
    {
      id: 'view-doc',
      label: 'Ver Documento',
      icon: FileText,
      onClick: () => window.open(arquivoUrl!, '_blank'),
      show: !!arquivoUrl,
    },
  ].filter(action => action.show);

  return (
    <>
      <div className="flex items-center gap-2">
        {quickActions.slice(0, 2).map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={action.onClick}
                disabled={action.loading}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </motion.div>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {quickActions.slice(2).map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.id} onClick={action.onClick}>
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateAlert}>
              <Bell className="h-4 w-4 mr-2" />
              Criar Lembrete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/kanban')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver no Kanban
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowArchiveDialog(true)}
              className="text-destructive focus:text-destructive"
              disabled={status === 'encerrado' || status === 'cancelado'}
            >
              <Archive className="h-4 w-4 mr-2" />
              Arquivar Contrato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato "{contratoTitulo}" será movido para status "Encerrado".
              Esta ação pode ser revertida alterando o status manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
