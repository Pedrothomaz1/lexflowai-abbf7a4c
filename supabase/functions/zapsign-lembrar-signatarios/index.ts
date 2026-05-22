import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ZAPSIGN_BASE = "https://api.zapsign.com.br/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json(401, { ok: false, error: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAP_TOKEN = Deno.env.get("ZAPSIGN_API_TOKEN");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return json(401, { ok: false, error: "Unauthorized" });
    const userId = claims.claims.sub;

    const { envelope_id, signer_id } = (await req.json()) as {
      envelope_id?: string;
      signer_id?: string;
    };
    if (!envelope_id) return json(200, { ok: false, error: "envelope_id obrigatório" });
    if (!ZAP_TOKEN) return json(200, { ok: false, error: "ZAPSIGN_API_TOKEN não configurado" });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: envelope } = await admin
      .from("signature_envelopes")
      .select("*")
      .eq("id", envelope_id)
      .maybeSingle();
    if (!envelope) return json(200, { ok: false, error: "Envelope não encontrado" });

    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", envelope.organization_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) return json(200, { ok: false, error: "Sem acesso" });

    // Carrega signatários alvo
    const query = admin
      .from("signature_signers")
      .select("*")
      .eq("envelope_id", envelope.id)
      .eq("status", "pendente");
    const { data: pendentes } = signer_id
      ? await query.eq("id", signer_id)
      : await query;

    if (!pendentes || pendentes.length === 0) {
      return json(200, { ok: false, error: "Nenhum signatário pendente para notificar" });
    }

    let enviados = 0;
    let erros = 0;
    for (const s of pendentes) {
      if (!s.provedor_signer_id) { erros++; continue; }
      // ZapSign: POST /signers/{signer_token}/resend/
      const r = await fetch(`${ZAPSIGN_BASE}/signers/${s.provedor_signer_id}/resend/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ZAP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "email" }),
      });
      if (r.ok) enviados++;
      else {
        erros++;
        const b = await r.text().catch(() => "");
        console.error("resend error", s.email, r.status, b);
      }
    }

    await admin.from("signature_events").insert([{
      organization_id: envelope.organization_id,
      envelope_id: envelope.id,
      tipo: "lembrete_enviado",
      descricao: `Lembrete enviado: ${enviados} sucesso(s), ${erros} erro(s)`,
      payload: { por: userId, signer_id: signer_id ?? null },
    }]);

    return json(200, { ok: true, enviados, erros });
  } catch (e) {
    console.error("zapsign-lembrar-signatarios error", e);
    return json(500, { ok: false, error: "Erro interno" });
  }
});
