import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  nome?: string;
  email?: string;
  empresa?: string;
  telefone?: string | null;
  cnpj?: string | null;
  num_usuarios_estimado?: number | null;
  mensagem?: string | null;
  source?: string;
}

const INTERNAL_TO = "pedro.thomaz@veridianaquirino.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as LeadPayload;

    if (!body.email || !body.empresa) {
      return new Response(JSON.stringify({ ok: false, error: "Email e empresa são obrigatórios" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0].trim()) || "unknown";
    const since = new Date(Date.now() - 600_000).toISOString();
    const { count: rlCount } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("ip_address", ip).eq("endpoint_key", "lead-enterprise").gte("window_start", since);
    if ((rlCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("rate_limits").insert({
      ip_address: ip, endpoint_key: "lead-enterprise", count: 1, window_start: new Date().toISOString(),
    });

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const { data: lead, error } = await supabase.from("enterprise_leads").insert({
      nome: body.nome || "(sem nome)",
      email: body.email,
      empresa: body.empresa,
      telefone: body.telefone ?? null,
      cnpj: body.cnpj ?? null,
      num_usuarios_estimado: body.num_usuarios_estimado ?? null,
      mensagem: body.mensagem ?? null,
      source: body.source || "onboarding",
      user_id: userId,
    }).select("id").single();

    if (error) {
      console.error("[lead-enterprise] insert error", error);
      return new Response(JSON.stringify({ ok: false, error: "Não foi possível registrar a solicitação. Tente novamente." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notifica via Lovable Emails (best-effort)
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'lead-internal-notification',
          recipientEmail: INTERNAL_TO,
          idempotencyKey: `lead-enterprise-${lead.id}`,
          templateData: {
            origem: `Enterprise · ${body.source || 'onboarding'}`,
            nome: body.nome || "(sem nome)",
            email: body.email,
            telefone: body.telefone || undefined,
            empresa: body.empresa,
            cnpj: body.cnpj || undefined,
            usuariosEstimados: body.num_usuarios_estimado ?? undefined,
            mensagem: body.mensagem || undefined,
            leadId: lead.id,
            painelUrl: 'https://lexflowai.com.br/super-admin',
          },
        },
      });
    } catch (mailErr) {
      console.warn("[lead-enterprise] email failed", mailErr);
    }

    return new Response(JSON.stringify({ ok: true, lead_id: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[lead-enterprise] fatal", err);
    return new Response(JSON.stringify({ ok: false, error: "Erro inesperado. Tente novamente." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
