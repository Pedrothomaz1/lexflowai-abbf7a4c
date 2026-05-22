import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Sessão expirada" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (userErr || !caller) return json({ ok: false, error: "Sessão expirada" });

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isSA } = await admin.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSA) return json({ ok: false, error: "Acesso negado: apenas super-admins" });

    const body = await req.json().catch(() => ({}));
    const targetOrgId: string = (body?.target_organization_id || "").trim();
    const targetUserId: string | null = body?.target_user_id || null;
    const motivo: string = (body?.motivo || "").trim();

    if (!targetOrgId) return json({ ok: false, error: "Organização é obrigatória" });
    if (motivo.length < 10) return json({ ok: false, error: "Descreva o motivo (mín. 10 caracteres)" });
    if (motivo.length > 500) return json({ ok: false, error: "Motivo muito longo (máx. 500)" });

    // Resolve target org
    const { data: org } = await admin
      .from("organizations")
      .select("id, nome, status")
      .eq("id", targetOrgId)
      .maybeSingle();
    if (!org) return json({ ok: false, error: "Organização não encontrada" });

    // Pick target user: explicit or owner of org
    let userIdToImpersonate = targetUserId;
    if (!userIdToImpersonate) {
      const { data: owner } = await admin
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", targetOrgId)
        .eq("role_in_org", "owner")
        .limit(1)
        .maybeSingle();
      userIdToImpersonate = owner?.user_id || null;
      if (!userIdToImpersonate) {
        // fallback: qualquer membro
        const { data: any } = await admin
          .from("user_organizations")
          .select("user_id")
          .eq("organization_id", targetOrgId)
          .limit(1)
          .maybeSingle();
        userIdToImpersonate = any?.user_id || null;
      }
    }
    if (!userIdToImpersonate) return json({ ok: false, error: "Nenhum usuário disponível para impersonar" });

    // Get email via auth.admin
    const { data: targetAuth, error: targetErr } = await admin.auth.admin.getUserById(userIdToImpersonate);
    if (targetErr || !targetAuth?.user?.email) {
      return json({ ok: false, error: "Usuário-alvo sem e-mail válido" });
    }
    const targetEmail = targetAuth.user.email;

    // Anti-abuse: não pode impersonar outro super admin
    const { data: targetIsSA } = await admin.rpc("is_super_admin", { _user_id: userIdToImpersonate });
    if (targetIsSA) return json({ ok: false, error: "Não é permitido impersonar outro super-admin" });

    const baseUrl = Deno.env.get("SITE_URL") || "https://lexflowai.com.br";

    // Gera magic link (one-time)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[super-admin-impersonate] generateLink", linkErr);
      return json({ ok: false, error: "Falha ao gerar link de acesso" });
    }

    // Log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    const { data: log, error: logErr } = await admin
      .from("impersonation_logs")
      .insert({
        super_admin_id: caller.id,
        target_user_id: userIdToImpersonate,
        target_user_email: targetEmail,
        target_organization_id: org.id,
        target_organization_nome: org.nome,
        motivo,
        ip,
        user_agent: ua,
      })
      .select("id")
      .single();
    if (logErr) console.error("[super-admin-impersonate] log error", logErr);

    return json({
      ok: true,
      action_link: linkData.properties.action_link,
      target_email: targetEmail,
      log_id: log?.id || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[super-admin-impersonate] fatal", message);
    return json({ ok: false, error: message });
  }
});
