import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(20).optional().nullable(),
  owner_email: z.string().trim().toLowerCase().email().max(255),
  owner_nome: z.string().trim().max(200).optional().default(""),
  plano: z.enum(["free", "pro", "business", "enterprise"]).optional().default("pro"),
  telefone: z.string().trim().max(40).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  estado: z.string().trim().max(40).optional().nullable(),
}).strict();

const cleanCnpj = (v?: string | null) => (v || "").replace(/\D/g, "");
const slugify = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const user = userData?.user;
    if (userErr || !user) return json({ ok: false, error: "Sessão expirada" });

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isSA } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSA) return json({ ok: false, error: "Acesso negado: apenas super-admins" });

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ ok: false, error: "Dados inválidos", details: parsed.error.flatten().fieldErrors });
    }
    const nome = parsed.data.nome;
    const cnpj = cleanCnpj(parsed.data.cnpj) || null;
    const ownerEmail = parsed.data.owner_email;
    const ownerNome = parsed.data.owner_nome ?? "";
    const plano = parsed.data.plano ?? "pro";
    const telefone = parsed.data.telefone ?? null;
    const cidade = parsed.data.cidade ?? null;
    const estado = parsed.data.estado ?? null;

    if (cnpj && cnpj.length !== 14) return json({ ok: false, error: "CNPJ inválido" });

    if (cnpj) {
      const { data: existing } = await admin.from("organizations")
        .select("id, nome").eq("cnpj", cnpj).maybeSingle();
      if (existing) return json({ ok: false, error: `CNPJ já cadastrado em "${existing.nome}"` });
    }

    const orgId = crypto.randomUUID();
    const slug = `${slugify(nome)}-${orgId.slice(0, 6)}`;
    const { error: orgErr } = await admin.from("organizations").insert({
      id: orgId, nome, slug, cnpj, telefone, cidade, estado, plano,
      status: "ativa", created_by: user.id,
      aprovada_em: new Date().toISOString(), aprovada_por: user.id,
    });
    if (orgErr) {
      console.error("[super-admin-create-client-org] org insert", orgErr);
      return json({ ok: false, error: "Falha ao criar organização." });
    }

    await admin.from("organization_invites").delete().eq("organization_id", orgId).eq("email", ownerEmail);

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: invErr } = await admin.from("organization_invites").insert({
      organization_id: orgId, email: ownerEmail, role_in_org: "owner",
      invited_by: user.id, expires_at: expiresAt,
    }).select("token").single();
    if (invErr || !invite) {
      console.error("[super-admin-create-client-org] invite insert", invErr);
      return json({ ok: false, error: invErr?.message || "Falha ao criar convite" });
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://lexflowai.com.br";
    const inviteUrl = `${baseUrl}/aceitar-convite?token=${invite.token}`;

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { error: invokeErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'client-account-ready',
          recipientEmail: ownerEmail,
          idempotencyKey: `client-account-ready-${orgId}`,
          templateData: {
            ownerNome,
            organizationName: nome,
            plano,
            inviteUrl,
            expiresInDays: 14,
          },
        },
      });
      if (invokeErr) {
        emailError = invokeErr.message ?? String(invokeErr);
        console.error("[super-admin-create-client-org] lovable email error", invokeErr);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : "erro desconhecido";
      console.error("[super-admin-create-client-org] lovable email throw", e);
    }

    try {
      await admin.from("onboarding_email_log").insert({
        organization_id: orgId, email: ownerEmail, step: 0,
        status: emailSent ? "sent" : "failed", error_message: emailError,
      });
    } catch (e) {
      console.warn("[super-admin-create-client-org] onboarding log skipped", e);
    }

    return json({
      ok: true, organization_id: orgId, invite_url: inviteUrl,
      email_sent: emailSent, email_error: emailError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[super-admin-create-client-org] fatal", message);
    return json({ ok: false, error: message });
  }
});
