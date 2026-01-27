import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Loader2, Trash2, Upload, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string;
  onAvatarChange: (newUrl: string | null) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onAvatarChange,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Use apenas JPG, PNG ou WEBP.",
      });
      return;
    }

    // Validação de tamanho (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 2MB.",
      });
      return;
    }

    // Create preview and show dialog
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setShowPreviewDialog(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setShowPreviewDialog(false);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setShowPreviewDialog(false);
    setUploading(true);

    try {
      // Gera nome único para o arquivo
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${userId}/avatars/avatar-${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from("contratos-documentos")
        .upload(fileName, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtém URL pública
      const { data: urlData } = supabase.storage
        .from("contratos-documentos")
        .getPublicUrl(fileName);

      // Add cache-buster to force browser to reload the image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Atualiza profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      toast({ title: "Foto atualizada com sucesso!" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: error.message,
      });
    } finally {
      // Cleanup preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    setRemoving(true);

    try {
      // Atualiza profile para remover avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarChange(null);
      toast({ title: "Foto removida com sucesso!" });
    } catch (error: any) {
      console.error("Remove error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover foto",
        description: error.message,
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium text-muted-foreground">
        Foto de Perfil
      </Label>

      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-border">
          <AvatarImage src={currentAvatarUrl || undefined} alt={userName} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {/* Overlay on hover */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/50 rounded-full opacity-0 group-hover:opacity-100",
            "transition-opacity cursor-pointer",
            (uploading || removing) && "cursor-wait"
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? "Enviando..." : "Alterar"}
        </Button>

        {currentAvatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading || removing}
            className="text-destructive hover:text-destructive"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Remover
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG ou WEBP. Máximo 2MB.
      </p>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar foto de perfil</DialogTitle>
            <DialogDescription>
              Verifique se esta é a foto que deseja usar como avatar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-6">
            {previewUrl && (
              <Avatar className="h-32 w-32 border-2 border-border">
                <AvatarImage src={previewUrl} alt="Preview" />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelPreview}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {uploading ? "Enviando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
