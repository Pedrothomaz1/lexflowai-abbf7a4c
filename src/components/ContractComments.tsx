import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Lightbulb, 
  StickyNote, 
  HelpCircle,
  Send,
  Reply,
  Check,
  Clock,
  Eye,
  Trash2,
  Edit
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Comment = {
  id: string;
  contrato_id: string;
  user_id: string;
  parent_id: string | null;
  secao: string | null;
  tipo: 'comentario' | 'sugestao' | 'anotacao' | 'questao';
  conteudo: string;
  status: 'aberto' | 'resolvido' | 'em_analise';
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
};

type Profile = {
  full_name: string;
  email: string;
};

interface ContractCommentsProps {
  contratoId: string;
  secao?: string;
}

export function ContractComments({ contratoId, secao }: ContractCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<'comentario' | 'sugestao' | 'anotacao' | 'questao'>('comentario');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
    fetchComments();
    setupRealtimeSubscription();
  }, [contratoId, secao]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchComments = async () => {
    try {
      let query = supabase
        .from("contract_comments")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });

      if (secao) {
        query = query.eq("secao", secao);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar comentários:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar comentários",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('contract-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_comments',
          filter: `contrato_id=eq.${contratoId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O comentário não pode estar vazio",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      if (editingId) {
        const { error } = await supabase
          .from("contract_comments")
          .update({
            conteudo: newComment,
            tipo: commentType,
          })
          .eq("id", editingId);

        if (error) throw error;
        
        toast({
          title: "Comentário atualizado!",
        });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("contract_comments")
          .insert([{
            contrato_id: contratoId,
            user_id: user.id,
            parent_id: replyingTo,
            secao: secao || null,
            tipo: commentType,
            conteudo: newComment,
            status: 'aberto',
          }]);

        if (error) throw error;

        toast({
          title: "Comentário adicionado!",
        });
      }

      setNewComment("");
      setReplyingTo(null);
      setCommentType('comentario');
      fetchComments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar comentário",
        description: error.message,
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
      const { error } = await supabase
        .from("contract_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comentário excluído!",
      });
      fetchComments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir comentário",
        description: error.message,
      });
    }
  };

  const handleStatusChange = async (commentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("contract_comments")
        .update({ status: newStatus })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
      });
      fetchComments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setNewComment(comment.conteudo);
    setCommentType(comment.tipo);
    setReplyingTo(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sugestao':
        return <Lightbulb className="h-4 w-4" />;
      case 'anotacao':
        return <StickyNote className="h-4 w-4" />;
      case 'questao':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      comentario: { label: 'Comentário', variant: 'secondary' },
      sugestao: { label: 'Sugestão', variant: 'default' },
      anotacao: { label: 'Anotação', variant: 'outline' },
      questao: { label: 'Questão', variant: 'destructive' },
    };
    return variants[type] || variants.comentario;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      aberto: { label: 'Aberto', icon: Clock, variant: 'default' },
      em_analise: { label: 'Em Análise', icon: Eye, variant: 'secondary' },
      resolvido: { label: 'Resolvido', icon: Check, variant: 'outline' },
    };
    return variants[status] || variants.aberto;
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (comment: Comment, isReply = false) => {
    const typeBadge = getTypeBadge(comment.tipo);
    const statusBadge = getStatusBadge(comment.status);
    const StatusIcon = statusBadge.icon;
    const replies = getReplies(comment.id);
    const profile = comment.profiles as Profile;
    const isOwner = currentUserId === comment.user_id;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12 mt-4' : ''}`}>
        <Card className={isReply ? 'bg-muted/30' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={typeBadge.variant} className="gap-1">
                  {getTypeIcon(comment.tipo)}
                  {typeBadge.label}
                </Badge>
                <Badge variant={statusBadge.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusBadge.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{comment.conteudo}</p>
            
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(comment.id);
                  setEditingId(null);
                }}
              >
                <Reply className="h-3 w-3 mr-1" />
                Responder
              </Button>
              
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(comment)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </>
              )}

              <Select
                value={comment.status}
                onValueChange={(value) => handleStatusChange(comment.id, value)}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando comentários...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Revisão Colaborativa
          </CardTitle>
          <CardDescription>
            {secao ? `Comentários da seção: ${secao}` : 'Todos os comentários do contrato'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={commentType}
                onValueChange={(value: any) => setCommentType(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comentario">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comentário
                    </div>
                  </SelectItem>
                  <SelectItem value="sugestao">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Sugestão
                    </div>
                  </SelectItem>
                  <SelectItem value="anotacao">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Anotação
                    </div>
                  </SelectItem>
                  <SelectItem value="questao">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Questão
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {replyingTo && (
                <Badge variant="outline">
                  Respondendo...
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ml-2"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {editingId && (
                <Badge variant="outline">
                  Editando...
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setNewComment("");
                    }}
                    className="ml-2"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>

            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                replyingTo
                  ? "Digite sua resposta..."
                  : "Adicione um comentário, sugestão ou anotação..."
              }
              rows={4}
              className="resize-none"
            />

            <div className="flex justify-end gap-2">
              {(replyingTo || editingId) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingId(null);
                    setNewComment("");
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                {editingId ? 'Atualizar' : replyingTo ? 'Responder' : 'Enviar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {topLevelComments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
