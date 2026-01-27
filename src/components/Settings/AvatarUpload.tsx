import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);

    try {
      // Gera nome único para o arquivo
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatars/avatar-${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from("contratos-documentos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtém URL pública
      const { data: urlData } = supabase.storage
        .from("contratos-documentos")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

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
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    </div>
  );
}
