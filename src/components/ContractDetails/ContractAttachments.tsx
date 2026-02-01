import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

interface ContractAttachmentsProps {
  contratoId: string;
}

export function ContractAttachments({ contratoId }: ContractAttachmentsProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [contratoId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_attachments")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!organization?.id) {
        throw new Error("Organização não encontrada. Finalize o onboarding.");
      }

      const fileExt = file.name.split(".").pop();
      // Use user.id as folder to comply with storage RLS policies
      const fileName = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("contratos-documentos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("contratos-documentos")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("contract_attachments")
        .insert([{
          organization_id: organization.id,
          contrato_id: contratoId,
          nome_arquivo: file.name,
          arquivo_url: publicUrl,
          tipo_documento: file.type,
          tamanho_bytes: file.size,
          uploaded_by: user.id,
        }]);

      if (insertError) {
        if (insertError.message.includes("row-level security") || insertError.code === "42501") {
          throw new Error("Sem permissão para fazer upload de anexos. Verifique seu acesso.");
        }
        throw insertError;
      }

      toast({
        title: "Arquivo enviado!",
        description: `${file.name} foi adicionado aos anexos.`,
      });

      fetchAttachments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message,
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      const { error } = await supabase
        .from("contract_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;

      toast({
        title: "Anexo removido",
        description: `${attachment.nome_arquivo} foi removido.`,
      });

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message,
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return File;
    if (mimeType.includes('image')) return FileImage;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="cursor-pointer"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
        </div>
        {uploading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Carregando anexos...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum anexo ainda</p>
          <p className="text-xs mt-1">Faça upload de documentos relacionados</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {attachments.map((attachment, index) => {
              const Icon = getFileIcon(attachment.tipo_documento);
              return (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.nome_arquivo}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.tamanho_bytes)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(attachment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(attachment.arquivo_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
