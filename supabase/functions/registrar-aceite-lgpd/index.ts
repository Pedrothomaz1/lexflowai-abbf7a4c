import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for inserting logs
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { user_id, versao_termos, versao_privacidade, organization_id } = await req.json();

    // Validate required fields
    if (!user_id) {
      console.error("Missing user_id in request");
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture IP address from headers
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Capture user agent
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log(`Registering LGPD consent for user: ${user_id}, IP: ${ipAddress}`);

    // Resolve organization_id: use provided, fetch from user's membership, or use default
    let resolvedOrgId = organization_id;
    
    if (!resolvedOrgId) {
      // Try to fetch user's organization from membership
      const { data: memberData } = await supabaseAdmin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      
      if (memberData?.organization_id) {
        resolvedOrgId = memberData.organization_id;
        console.log(`Resolved organization_id from membership: ${resolvedOrgId}`);
      } else {
        // Use default organization for pre-onboarding consent logs
        // This is the legacy/default org used for users without an org yet
        resolvedOrgId = "00000000-0000-0000-0000-000000000001";
        console.log(`Using default organization for consent log: ${resolvedOrgId}`);
      }
    }

    // Prepare compliance log entry
    const complianceLog = {
      tipo_evento: "consent_given",
      entidade: "termos_e_privacidade",
      user_id: user_id,
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

    // Insert compliance log
    const { data, error } = await supabaseAdmin
      .from("compliance_logs")
      .insert(complianceLog)
      .select()
      .single();

    if (error) {
      console.error("Error inserting compliance log:", error);
      return new Response(
        JSON.stringify({ error: "Failed to register consent", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`LGPD consent registered successfully. Log ID: ${data.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        log_id: data.id,
        message: "Consent registered successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error in registrar-aceite-lgpd:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
