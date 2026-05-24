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

    const { envelope_id, motivo } = (await req.json()) as { envelope_id?: string; motivo?: string };
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

    // ZapSign: DELETE /docs/{token}/
    if (envelope.provedor_envelope_id) {
      const r = await fetch(`${ZAPSIGN_BASE}/docs/${envelope.provedor_envelope_id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ZAP_TOKEN}` },
      });
      if (!r.ok && r.status !== 404) {
        const b = await r.text().catch(() => "");
        console.error("zapsign delete error", r.status, b);
        return json(200, { ok: false, error: "Falha ao cancelar na ZapSign" });
      }
    }

    await admin
      .from("signature_envelopes")
      .update({
        status: "cancelado",
        cancelled_at: new Date().toISOString(),
        cancel_reason: motivo || null,
      })
      .eq("id", envelope.id)
      .select()
      .maybeSingle();

    await admin.from("signature_events").insert([{
      organization_id: envelope.organization_id,
      envelope_id: envelope.id,
      tipo: "envelope_cancelado",
      descricao: motivo ? `Cancelado: ${motivo}` : "Envelope cancelado",
      payload: { por: userId },
    }]);

    return json(200, { ok: true });
  } catch (e) {
    console.error("zapsign-cancelar-envelope error", e);
    return json(500, { ok: false, error: "Erro interno" });
  }
});
