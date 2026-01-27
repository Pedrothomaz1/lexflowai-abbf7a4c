import { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  const [twoFARequired, setTwoFARequired] = useState<boolean | null>(null);
  const [twoFAVerified, setTwoFAVerified] = useState(false);
  const [checkingTwoFA, setCheckingTwoFA] = useState(true);

  const checkTwoFAStatus = useCallback(async () => {
    if (!user) {
      setCheckingTwoFA(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[ProtectedRoute] 2FA check error:', error);
        setTwoFARequired(false);
      } else {
        setTwoFARequired(data?.is_enabled || false);
      }
    } catch (err) {
      console.error('[ProtectedRoute] 2FA check failed:', err);
      setTwoFARequired(false);
    } finally {
      setCheckingTwoFA(false);
    }
  }, [user]);

  useEffect(() => {
    // Check if user already verified 2FA this session
    const verified = sessionStorage.getItem('2fa_verified');
    if (verified === 'true') {
      setTwoFAVerified(true);
    }
    
    checkTwoFAStatus();
  }, [checkTwoFAStatus]);

  const handleTwoFASuccess = () => {
    sessionStorage.setItem('2fa_verified', 'true');
    setTwoFAVerified(true);
  };

  const handleTwoFACancel = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('2fa_verified');
  };

  if (loading || checkingTwoFA) {
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
  if (twoFARequired && !twoFAVerified && !isSettingUp2FA) {
    return (
      <TwoFactorVerification
        onSuccess={handleTwoFASuccess}
        onCancel={handleTwoFACancel}
      />
    );
  }

  return <>{children}</>;
};
