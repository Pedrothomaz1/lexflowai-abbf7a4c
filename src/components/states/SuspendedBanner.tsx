import { AlertCircle } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SYSTEM_MESSAGES } from "@/lib/system-messages";

/**
 * Banner sticky exibido quando a organização perde o status "ativa" no meio da sessão.
 * O ProtectedRoute já redireciona em /aguardando-aprovacao e /conta-suspensa,
 * este banner cobre o intervalo até o refresh ocorrer.
 */
export function SuspendedBanner() {
  const { organization, orgStatus } = useOrganization();

  if (!organization || !orgStatus || orgStatus === "ativa") return null;

  const message =
    orgStatus === "pendente_aprovacao"
      ? SYSTEM_MESSAGES.ORG_PENDING
      : SYSTEM_MESSAGES.ORG_SUSPENDED;

  return (
    <div className="sticky top-0 z-40 bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-2 shadow-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="font-medium">{message}</span>
      {organization.motivo_suspensao && (
        <span className="opacity-90">— {organization.motivo_suspensao}</span>
      )}
    </div>
  );
}
