// Cron diário LexFlow (#13 master spec v2).
// Executa 3 verificações idempotentes (1x/dia por contrato/obrigação):
//   1. alertas_obrigacoes — obrigações vencendo em <=7 dias
//   2. alertas_renovacao — contratos vencendo em <=30 dias com renovacao_automatica desligada
//   3. sla_aprovacoes — passos de aprovação com due_at vencido
// Sempre retorna HTTP 200 com summary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth obrigatória via CRON_SECRET (header only — nunca via query string)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const provided = req.headers.get("x-cron-secret") || bearer;
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const summary = { obrigacoes: 0, renovacoes: 0, sla: 0, erros: [] as string[] };

  try {
    // 1. Obrigações vencendo em 7 dias
    const limite7 = new Date(); limite7.setDate(limite7.getDate() + 7);
    const { data: obrigs } = await supabase
      .from("contract_obligations")
      .select("id, organization_id, contrato_id, titulo, data_vencimento")
      .neq("status", "concluido")
      .lte("data_vencimento", limite7.toISOString().slice(0, 10));

    for (const o of obrigs ?? []) {
      // Idempotência: 1 alerta/dia por obrigação
      const { data: jaExiste } = await supabase
        .from("contract_alerts")
        .select("id")
        .eq("organization_id", o.organization_id)
        .eq("contrato_id", o.contrato_id)
        .eq("tipo_alerta", "obrigacao")
        .eq("data_alerta", today)
        .ilike("titulo", `%${o.id}%`)
        .maybeSingle();
      if (jaExiste) continue;

      await supabase.from("contract_alerts").insert({
        organization_id: o.organization_id,
        contrato_id: o.contrato_id,
        tipo_alerta: "obrigacao",
        titulo: `Obrigação vencendo: ${o.titulo} [${o.id}]`,
        mensagem: `Vence em ${o.data_vencimento}`,
        data_alerta: today,
        dias_antecedencia: 7,
      });
      summary.obrigacoes++;
    }

    // 2. Renovação — contratos com data_fim em 30 dias e sem renovação iniciada
    const limite30 = new Date(); limite30.setDate(limite30.getDate() + 30);
    const { data: ctos } = await supabase
      .from("contratos")
      .select("id, organization_id, titulo, data_fim, renovacao_automatica")
      .not("data_fim", "is", null)
      .lte("data_fim", limite30.toISOString().slice(0, 10))
      .gte("data_fim", today)
      .in("status", ["vigente", "assinado"]);

    for (const c of ctos ?? []) {
      const { data: jaExiste } = await supabase
        .from("contract_alerts")
        .select("id")
        .eq("organization_id", c.organization_id)
        .eq("contrato_id", c.id)
        .eq("tipo_alerta", "renovacao")
        .eq("data_alerta", today)
        .maybeSingle();
      if (jaExiste) continue;

      await supabase.from("contract_alerts").insert({
        organization_id: c.organization_id,
        contrato_id: c.id,
        tipo_alerta: "renovacao",
        titulo: `Renovação próxima: ${c.titulo}`,
        mensagem: `Vence em ${c.data_fim}. Renovação automática: ${c.renovacao_automatica ? "sim" : "não"}.`,
        data_alerta: today,
        dias_antecedencia: 30,
      });
      summary.renovacoes++;
    }

    // 3. SLA — passos de aprovação com due_at vencido
    const nowIso = new Date().toISOString();
    const { data: steps } = await supabase
      .from("approval_steps")
      .select("id, organization_id, contrato_id, due_at")
      .eq("status", "pendente")
      .not("due_at", "is", null)
      .lt("due_at", nowIso);

    for (const s of steps ?? []) {
      const { data: jaExiste } = await supabase
        .from("contract_alerts")
        .select("id")
        .eq("organization_id", s.organization_id)
        .eq("contrato_id", s.contrato_id)
        .eq("tipo_alerta", "sla_aprovacao")
        .eq("data_alerta", today)
        .ilike("titulo", `%${s.id}%`)
        .maybeSingle();
      if (jaExiste) continue;

      await supabase.from("contract_alerts").insert({
        organization_id: s.organization_id,
        contrato_id: s.contrato_id,
        tipo_alerta: "sla_aprovacao",
        titulo: `SLA estourado: passo de aprovação [${s.id}]`,
        mensagem: `Vencido em ${s.due_at}`,
        data_alerta: today,
        dias_antecedencia: 0,
      });
      summary.sla++;
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron-lexflow-diario", e);
    summary.erros.push(String(e));
    return new Response(JSON.stringify({ ok: false, summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
