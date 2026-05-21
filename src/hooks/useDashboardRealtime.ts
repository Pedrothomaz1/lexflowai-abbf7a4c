import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Subscribe nas tabelas críticas e invalida queries do dashboard.
 */
export function useDashboardRealtime() {
  const qc = useQueryClient();
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;

    const ch = supabase
      .channel(`dashboard-${organization.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_approvals", filter: orgFilter }, () => {
        qc.invalidateQueries({ queryKey: ["dash", "aprovacoes_pendentes"] });
        qc.invalidateQueries({ queryKey: ["dash", "aprovacoes_acao"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_alerts", filter: orgFilter }, () => {
        qc.invalidateQueries({ queryKey: ["dash", "prazos_criticos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_obligations", filter: orgFilter }, () => {
        qc.invalidateQueries({ queryKey: ["dash", "obrigacoes_atraso"] });
        qc.invalidateQueries({ queryKey: ["dash", "obrigacoes_vencidas"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [organization?.id, qc]);
}
