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
const FROM = "LexFlow <noreply@lexflowai.com.br>";
const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as LeadPayload;

    const nome = (body.nome || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    if (!nome || nome.length < 2 || nome.length > 120) {
      return json({ ok: false, error: "Nome inválido" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return json({ ok: false, error: "E-mail inválido" });
    }
    const plano = body.plano_interesse && PLAN_LABELS[body.plano_interesse]
      ? body.plano_interesse
      : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error } = await supabase
      .from("sales_leads")
      .insert({
        nome,
        email,
        telefone: body.telefone?.toString().slice(0, 30) ?? null,
        empresa: body.empresa?.toString().slice(0, 200) ?? null,
        cnpj: body.cnpj?.toString().slice(0, 20) ?? null,
        usuarios_estimados: typeof body.usuarios_estimados === "number" ? body.usuarios_estimados : null,
        plano_interesse: plano,
        mensagem: body.mensagem?.toString().slice(0, 2000) ?? null,
        status: "novo",
      })
      .select("id")
      .single();

    if (error || !lead) {
      console.error("[lead-novo-plano] insert error", error);
      return json({ ok: false, error: "Falha ao registrar contato" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const planoLabel = plano ? PLAN_LABELS[plano] : "—";
      const internalHtml = `
        <h2 style="color:#1a5c3a">Novo lead em /planos</h2>
        <table style="font-family:Inter,Arial,sans-serif;font-size:14px">
          <tr><td><strong>Nome:</strong></td><td>${escapeHtml(nome)}</td></tr>
          <tr><td><strong>E-mail:</strong></td><td>${escapeHtml(email)}</td></tr>
          <tr><td><strong>Telefone:</strong></td><td>${escapeHtml(body.telefone || "—")}</td></tr>
          <tr><td><strong>Empresa:</strong></td><td>${escapeHtml(body.empresa || "—")}</td></tr>
          <tr><td><strong>CNPJ:</strong></td><td>${escapeHtml(body.cnpj || "—")}</td></tr>
          <tr><td><strong>Usuários estimados:</strong></td><td>${body.usuarios_estimados ?? "—"}</td></tr>
          <tr><td><strong>Plano de interesse:</strong></td><td>${escapeHtml(planoLabel)}</td></tr>
        </table>
        <p><strong>Mensagem:</strong></p>
        <blockquote style="border-left:3px solid #c9a84c;padding-left:12px;color:#444">
          ${escapeHtml(body.mensagem || "—").replace(/\n/g, "<br>")}
        </blockquote>
        <hr>
        <p><a href="https://lexflowai.com.br/super-admin">Abrir painel Super Admin → Leads</a></p>
        <small>Lead ID: ${lead.id}</small>
      `;

      const confirmHtml = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#1a5c3a">Recebemos seu contato, ${escapeHtml(nome.split(" ")[0])}!</h2>
          <p>Obrigado pelo interesse no <strong>LexFlow</strong>${plano ? ` — plano <strong>${escapeHtml(PLAN_LABELS[plano])}</strong>` : ""}.</p>
          <p>Nossa equipe vai entrar em contato em até <strong>1 dia útil</strong> para entender suas necessidades e liberar o acesso.</p>
          <p>Enquanto isso, você pode conhecer mais em <a href="https://lexflowai.com.br" style="color:#1a5c3a">lexflowai.com.br</a>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <small style="color:#888">LexFlow · Gestão preventiva de contratos</small>
        </div>
      `;

      await Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: [INTERNAL_TO],
            reply_to: email,
            subject: `[LexFlow] Novo lead: ${nome}${body.empresa ? ` (${body.empresa})` : ""}`,
            html: internalHtml,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: [email],
            subject: "Recebemos seu contato — LexFlow",
            html: confirmHtml,
          }),
        }),
      ]);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[lead-novo-plano] fatal", err);
    return json({ ok: false, error: "Erro inesperado" });
  }
});
