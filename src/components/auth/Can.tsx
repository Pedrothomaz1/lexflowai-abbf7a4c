import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

interface CanProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Permission gate por bloco. Lê permissões do backend (RLS-aware) via usePermissions.
 * UX-only: a segurança real está nas RLS policies e edge functions.
 */
export function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  loadingFallback = null,
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) return <>{loadingFallback}</>;

  let allowed = true;
  if (permission) allowed = allowed && hasPermission(permission);
  if (anyOf?.length) allowed = allowed && hasAnyPermission(anyOf);
  if (allOf?.length) allowed = allowed && hasAllPermissions(allOf);

  return <>{allowed ? children : fallback}</>;
}

interface RoleGateProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { userRole } = useUserRole();
  if (!userRole || !roles.includes(userRole)) return <>{fallback}</>;
  return <>{children}</>;
}

interface SuperAdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuperAdminGate({ children, fallback = null }: SuperAdminGateProps) {
  const { isSuperAdmin, loading } = useSuperAdmin();
  if (loading) return null;
  return <>{isSuperAdmin ? children : fallback}</>;
}
