import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  versao_termos: z.string().trim().min(1).max(20).optional(),
  versao_privacidade: z.string().trim().min(1).max(20).optional(),
  organization_id: z.string().uuid().optional(),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT and derive user_id from verified token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authenticatedUserId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid body", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { versao_termos, versao_privacidade, organization_id } = parsed.data;

    // Always derive user_id from verified JWT — ignore any client-supplied user_id
    const user_id = authenticatedUserId;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log(`Registering LGPD consent for verified user: ${user_id}, IP: ${ipAddress}`);

    let resolvedOrgId = organization_id;

    if (!resolvedOrgId) {
      const { data: memberData } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (memberData?.organization_id) {
        resolvedOrgId = memberData.organization_id;
      } else {
        resolvedOrgId = "00000000-0000-0000-0000-000000000001";
      }
    } else {
      // If client provided an org, verify membership before trusting it
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user_id)
        .eq("organization_id", resolvedOrgId)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership) {
        resolvedOrgId = "00000000-0000-0000-0000-000000000001";
      }
    }

    const complianceLog = {
      tipo_evento: "consent_given",
      entidade: "termos_e_privacidade",
      user_id,
      ip_address: ipAddress,
      organization_id: resolvedOrgId,
      dados_afetados: {
        versao_termos: versao_termos || "1.0",
        versao_privacidade: versao_privacidade || "1.0",
        aceite_em: new Date().toISOString(),
        user_agent: userAgent,
      },
      base_legal: "LGPD Art. 7º, I - Consentimento do titular",
      justificativa: "Aceite de Termos de Uso e Política de Privacidade durante autenticação",
    };

    const { data, error } = await supabaseAdmin
      .from("compliance_logs")
      .insert(complianceLog)
      .select()
      .single();

    if (error) {
      console.error("Error inserting compliance log:", error);
      return new Response(
        JSON.stringify({ error: "Failed to register consent" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, log_id: data.id, message: "Consent registered successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error in registrar-aceite-lgpd:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
