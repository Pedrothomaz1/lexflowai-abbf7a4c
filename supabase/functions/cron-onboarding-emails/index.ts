import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://lexflowai.com.br";
const STEPS = [1, 3, 5, 7] as const;

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const provided = req.headers.get("x-cron-secret") || bearer;
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: settings } = await admin.from("onboarding_settings")
    .select("enabled").eq("id", 1).maybeSingle();
  if (!settings?.enabled) {
    return new Response(JSON.stringify({ skipped: true, reason: "onboarding_disabled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orgs, error } = await admin.from("organizations")
    .select("id, nome, created_at, status").eq("status", "ativa").gte("created_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let sent = 0, skipped = 0;
  const errors: Array<{ org_id: string; step: number; error: string }> = [];

  for (const org of orgs ?? []) {
    const age = daysSince(org.created_at);
    const eligible = STEPS.filter((s) => s <= age);
    if (eligible.length === 0) continue;

    const { data: alreadySent } = await admin.from("onboarding_email_log")
      .select("step").eq("organization_id", org.id);
    const sentSteps = new Set((alreadySent ?? []).map((r: any) => r.step));

    const { data: ownerMember } = await admin.from("organization_members")
      .select("user_id").eq("organization_id", org.id).eq("is_active", true)
      .in("role_in_org", ["owner", "admin", "super_admin"])
      .order("joined_at", { ascending: true }).limit(1).maybeSingle();
    if (!ownerMember?.user_id) { skipped++; continue; }

    const { data: profile } = await admin.from("profiles")
      .select("email, full_name").eq("id", ownerMember.user_id).maybeSingle();
    if (!profile?.email) { skipped++; continue; }

    for (const step of eligible) {
      if (sentSteps.has(step)) continue;

      const { error: invokeErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'onboarding-step',
          recipientEmail: profile.email,
          idempotencyKey: `onboarding-${org.id}-step-${step}`,
          templateData: {
            step,
            ownerNome: profile.full_name,
            orgNome: org.nome,
            appUrl: APP_URL,
          },
        },
      });

      const errMsg = invokeErr ? (invokeErr.message ?? String(invokeErr)) : null;
      await admin.from("onboarding_email_log").insert({
        organization_id: org.id,
        user_id: ownerMember.user_id,
        email: profile.email,
        step,
        status: invokeErr ? "failed" : "sent",
        error_message: errMsg,
      });
      if (invokeErr) {
        errors.push({ org_id: org.id, step, error: errMsg ?? "unknown" });
      } else {
        sent++;
      }
    }
  }

  return new Response(JSON.stringify({ processed_orgs: orgs?.length ?? 0, sent, skipped, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
