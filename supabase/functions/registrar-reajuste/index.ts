// Registra reajuste em contrato_reajustes e atualiza valor_total do contrato (#13).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contrato_id = String(body?.contrato_id ?? "");
    const indice = String(body?.indice ?? "").trim();
    const percentual = Number(body?.percentual);
    const vigencia_inicio = String(body?.vigencia_inicio ?? "");
    const observacao = body?.observacao ? String(body.observacao) : null;

    if (!contrato_id || !indice || !Number.isFinite(percentual) || !vigencia_inicio) {
      return new Response(JSON.stringify({ ok: false, error: "Campos obrigatórios: contrato_id, indice, percentual, vigencia_inicio" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contrato } = await supabase
      .from("contratos")
      .select("id, organization_id, valor_total")
      .eq("id", contrato_id)
      .maybeSingle();

    if (!contrato) {
      return new Response(JSON.stringify({ ok: false, error: "Contrato não encontrado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valor_anterior = Number(contrato.valor_total ?? 0);
    const valor_novo = +(valor_anterior * (1 + percentual / 100)).toFixed(2);

    const { data: reajuste, error: rErr } = await supabase
      .from("contract_reajustes")
      .insert({
        organization_id: contrato.organization_id,
        contrato_id,
        indice,
        percentual,
        valor_anterior,
        valor_novo,
        vigencia_inicio,
        observacao,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (rErr || !reajuste) {
      return new Response(JSON.stringify({ ok: false, error: rErr?.message ?? "Falha ao registrar reajuste" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza valor do contrato (UPDATE com .select().maybeSingle())
    await supabase
      .from("contratos")
      .update({ valor_total: valor_novo, updated_at: new Date().toISOString() })
      .eq("id", contrato_id)
      .select("id")
      .maybeSingle();

    return new Response(JSON.stringify({ ok: true, reajuste_id: reajuste.id, valor_anterior, valor_novo }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("registrar-reajuste error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
