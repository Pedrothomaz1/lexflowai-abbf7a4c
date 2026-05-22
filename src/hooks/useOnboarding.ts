import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

export type OnboardingStepKey =
  | "perfil"
  | "fornecedor"
  | "contrato"
  | "workflow"
  | "convidar_membro"
  | "notificacoes";

export interface OnboardingStepDef {
  key: OnboardingStepKey;
  title: string;
  description: string;
  cta: string;
  href: string;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    key: "perfil",
    title: "Complete seu perfil",
    description: "Confirme seu nome e dados básicos.",
    cta: "Abrir perfil",
    href: "/settings",
  },
  {
    key: "fornecedor",
    title: "Cadastre o primeiro fornecedor",
    description: "Adicione uma contraparte para vincular contratos.",
    cta: "Novo fornecedor",
    href: "/fornecedores",
  },
  {
    key: "contrato",
    title: "Cadastre o primeiro contrato",
    description: "Suba o PDF e ative os alertas automáticos.",
    cta: "Novo contrato",
    href: "/contratos",
  },
  {
    key: "workflow",
    title: "Configure um workflow",
    description: "Defina o fluxo de aprovação dos contratos.",
    cta: "Abrir workflows",
    href: "/workflows/builder",
  },
  {
    key: "convidar_membro",
    title: "Convide alguém do time",
    description: "Compartilhe o LexFlow com colegas.",
    cta: "Gerenciar membros",
    href: "/organization/members",
  },
  {
    key: "notificacoes",
    title: "Ajuste notificações",
    description: "Defina prazos e canais de alerta.",
    cta: "Notificações",
    href: "/notification-settings",
  },
];

interface ProfileFlags {
  onboarding_completed_at: string | null;
  onboarding_skipped: boolean;
  onboarding_checklist_dismissed: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [completedKeys, setCompletedKeys] = useState<Set<OnboardingStepKey>>(new Set());
  const [profileFlags, setProfileFlags] = useState<ProfileFlags | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;
  const organizationId = organization?.id;

  const refresh = useCallback(async () => {
    if (!userId || !organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: progress }, { data: profile }] = await Promise.all([
        supabase
          .from("onboarding_progress")
          .select("step_key")
          .eq("user_id", userId)
          .eq("organization_id", organizationId),
        supabase
          .from("profiles")
          .select("onboarding_completed_at, onboarding_skipped, onboarding_checklist_dismissed")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      setCompletedKeys(new Set((progress ?? []).map((p) => p.step_key as OnboardingStepKey)));
      setProfileFlags(
        (profile as ProfileFlags) ?? {
          onboarding_completed_at: null,
          onboarding_skipped: false,
          onboarding_checklist_dismissed: false,
        }
      );
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markStep = useCallback(
    async (key: OnboardingStepKey, metadata: Record<string, unknown> = {}) => {
      if (!user || !organization) return;
      // optimistic
      setCompletedKeys((prev) => new Set([...prev, key]));
      await supabase
        .from("onboarding_progress")
        .upsert(
          {
            user_id: user.id,
            organization_id: organization.id,
            step_key: key,
            metadata,
          },
          { onConflict: "user_id,organization_id,step_key" }
        );
    },
    [user, organization]
  );

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ onboarding_completed_at: now })
      .eq("id", user.id)
      .select()
      .maybeSingle();
    setProfileFlags((p) => (p ? { ...p, onboarding_completed_at: now } : p));
  }, [user]);

  const skipOnboarding = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_skipped: true, onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .maybeSingle();
    setProfileFlags((p) =>
      p ? { ...p, onboarding_skipped: true, onboarding_completed_at: new Date().toISOString() } : p
    );
  }, [user]);

  const dismissChecklist = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_checklist_dismissed: true })
      .eq("id", user.id)
      .select()
      .maybeSingle();
    setProfileFlags((p) => (p ? { ...p, onboarding_checklist_dismissed: true } : p));
  }, [user]);

  const totalSteps = ONBOARDING_STEPS.length;
  const completedCount = ONBOARDING_STEPS.filter((s) => completedKeys.has(s.key)).length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isComplete = completedCount === totalSteps || !!profileFlags?.onboarding_completed_at;
  const needsWizard = !profileFlags?.onboarding_completed_at && !profileFlags?.onboarding_skipped;
  const showChecklist =
    !!profileFlags &&
    !profileFlags.onboarding_checklist_dismissed &&
    completedCount < totalSteps;

  return {
    loading,
    steps: ONBOARDING_STEPS,
    completedKeys,
    completedCount,
    totalSteps,
    progressPct,
    isComplete,
    needsWizard,
    showChecklist,
    profileFlags,
    markStep,
    completeOnboarding,
    skipOnboarding,
    dismissChecklist,
    refresh,
  };
}
