import { supabase } from "@/integrations/supabase/client";

/**
 * Registra evento de uso do produto. Fire-and-forget — nunca quebra fluxo.
 * organization_id é resolvido via RLS no INSERT (current_user_org()).
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, any> = {},
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar organization do usuário (1ª org ativa)
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) return;

    await supabase.from("product_events").insert({
      organization_id: membership.organization_id,
      user_id: user.id,
      event_name: eventName,
      properties,
    });
  } catch (err) {
    // Telemetria não pode bloquear UX
    console.debug("[analytics] tracking failed", err);
  }
}
