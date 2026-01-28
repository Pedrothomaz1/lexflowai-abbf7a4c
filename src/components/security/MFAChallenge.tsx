import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MFAChallengeProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  operation?: string;
  amount?: number;
  severity?: "normal" | "high" | "critical";
}

export function MFAChallenge({
  open,
  onSuccess,
  onCancel,
  operation = "esta operação",
  amount,
  severity = "normal",
}: MFAChallengeProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Digite o código completo de 6 dígitos");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.functions.invoke("totp-auth", {
        body: {
          action: "verify",
          userId: user?.id,
          token: code,
        },
      });

      if (verifyError) throw verifyError;

      if (data?.valid) {
        toast.success("Verificação concluída com sucesso");
        onSuccess();
      } else {
        setError("Código inválido. Tente novamente.");
        setCode("");
      }
    } catch (err) {
      console.error("[MFAChallenge] Verification error:", err);
      setError("Erro ao verificar código. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case "critical":
        return {
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          borderClass: "border-destructive/50",
          bgClass: "bg-destructive/5",
        };
      case "high":
        return {
          icon: <Shield className="h-8 w-8 text-warning" />,
          borderClass: "border-warning/50",
          bgClass: "bg-warning/5",
        };
      default:
        return {
          icon: <Shield className="h-8 w-8 text-primary" />,
          borderClass: "border-primary/20",
          bgClass: "bg-primary/5",
        };
    }
  };

  const { icon, borderClass, bgClass } = getSeverityStyles();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className={`sm:max-w-md ${borderClass}`}>
        <DialogHeader>
          <div className={`mx-auto mb-4 rounded-full p-4 ${bgClass}`}>
            {icon}
          </div>
          <DialogTitle className="text-center">
            Verificação de Segurança
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium">{operation}</span>
            {amount && (
              <span className="block mt-1 text-lg font-semibold text-foreground">
                R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="block mt-2">
              Digite o código do seu aplicativo autenticador para continuar.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={verifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={verifying}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            className="w-full sm:w-auto"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
