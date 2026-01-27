import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwoFASetupData {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

interface TwoFAStatus {
  enabled: boolean;
  verifiedAt: string | null;
}

export function use2FA() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);
  const [status, setStatus] = useState<TwoFAStatus | null>(null);

  const callTotpAuth = async (action: string, code?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Não autenticado");
    }

    const response = await supabase.functions.invoke('totp-auth', {
      body: { action, code }
    });

    if (response.error) {
      throw new Error(response.error.message || "Erro na operação");
    }

    return response.data;
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callTotpAuth('status');
      setStatus({
        enabled: data.enabled,
        verifiedAt: data.verifiedAt
      });
      return data;
    } catch (error) {
      console.error("[use2FA] Status error:", error);
      setStatus({ enabled: false, verifiedAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  const initiateSetup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callTotpAuth('setup');
      setSetupData({
        secret: data.secret,
        otpauthUrl: data.otpauthUrl,
        backupCodes: data.backupCodes
      });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar configuração";
      toast({
        variant: "destructive",
        title: "Erro ao configurar 2FA",
        description: message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const verifyAndEnable = useCallback(async (code: string) => {
    try {
      setLoading(true);
      const data = await callTotpAuth('verify-setup', code);
      
      if (data.valid && data.enabled) {
        setStatus({ enabled: true, verifiedAt: new Date().toISOString() });
        setSetupData(null);
        toast({
          title: "2FA ativado!",
          description: "Autenticação de dois fatores configurada com sucesso."
        });
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Código incorreto";
      toast({
        variant: "destructive",
        title: "Erro na verificação",
        description: message
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const verifyCode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      const data = await callTotpAuth('verify', code);
      return data.valid === true;
    } catch (error) {
      console.error("[use2FA] Verify error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async (code: string) => {
    try {
      setLoading(true);
      const data = await callTotpAuth('disable', code);
      
      if (data.disabled) {
        setStatus({ enabled: false, verifiedAt: null });
        setSetupData(null);
        toast({
          title: "2FA desativado",
          description: "Autenticação de dois fatores foi desativada."
        });
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Código incorreto";
      toast({
        variant: "destructive",
        title: "Erro ao desativar",
        description: message
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cancelSetup = useCallback(() => {
    setSetupData(null);
  }, []);

  return {
    loading,
    status,
    setupData,
    fetchStatus,
    initiateSetup,
    verifyAndEnable,
    verifyCode,
    disable,
    cancelSetup
  };
}
