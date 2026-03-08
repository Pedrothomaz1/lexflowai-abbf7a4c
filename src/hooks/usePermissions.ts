import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface MFARequirement {
  is_required: boolean;
  grace_period_days: number;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setMfaRequired(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch user permissions via role_permissions join
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('[usePermissions] Role fetch error:', roleError);
        setLoading(false);
        return;
      }

      if (roleData?.role) {
        // Fetch permissions + MFA requirement in parallel (was sequential — saves ~300ms)
        const [permResult, mfaResult] = await Promise.all([
          supabase
            .from('role_permissions')
            .select('permission_id, permissions (name)')
            .eq('role', roleData.role),
          supabase
            .from('mfa_requirements')
            .select('is_required, grace_period_days')
            .eq('role', roleData.role)
            .maybeSingle(),
        ]);

        if (permResult.error) {
          console.error('[usePermissions] Permission fetch error:', permResult.error);
        } else {
          const permNames = permResult.data?.map((p: any) => p.permissions?.name).filter(Boolean) || [];
          setPermissions(permNames);
        }

        if (mfaResult.error) {
          console.error('[usePermissions] MFA requirement fetch error:', mfaResult.error);
        } else {
          setMfaRequired(mfaResult.data?.is_required || false);
        }
      }
    } catch (err) {
      console.error('[usePermissions] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    return perms.some(p => permissions.includes(p));
  }, [permissions]);

  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    return perms.every(p => permissions.includes(p));
  }, [permissions]);

  // Check permission for specific categories
  const canViewContracts = hasPermission('contract:read') || hasPermission('contract:read_all');
  const canCreateContracts = hasPermission('contract:create');
  const canApproveContracts = hasPermission('contract:approve');
  const canDeleteContracts = hasPermission('contract:delete');
  
  const canViewSuppliers = hasPermission('supplier:read') || hasPermission('supplier:read_all');
  const canViewSupplierBanking = hasPermission('supplier:view_banking');
  
  const canViewFinancial = hasPermission('financial:read');
  const canApproveFinancial = hasPermission('financial:approve');
  const canExportFinancial = hasPermission('financial:export');
  
  const canViewAudit = hasPermission('audit:read');
  const canExportAudit = hasPermission('audit:export');
  
  const canManageUsers = hasPermission('user:manage_roles');
  const isSystemAdmin = hasPermission('system:admin');

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    mfaRequired,
    // Convenience flags
    canViewContracts,
    canCreateContracts,
    canApproveContracts,
    canDeleteContracts,
    canViewSuppliers,
    canViewSupplierBanking,
    canViewFinancial,
    canApproveFinancial,
    canExportFinancial,
    canViewAudit,
    canExportAudit,
    canManageUsers,
    isSystemAdmin,
    refresh: fetchPermissions,
  };
}
