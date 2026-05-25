import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  nome?: string;
  email?: string;
  telefone?: string | null;
  empresa?: string | null;
  cnpj?: string | null;
  usuarios_estimados?: number | null;
  plano_interesse?: string | null;
  mensagem?: string | null;
}

const INTERNAL_TO = "pedrothomaz1@gmail.com";
const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", business: "Business", enterprise: "Enterprise",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as LeadPayload;

    const nome = (body.nome || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    if (!nome || nome.length < 2 || nome.length > 120) return json({ ok: false, error: "Nome inválido" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return json({ ok: false, error: "E-mail inválido" });
    }
    const plano = body.plano_interesse && PLAN_LABELS[body.plano_interesse] ? body.plano_interesse : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0].trim()) || "unknown";
    const since = new Date(Date.now() - 600_000).toISOString();
    const { count: rlCount } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("ip_address", ip).eq("endpoint_key", "lead-novo-plano").gte("window_start", since);
    if ((rlCount ?? 0) >= 5) return json({ ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." });
    await supabase.from("rate_limits").insert({
      ip_address: ip, endpoint_key: "lead-novo-plano", count: 1, window_start: new Date().toISOString(),
    });

    const { data: lead, error } = await supabase.from("sales_leads").insert({
      nome, email,
      telefone: body.telefone?.toString().slice(0, 30) ?? null,
      empresa: body.empresa?.toString().slice(0, 200) ?? null,
      cnpj: body.cnpj?.toString().slice(0, 20) ?? null,
      usuarios_estimados: typeof body.usuarios_estimados === "number" ? body.usuarios_estimados : null,
      plano_interesse: plano,
      mensagem: body.mensagem?.toString().slice(0, 2000) ?? null,
      status: "novo",
    }).select("id").single();

    if (error || !lead) {
      console.error("[lead-novo-plano] insert error", error);
      return json({ ok: false, error: "Falha ao registrar contato" });
    }

    const primeiroNome = nome.split(" ")[0];
    const planoLabel = plano ? PLAN_LABELS[plano] : undefined;

    // Notificação interna + confirmação para o lead — via Lovable Emails
    await Promise.allSettled([
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'lead-internal-notification',
          recipientEmail: INTERNAL_TO,
          idempotencyKey: `lead-internal-${lead.id}`,
          templateData: {
            origem: 'planos',
            nome, email,
            telefone: body.telefone || undefined,
            empresa: body.empresa || undefined,
            cnpj: body.cnpj || undefined,
            usuariosEstimados: body.usuarios_estimados ?? undefined,
            planoInteresse: planoLabel,
            mensagem: body.mensagem || undefined,
            leadId: lead.id,
            painelUrl: 'https://lexflowai.com.br/super-admin',
          },
        },
      }),
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'lead-confirmation',
          recipientEmail: email,
          idempotencyKey: `lead-confirm-${lead.id}`,
          templateData: { primeiroNome, planoLabel },
        },
      }),
    ]);

    return json({ ok: true });
  } catch (err) {
    console.error("[lead-novo-plano] fatal", err);
    return json({ ok: false, error: "Erro inesperado" });
  }
});
