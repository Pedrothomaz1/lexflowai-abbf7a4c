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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as LeadPayload;

    if (!body.email || !body.empresa) {
      return new Response(
        JSON.stringify({ ok: false, error: "Email e empresa são obrigatórios" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve user_id from auth header (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const { data: lead, error } = await supabase
      .from("enterprise_leads")
      .insert({
        nome: body.nome || "(sem nome)",
        email: body.email,
        empresa: body.empresa,
        telefone: body.telefone ?? null,
        cnpj: body.cnpj ?? null,
        num_usuarios_estimado: body.num_usuarios_estimado ?? null,
        mensagem: body.mensagem ?? null,
        source: body.source || "onboarding",
        user_id: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[lead-enterprise] insert error", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Notifica vendas via Resend (best-effort)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "LexFlow <noreply@lexflowai.com.br>",
            to: ["pedro.thomaz@veridianaquirino.com.br"],
            subject: `[Lead Enterprise] ${body.empresa}`,
            html: `
              <h2>Novo lead Enterprise</h2>
              <p><strong>Empresa:</strong> ${body.empresa}</p>
              <p><strong>Contato:</strong> ${body.nome} &lt;${body.email}&gt;</p>
              <p><strong>Telefone:</strong> ${body.telefone || "—"}</p>
              <p><strong>CNPJ:</strong> ${body.cnpj || "—"}</p>
              <p><strong>Usuários estimados:</strong> ${body.num_usuarios_estimado ?? "—"}</p>
              <p><strong>Mensagem:</strong></p>
              <blockquote>${(body.mensagem || "—").replace(/\n/g, "<br>")}</blockquote>
              <hr>
              <small>Origem: ${body.source} · ID: ${lead.id}</small>
            `,
          }),
        });
      } catch (mailErr) {
        console.warn("[lead-enterprise] email failed", mailErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, lead_id: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[lead-enterprise] fatal", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Erro inesperado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
