import { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import { Loader2 } from "lucide-react";

// 2FA session token expiration (15 minutes for security)
const TWO_FA_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

// Generate a secure random token for 2FA session verification
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create cryptographic hash using SHA-256 via Web Crypto API
async function createTokenHash(userId: string, token: string, sessionId: string): Promise<string> {
  const data = `${userId}:${token}:${sessionId}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requireOrg?: boolean;
}

interface MFAStatus {
  twoFARequired: boolean;
  twoFAEnabled: boolean;
  mfaRequiredByRole: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermission,
  requireOrg = true 
}: ProtectedRouteProps) => {
  const { session, user, loading: authLoading } = useAuth();
  const { hasOrganization, hasInactiveOrganization, orgStatus, loading: orgLoading } = useOrganization();
  const location = useLocation();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [twoFAVerified, setTwoFAVerified] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

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
      // SECURITY: Fail closed - deny access on error rather than fail open
      setMfaStatus({
        twoFARequired: true, // Require 2FA on error for safety
        twoFAEnabled: false,
        mfaRequiredByRole: true,
      });
      setHasPermission(false); // Deny permission on error - fail closed
    } finally {
      setCheckingMFA(false);
    }
  }, [user, requiredPermission]);

  useEffect(() => {
    // Check if user already verified 2FA this session with secure token validation
    const verifyStoredToken = async () => {
      if (!user || !session) return;

      const storedToken = sessionStorage.getItem('2fa_token');
      const storedHash = sessionStorage.getItem('2fa_hash');

      if (storedToken && storedHash) {
        // Verify token integrity using SHA-256
        const expectedHash = await createTokenHash(user.id, storedToken, session.access_token.slice(-16));
        if (expectedHash === storedHash) {
          // Additional check: verify token was created recently (within 15 minutes)
          const tokenTimestamp = sessionStorage.getItem('2fa_timestamp');
          if (tokenTimestamp) {
            const tokenAge = Date.now() - parseInt(tokenTimestamp, 10);
            if (tokenAge < TWO_FA_TOKEN_EXPIRY_MS) {
              setTwoFAVerified(true);
              return;
            }
          }
        }
        // Invalid or expired token - clear it
        sessionStorage.removeItem('2fa_token');
        sessionStorage.removeItem('2fa_hash');
        sessionStorage.removeItem('2fa_timestamp');
      }
    };

    verifyStoredToken();
    checkMFAStatus();
  }, [checkMFAStatus, user, session]);

  // Onboarding status check (lightweight)
  useEffect(() => {
    if (!user) {
      setOnboardingDone(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarding_completed_at, onboarding_skipped")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const done = !!(data?.onboarding_completed_at || data?.onboarding_skipped);
        setOnboardingDone(done);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleTwoFASuccess = async () => {
    if (!user || !session) return;

    // Generate secure token and SHA-256 hash for 2FA session verification
    const token = generateSecureToken();
    const hash = await createTokenHash(user.id, token, session.access_token.slice(-16));

    sessionStorage.setItem('2fa_token', token);
    sessionStorage.setItem('2fa_hash', hash);
    sessionStorage.setItem('2fa_timestamp', Date.now().toString());
    setTwoFAVerified(true);
  };

  const handleTwoFACancel = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('2fa_token');
    sessionStorage.removeItem('2fa_hash');
    sessionStorage.removeItem('2fa_timestamp');
  };

  // Show loading while checking auth and MFA
  if (authLoading || checkingMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
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

  // Check organization requirement (only after auth and MFA checks)
  if (requireOrg) {
    if (orgLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-sm">Verificando organização...</p>
          </div>
        </div>
      );
    }

    // Org exists but is NOT active -> route to status screen
    if (hasInactiveOrganization) {
      const statusPaths = ['/aguardando-aprovacao', '/conta-suspensa'];
      if (!statusPaths.includes(location.pathname)) {
        if (orgStatus === 'suspensa' || orgStatus === 'cancelada') {
          return <Navigate to="/conta-suspensa" replace />;
        }
        return <Navigate to="/aguardando-aprovacao" replace />;
      }
    } else if (!hasOrganization) {
      // No organization at all -> waiting screen (orgs are created by super-admin)
      const allowedPaths = ['/waiting-for-invite', '/aceitar-convite'];
      if (!allowedPaths.includes(location.pathname)) {
        return <Navigate to="/waiting-for-invite" replace />;
      }
    }
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
