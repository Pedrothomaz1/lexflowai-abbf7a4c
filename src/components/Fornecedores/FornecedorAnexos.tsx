import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSignedFileUrl } from "@/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Upload,
  Loader2,
  FileText,
  Download,
  Trash2,
  File,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { handleDbError } from "@/utils/dbErrorHandler";

const TIPOS_DOCUMENTO = [
  "Contrato Social",
  "Certidão Negativa Federal",
  "Certidão Negativa Estadual",
  "Certidão Negativa Municipal",
  "FGTS",
  "INSS",
  "Alvará de Funcionamento",
  "Atestado de Capacidade Técnica",
  "Proposta Comercial",
  "Outros",
];

interface Anexo {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_documento: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

interface FornecedorAnexosProps {
  fornecedorId: string;
  readOnly?: boolean;
}

export function FornecedorAnexos({
  fornecedorId,
  readOnly = false,
}: FornecedorAnexosProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<string>("Outros");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnexos();
  }, [fornecedorId]);

  const fetchAnexos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fornecedor_anexos")
        .select("*")
        .eq("fornecedor_id", fornecedorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnexos(data || []);
    } catch (error: any) {
      console.error("Error fetching anexos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar anexos",
        description: handleDbError(error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB.",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get organization for storage RLS isolation
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      // Gera nome único para o arquivo com organization.id prefix for RLS isolation
      const fileName = orgMember?.organization_id
        ? `${orgMember.organization_id}/${user.id}/fornecedores/${fornecedorId}/${Date.now()}-${file.name}`
        : `${user.id}/fornecedores/${fornecedorId}/${Date.now()}-${file.name}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from("contratos-documentos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Salva registro no banco com o path do storage
      const { error: insertError } = await supabase
        .from("fornecedor_anexos")
        .insert({
          fornecedor_id: fornecedorId,
          nome_arquivo: file.name,
          arquivo_url: fileName,
          tipo_documento: tipoDocumento,
          tamanho_bytes: file.size,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({ title: "Anexo enviado com sucesso!" });
      fetchAnexos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar anexo",
        description: handleDbError(error).message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!anexoToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("fornecedor_anexos")
        .delete()
        .eq("id", anexoToDelete.id);

      if (error) throw error;

      toast({ title: "Anexo removido com sucesso!" });
      fetchAnexos();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover anexo",
        description: handleDbError(error).message,
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setAnexoToDelete(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    if (ext === "pdf") {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex-1 space-y-2">
            <Label>Tipo de Documento</Label>
            <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? "Enviando..." : "Enviar Arquivo"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {anexos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum anexo cadastrado</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anexos.map((anexo) => (
                <TableRow key={anexo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(anexo.nome_arquivo)}
                      <span className="truncate max-w-[200px]">
                        {anexo.nome_arquivo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {anexo.tipo_documento || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(anexo.tamanho_bytes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(anexo.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a
                          href={anexo.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAnexoToDelete(anexo);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o anexo "{anexoToDelete?.nome_arquivo}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
