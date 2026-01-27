import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { use2FA } from "@/hooks/use2FA";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Copy, Check, Key, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

const TwoFactorSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    loading,
    status,
    setupData,
    fetchStatus,
    initiateSetup,
    verifyAndEnable,
    disable,
    cancelSetup
  } = use2FA();

  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchStatus();
    }
  }, [user, authLoading, navigate, fetchStatus]);

  // Generate QR code locally when setupData changes
  useEffect(() => {
    if (setupData?.otpauthUrl && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, setupData.otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch((err) => {
        console.error('Error generating QR code:', err);
        // Fallback to data URL
        QRCode.toDataURL(setupData.otpauthUrl, {
          width: 200,
          margin: 2
        }).then(setQrCodeDataUrl).catch(console.error);
      });
    }
  }, [setupData?.otpauthUrl]);

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast({ title: "Chave copiada!" });
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData?.backupCodes) {
      await navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
      toast({ title: "Códigos de backup copiados!" });
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyCode.length !== 6) return;
    const success = await verifyAndEnable(verifyCode);
    if (success) {
      setVerifyCode("");
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) return;
    const success = await disable(disableCode);
    if (success) {
      setShowDisableDialog(false);
      setDisableCode("");
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Autenticação de Dois Fatores
            </h1>
            <p className="text-muted-foreground mt-1">
              Adicione uma camada extra de segurança à sua conta
            </p>
          </div>
          {status?.enabled && (
            <Badge variant="default" className="bg-green-600">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.enabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  2FA Ativado
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  2FA Desativado
                </>
              )}
            </CardTitle>
            <CardDescription>
              {status?.enabled
                ? `Ativado em ${new Date(status.verifiedAt!).toLocaleDateString('pt-BR')}`
                : "Proteja sua conta com autenticação de dois fatores usando um aplicativo autenticador."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status?.enabled ? (
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
                disabled={loading}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Desativar 2FA
              </Button>
            ) : !setupData ? (
              <Button onClick={initiateSetup} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Configurar 2FA
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Setup Flow */}
        {setupData && !status?.enabled && (
          <>
            {/* Step 1: QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
                  Escaneie o QR Code
                </CardTitle>
                <CardDescription>
                  Use um aplicativo autenticador como Google Authenticator, Authy ou 1Password para escanear o código.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <canvas ref={canvasRef} className="w-48 h-48" />
                  {qrCodeDataUrl && !canvasRef.current && (
                    <img src={qrCodeDataUrl} alt="QR Code para 2FA" className="w-48 h-48" />
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Ou insira a chave manualmente:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={setupData.secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chave com {setupData.secret.length} caracteres Base32
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Backup Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
                  Salve os Códigos de Backup
                </CardTitle>
                <CardDescription>
                  Guarde estes códigos em um lugar seguro. Você pode usá-los para acessar sua conta caso perca o dispositivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cada código só pode ser usado uma vez. Guarde-os em um local seguro.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-muted-foreground" />
                      {code}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyBackupCodes}
                >
                  {copiedBackupCodes ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar todos os códigos
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Step 3: Verify */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">3</span>
                  Verifique o Código
                </CardTitle>
                <CardDescription>
                  Digite o código de 6 dígitos mostrado no seu aplicativo autenticador para confirmar a configuração.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={setVerifyCode}
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
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={cancelSetup}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerifyAndEnable}
                    disabled={loading || verifyCode.length !== 6}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Ativar 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Disable Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Desativar 2FA
              </DialogTitle>
              <DialogDescription>
                Para desativar a autenticação de dois fatores, digite o código atual do seu aplicativo autenticador.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={disableCode}
                  onChange={setDisableCode}
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
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDisableDialog(false);
                    setDisableCode("");
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDisable}
                  disabled={loading || disableCode.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldOff className="h-4 w-4 mr-2" />
                  )}
                  Desativar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TwoFactorSettings;
