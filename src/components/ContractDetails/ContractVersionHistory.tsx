import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, GitBranch, User, ChevronRight, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVersioning, ContractVersion } from "@/hooks/useVersioning";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ContractVersionHistoryProps {
  contratoId: string;
  currentVersion: number;
  onVersionRestored?: () => void;
}

const fieldLabels: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  status: "Status",
  tipo: "Tipo",
  valor_total: "Valor Total",
  moeda: "Moeda",
  data_inicio: "Data de Início",
  data_fim: "Data de Término",
  data_assinatura: "Data de Assinatura",
  fornecedor_id: "Fornecedor",
  observacoes: "Observações",
  tags: "Tags",
  arquivo_url: "Arquivo",
};

export function ContractVersionHistory({
  contratoId,
  currentVersion,
  onVersionRestored,
}: ContractVersionHistoryProps) {
  const { versions, loading, fetchVersions, restoreVersion } = useVersioning(contratoId);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVersions();
  }, [contratoId]);

  useEffect(() => {
    const fetchUserNames = async () => {
      const userIds = [...new Set(versions.filter(v => v.created_by).map(v => v.created_by!))];
      if (userIds.length === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (data) {
        const names: Record<string, string> = {};
        data.forEach(p => { names[p.id] = p.full_name; });
        setUserNames(names);
      }
    };
    
    if (versions.length > 0) {
      fetchUserNames();
    }
  }, [versions]);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    
    setRestoring(true);
    const success = await restoreVersion(selectedVersion);
    setRestoring(false);
    
    if (success) {
      setShowRestoreDialog(false);
      setSelectedVersion(null);
      onVersionRestored?.();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum histórico de versões disponível.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Versões são criadas automaticamente ao editar o contrato.
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px] pr-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {/* Current version indicator */}
            <div className="relative flex items-start gap-4 pl-10">
              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
              <div className="flex-1 bg-primary/5 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Versão Atual: v{currentVersion}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Version history */}
            {versions.map((version, index) => (
              <div key={version.id} className="relative flex items-start gap-4 pl-10 group">
                <div className={cn(
                  "absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background transition-colors",
                  "bg-muted-foreground/30 group-hover:bg-muted-foreground"
                )} />
                
                <div className="flex-1 bg-card rounded-lg p-3 border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Versão {version.versao}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  {version.created_by && userNames[version.created_by] && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <User className="h-3 w-3" />
                      {userNames[version.created_by]}
                    </div>
                  )}

                  {/* Changes list */}
                  {version.alteracoes && version.alteracoes.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {version.alteracoes.slice(0, 3).map((change, i) => (
                        <div key={i} className="text-xs flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {fieldLabels[change.campo] || change.campo}:
                          </span>
                          <span className="line-through text-destructive/70 truncate max-w-[100px]">
                            {change.anterior || '—'}
                          </span>
                          <span className="text-primary truncate max-w-[100px]">
                            {change.novo || '—'}
                          </span>
                        </div>
                      ))}
                      {version.alteracoes.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{version.alteracoes.length - 3} alterações
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedVersion(version)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver detalhes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary"
                      onClick={() => {
                        setSelectedVersion(version);
                        setShowRestoreDialog(true);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Restore confirmation dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Versão?</DialogTitle>
            <DialogDescription>
              Você está prestes a restaurar o contrato para a versão {selectedVersion?.versao}.
              Uma nova versão será criada com os dados antigos (a versão atual não será perdida).
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && selectedVersion.alteracoes && selectedVersion.alteracoes.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Alterações que serão revertidas:</p>
              {selectedVersion.alteracoes.map((change, i) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {fieldLabels[change.campo] || change.campo}:
                  </span>
                  <span className="text-primary">{change.anterior || '—'}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restaurando..." : "Confirmar Restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version details dialog */}
      <Dialog open={!!selectedVersion && !showRestoreDialog} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Versão {selectedVersion?.versao}</DialogTitle>
            <DialogDescription>
              {selectedVersion && format(new Date(selectedVersion.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(selectedVersion.snapshot).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {fieldLabels[key] || key}
                    </span>
                    <p className="font-medium truncate">
                      {value?.toString() || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVersion(null)}>
              Fechar
            </Button>
            <Button onClick={() => setShowRestoreDialog(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar esta versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
