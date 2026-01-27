import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Check, 
  X, 
  Edit3, 
  Save, 
  RotateCcw, 
  Send,
  CheckCheck,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractRedlineEditorProps {
  contratoId: string;
  conteudoOriginal?: string;
}

interface Redline {
  id: string;
  versao: number;
  conteudo_original: string;
  conteudo_marcado: string;
  alteracoes: any[];
  status: string;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Change {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  original?: string;
  new?: string;
  accepted?: boolean;
}

export function ContractRedlineEditor({ contratoId, conteudoOriginal = "" }: ContractRedlineEditorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(conteudoOriginal);
  const [showChanges, setShowChanges] = useState(true);

  // Fetch existing redlines
  const { data: redlines, isLoading } = useQuery({
    queryKey: ['contract-redlines', contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_redlines')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Redline[];
    }
  });

  // Create redline mutation
  const createRedline = useMutation({
    mutationFn: async (content: string) => {
      const changes = computeChanges(conteudoOriginal, content);
      const markedContent = generateMarkedContent(conteudoOriginal, content);
      
      const { data, error } = await supabase
        .from('contract_redlines')
        .insert({
          contrato_id: contratoId,
          versao: (redlines?.length || 0) + 1,
          conteudo_original: conteudoOriginal,
          conteudo_marcado: markedContent,
          alteracoes: changes,
          status: 'draft',
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-redlines', contratoId] });
      toast.success("Marcações salvas como rascunho");
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error creating redline:', error);
      toast.error("Erro ao salvar marcações");
    }
  });

  // Submit for review mutation
  const submitForReview = useMutation({
    mutationFn: async (redlineId: string) => {
      const { error } = await supabase
        .from('contract_redlines')
        .update({ status: 'pending_review' })
        .eq('id', redlineId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-redlines', contratoId] });
      toast.success("Enviado para revisão");
    }
  });

  // Review mutation (accept/reject)
  const reviewRedline = useMutation({
    mutationFn: async ({ redlineId, action }: { redlineId: string; action: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('contract_redlines')
        .update({ 
          status: action,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', redlineId);
      
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['contract-redlines', contratoId] });
      toast.success(action === 'accepted' ? "Alterações aceitas" : "Alterações rejeitadas");
    }
  });

  // Simple diff computation (word-level)
  const computeChanges = useCallback((original: string, modified: string): Change[] => {
    const changes: Change[] = [];
    const originalWords = original.split(/\s+/);
    const modifiedWords = modified.split(/\s+/);
    
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < modifiedWords.length) {
      if (i >= originalWords.length) {
        changes.push({ type: 'insert', position: j, new: modifiedWords[j] });
        j++;
      } else if (j >= modifiedWords.length) {
        changes.push({ type: 'delete', position: i, original: originalWords[i] });
        i++;
      } else if (originalWords[i] === modifiedWords[j]) {
        i++;
        j++;
      } else {
        // Simple replace detection
        changes.push({ 
          type: 'replace', 
          position: i, 
          original: originalWords[i], 
          new: modifiedWords[j] 
        });
        i++;
        j++;
      }
    }
    
    return changes;
  }, []);

  // Generate HTML with visual markers
  const generateMarkedContent = useCallback((original: string, modified: string): string => {
    const originalWords = original.split(/\s+/);
    const modifiedWords = modified.split(/\s+/);
    const result: string[] = [];
    
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < modifiedWords.length) {
      if (i >= originalWords.length) {
        result.push(`<ins class="bg-green-100 text-green-800">${modifiedWords[j]}</ins>`);
        j++;
      } else if (j >= modifiedWords.length) {
        result.push(`<del class="bg-red-100 text-red-800 line-through">${originalWords[i]}</del>`);
        i++;
      } else if (originalWords[i] === modifiedWords[j]) {
        result.push(originalWords[i]);
        i++;
        j++;
      } else {
        result.push(`<del class="bg-red-100 text-red-800 line-through">${originalWords[i]}</del>`);
        result.push(`<ins class="bg-green-100 text-green-800">${modifiedWords[j]}</ins>`);
        i++;
        j++;
      }
    }
    
    return result.join(' ');
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'draft': { label: 'Rascunho', variant: 'secondary' },
      'pending_review': { label: 'Aguardando Revisão', variant: 'default' },
      'accepted': { label: 'Aceito', variant: 'outline' },
      'rejected': { label: 'Rejeitado', variant: 'destructive' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleSave = () => {
    if (editedContent.trim() === conteudoOriginal.trim()) {
      toast.info("Nenhuma alteração detectada");
      return;
    }
    createRedline.mutate(editedContent);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editor Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Redlining / Markup
            </CardTitle>
            <CardDescription>
              Edite o texto do contrato com marcações visuais de alterações
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChanges(!showChanges)}
            >
              {showChanges ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showChanges ? 'Ocultar' : 'Mostrar'} Alterações
            </Button>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Editar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setEditedContent(conteudoOriginal);
                  setIsEditing(false);
                }}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={createRedline.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Rascunho
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Cole ou digite o conteúdo do contrato aqui..."
            />
          ) : (
            <div className="border rounded-lg p-4 min-h-[200px] bg-muted/30">
              {conteudoOriginal ? (
                <p className="text-sm whitespace-pre-wrap">{conteudoOriginal}</p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Nenhum conteúdo de texto disponível. Clique em "Editar" para adicionar o texto do contrato.
                </p>
              )}
            </div>
          )}
          
          {/* Preview of changes */}
          {isEditing && editedContent !== conteudoOriginal && showChanges && (
            <div className="mt-4 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-medium mb-2">Pré-visualização das alterações:</h4>
              <div 
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: generateMarkedContent(conteudoOriginal, editedContent) 
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redlines History */}
      {redlines && redlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Marcações</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {redlines.map((redline) => (
                  <Card key={redline.id} className="border-l-4" style={{
                    borderLeftColor: redline.status === 'accepted' ? 'hsl(var(--chart-2))' : 
                                    redline.status === 'rejected' ? 'hsl(var(--destructive))' :
                                    redline.status === 'pending_review' ? 'hsl(var(--chart-4))' :
                                    'hsl(var(--muted))'
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versão {redline.versao}</span>
                          {getStatusBadge(redline.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(redline.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {showChanges && (
                        <div 
                          className="text-sm border rounded p-3 bg-muted/20 mb-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: redline.conteudo_marcado }}
                        />
                      )}

                      <div className="text-xs text-muted-foreground mb-3">
                        {(redline.alteracoes as Change[])?.length || 0} alteração(ões) detectada(s)
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {redline.status === 'draft' && redline.created_by === user?.id && (
                          <Button 
                            size="sm" 
                            onClick={() => submitForReview.mutate(redline.id)}
                            disabled={submitForReview.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Enviar para Revisão
                          </Button>
                        )}
                        
                        {redline.status === 'pending_review' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => reviewRedline.mutate({ redlineId: redline.id, action: 'accepted' })}
                              disabled={reviewRedline.isPending}
                            >
                              <CheckCheck className="h-4 w-4 mr-1" />
                              Aceitar Todas
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => reviewRedline.mutate({ redlineId: redline.id, action: 'rejected' })}
                              disabled={reviewRedline.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar Todas
                            </Button>
                          </>
                        )}
                      </div>

                      {redline.reviewed_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Revisado em {format(new Date(redline.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
