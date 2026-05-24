// Wrapper sem JWT chamado por trigger AFTER UPDATE em contratos quando status='assinado'.
// Revalida estado no DB (idempotência via email_financeiro_notificado_em),
// invoca enviar-notificacao-financeiro com service-role, marca contrato como notificado.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { contratoId } = await req.json().catch(() => ({}));
    if (!contratoId || typeof contratoId !== "string") {
      return json({ success: false, error: "contratoId obrigatório" }, 200);
    }

    const { data: contrato, error: cErr } = await supabase
      .from("contratos")
      .select("id, status, organization_id, email_financeiro_notificado_em")
      .eq("id", contratoId)
      .maybeSingle();

    if (cErr || !contrato) {
      console.log("Contrato não encontrado", contratoId, cErr?.message);
      return json({ success: false, error: "Contrato não encontrado" }, 200);
    }

    if (contrato.status !== "assinado") {
      return json({ success: false, skipped: "status_nao_assinado" }, 200);
    }
    if (contrato.email_financeiro_notificado_em) {
      return json({ success: true, skipped: "ja_notificado" }, 200);
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("email_financeiro")
      .eq("id", contrato.organization_id)
      .maybeSingle();

    const emailFinanceiro = org?.email_financeiro?.trim();
    if (!emailFinanceiro) {
      console.log("Org sem email_financeiro", contrato.organization_id);
      return json({ success: false, skipped: "sem_email_financeiro" }, 200);
    }

    // Reusa a edge function existente com service-role (modo interno).
    const invokeRes = await fetch(`${supabaseUrl}/functions/v1/enviar-notificacao-financeiro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        tipo: "contrato",
        contratoId,
        emailFinanceiro,
      }),
    });

    const result = await invokeRes.json().catch(() => ({}));
    if (!invokeRes.ok || !result?.success) {
      console.error("Falha ao enviar notificação", invokeRes.status, result);
      return json({ success: false, error: "Falha ao enviar", details: result }, 200);
    }

    const { error: updErr } = await supabase
      .from("contratos")
      .update({ email_financeiro_notificado_em: new Date().toISOString() })
      .eq("id", contratoId)
      .select()
      .maybeSingle();

    if (updErr) console.error("Falha ao marcar notificado", updErr);

    return json({ success: true, emailId: result?.emailId }, 200);
  } catch (err) {
    console.error("auto-notificar-financeiro error", err);
    return json({ success: false, error: "Erro interno" }, 200);
  }
});
