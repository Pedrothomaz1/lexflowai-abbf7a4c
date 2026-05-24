import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { ONBOARDING_STEPS, renderTemplate, type OnboardingStep } from "../_shared/onboarding-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://lexflowai.com.br";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "LexFlow <onboarding@resend.dev>";

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
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(supabaseUrl, serviceKey);

  // Kill switch
  const { data: settings } = await admin
    .from("onboarding_settings")
    .select("enabled")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.enabled) {
    return new Response(JSON.stringify({ skipped: true, reason: "onboarding_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const resend = new Resend(resendKey);

  // Orgs ativas criadas nos últimos 8 dias
  const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, nome, created_at, status")
    .eq("status", "ativa")
    .gte("created_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ org_id: string; step: number; error: string }> = [];

  for (const org of orgs ?? []) {
    const age = daysSince(org.created_at);
    // Steps elegíveis = todos os do passado que ainda não passaram
    const eligible = ONBOARDING_STEPS.filter((s) => s > 0 && s <= age) as OnboardingStep[];
    if (eligible.length === 0) continue;

    // Quais já foram enviados?
    const { data: alreadySent } = await admin
      .from("onboarding_email_log")
      .select("step")
      .eq("organization_id", org.id);
    const sentSteps = new Set((alreadySent ?? []).map((r: any) => r.step));

    // Buscar dono da org (owner mais antigo ativo)
    const { data: ownerMember } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .in("role_in_org", ["owner", "admin", "super_admin"])
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!ownerMember?.user_id) {
      skipped++;
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", ownerMember.user_id)
      .maybeSingle();

    if (!profile?.email) {
      skipped++;
      continue;
    }

    for (const step of eligible) {
      if (sentSteps.has(step)) continue;

      const tpl = renderTemplate(step, {
        ownerNome: profile.full_name,
        orgNome: org.nome,
        appUrl: APP_URL,
      });

      try {
        const { error: mailErr } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [profile.email],
          subject: tpl.subject,
          html: tpl.html,
        });

        await admin.from("onboarding_email_log").insert({
          organization_id: org.id,
          user_id: ownerMember.user_id,
          email: profile.email,
          step,
          status: mailErr ? "failed" : "sent",
          error_message: mailErr ? String(mailErr.message || mailErr) : null,
        });

        if (mailErr) {
          errors.push({ org_id: org.id, step, error: String(mailErr.message || mailErr) });
        } else {
          sent++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ org_id: org.id, step, error: msg });
        await admin.from("onboarding_email_log").insert({
          organization_id: org.id,
          user_id: ownerMember.user_id,
          email: profile.email,
          step,
          status: "failed",
          error_message: msg,
        });
      }
    }
  }

  return new Response(
    JSON.stringify({
      processed_orgs: orgs?.length ?? 0,
      sent,
      skipped,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
