import { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

interface MFAStatus {
  twoFARequired: boolean;
  twoFAEnabled: boolean;
  mfaRequiredByRole: boolean;
}

export const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [twoFAVerified, setTwoFAVerified] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const checkMFAStatus = useCallback(async () => {
    if (!user) {
      setCheckingMFA(false);
      return;
    }

    try {
      // Check if user has 2FA enabled
      const { data: twoFAData, error: twoFAError } = await supabase
        .from('user_2fa_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (twoFAError) {
        console.error('[ProtectedRoute] 2FA check error:', twoFAError);
      }

      const twoFAEnabled = twoFAData?.is_enabled || false;

      // Check if MFA is required by role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      let mfaRequiredByRole = false;

      if (!roleError && roleData?.role) {
        const { data: mfaReqData } = await supabase
          .from('mfa_requirements')
          .select('is_required')
          .eq('role', roleData.role)
          .maybeSingle();

        mfaRequiredByRole = mfaReqData?.is_required || false;
      }

      // 2FA is required if: user has it enabled OR their role requires it
      const twoFARequired = twoFAEnabled || mfaRequiredByRole;

      setMfaStatus({
        twoFARequired,
        twoFAEnabled,
        mfaRequiredByRole,
      });

      // Check permission if required
      if (requiredPermission) {
        const { data: permData } = await supabase
          .rpc('has_permission', { 
            _user_id: user.id, 
            _permission: requiredPermission 
          });
        setHasPermission(permData || false);
      } else {
        setHasPermission(true);
      }
    } catch (err) {
      console.error('[ProtectedRoute] MFA check failed:', err);
      setMfaStatus({
        twoFARequired: false,
        twoFAEnabled: false,
        mfaRequiredByRole: false,
      });
      setHasPermission(true);
    } finally {
      setCheckingMFA(false);
    }
  }, [user, requiredPermission]);

  useEffect(() => {
    // Check if user already verified 2FA this session
    const verified = sessionStorage.getItem('2fa_verified');
    if (verified === 'true') {
      setTwoFAVerified(true);
    }
    
    checkMFAStatus();
  }, [checkMFAStatus]);

  const handleTwoFASuccess = () => {
    sessionStorage.setItem('2fa_verified', 'true');
    setTwoFAVerified(true);
  };

  const handleTwoFACancel = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('2fa_verified');
  };

  if (loading || checkingMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Skip 2FA verification for the 2FA settings page itself
  const isSettingUp2FA = location.pathname === '/settings/2fa';

  // If 2FA is enabled and not verified, show verification screen
  if (mfaStatus?.twoFARequired && !twoFAVerified && !isSettingUp2FA) {
    // If role requires MFA but user hasn't set it up, redirect to setup
    if (mfaStatus.mfaRequiredByRole && !mfaStatus.twoFAEnabled) {
      return <Navigate to="/settings/2fa" state={{ required: true }} replace />;
    }
    
    return (
      <TwoFactorVerification
        onSuccess={handleTwoFASuccess}
        onCancel={handleTwoFACancel}
      />
    );
  }

  // Check permission
  if (requiredPermission && hasPermission === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página. 
            Entre em contato com um administrador se acredita que isso é um erro.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
