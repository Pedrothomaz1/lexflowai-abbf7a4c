import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle, Key } from "lucide-react";
import { use2FA } from "@/hooks/use2FA";

interface TwoFactorVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({ onSuccess, onCancel }: TwoFactorVerificationProps) => {
  const { verifyCode, loading } = use2FA();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    setError(null);
    
    if (useBackupCode) {
      if (code.length < 8) {
        setError("Código de backup inválido");
        return;
      }
    } else {
      if (code.length !== 6) {
        setError("Digite os 6 dígitos");
        return;
      }
    }

    const isValid = await verifyCode(code);
    
    if (isValid) {
      onSuccess();
    } else {
      setError("Código inválido. Tente novamente.");
      setCode("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length >= (useBackupCode ? 8 : 6)) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Verificação em Duas Etapas</CardTitle>
          <CardDescription>
            {useBackupCode
              ? "Digite um dos seus códigos de backup"
              : "Digite o código de 6 dígitos do seu aplicativo autenticador"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center" onKeyDown={handleKeyDown}>
            {useBackupCode ? (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full max-w-xs text-center font-mono text-lg tracking-widest border rounded-md p-3 bg-background"
                maxLength={9}
                autoFocus
              />
            ) : (
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            )}
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={loading || code.length < (useBackupCode ? 8 : 6)}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Verificar
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode("");
                setError(null);
              }}
            >
              <Key className="h-3 w-3" />
              {useBackupCode
                ? "Usar código do autenticador"
                : "Usar código de backup"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
