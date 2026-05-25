import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_TO = "pedrothomaz1@gmail.com";

function fmtBRL(centavos: number | null) {
  if (centavos == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const provided = req.headers.get("x-cron-secret") || bearer;
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isoToday = today.toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const { data: orgs } = await admin.from("organizations")
    .select("id, nome, plano, status, trial_ends_at, proximo_vencimento, ultimo_pagamento_em, valor_mensal_centavos")
    .in("status", ["ativa", "pendente_aprovacao"]);

  const alerts: Array<{ org: any; tipo: string; data_alvo: string; dias: number }> = [];
  for (const org of orgs || []) {
    if (org.trial_ends_at) {
      for (const d of [7, 3, 1, 0, -1]) {
        if (org.trial_ends_at === addDays(d)) {
          alerts.push({ org, tipo: d < 0 ? "trial_vencido" : "trial_expirando", data_alvo: org.trial_ends_at, dias: d });
        }
      }
    }
    if (org.proximo_vencimento) {
      for (const d of [7, 3, 0, -1, -5]) {
        if (org.proximo_vencimento === addDays(d)) {
          alerts.push({
            org,
            tipo: d > 0 ? "vencimento_proximo" : d === 0 ? "vencimento_hoje" : d === -1 ? "pagamento_atrasado" : "inadimplencia_critica",
            data_alvo: org.proximo_vencimento, dias: d,
          });
        }
      }
    }
  }

  const labels: Record<string, string> = {
    trial_expirando: "Trial expira em breve",
    trial_vencido: "Trial expirou ontem",
    vencimento_proximo: "Mensalidade vence em breve",
    vencimento_hoje: "Mensalidade vence hoje",
    pagamento_atrasado: "Pagamento atrasado (1 dia)",
    inadimplencia_critica: "Inadimplência crítica (5 dias) — considere suspender",
  };
  const severityFor = (tipo: string): 'info' | 'warn' | 'danger' => {
    if (tipo === "inadimplencia_critica" || tipo === "trial_vencido") return 'danger';
    if (tipo === "pagamento_atrasado" || tipo === "vencimento_hoje") return 'warn';
    return 'info';
  };

  let sent = 0, skipped = 0;

  for (const a of alerts) {
    const { data: existing } = await admin.from("billing_alerts_log").select("id")
      .eq("organization_id", a.org.id).eq("tipo", a.tipo).eq("data_alvo", a.data_alvo).maybeSingle();
    if (existing) { skipped++; continue; }

    const label = a.tipo === "trial_expirando" ? `Trial expira em ${a.dias} dia(s)`
      : a.tipo === "vencimento_proximo" ? `Mensalidade vence em ${a.dias} dia(s)`
      : labels[a.tipo] ?? a.tipo;

    let ok = false;
    try {
      const { error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'billing-alert-internal',
          recipientEmail: INTERNAL_TO,
          idempotencyKey: `billing-${a.org.id}-${a.tipo}-${a.data_alvo}`,
          templateData: {
            label,
            cliente: a.org.nome,
            plano: a.org.plano,
            valor: fmtBRL(a.org.valor_mensal_centavos),
            dataAlvo: a.data_alvo,
            status: a.org.status,
            painelUrl: 'https://lexflowai.com.br/super-admin',
            severity: severityFor(a.tipo),
          },
        },
      });
      ok = !error;
    } catch (e) {
      console.error("billing-alert send error", e);
    }

    await admin.from("billing_alerts_log").insert({
      organization_id: a.org.id, tipo: a.tipo, data_alvo: a.data_alvo,
      destinatarios: [INTERNAL_TO],
      detalhes: { dias: a.dias, plano: a.org.plano, email_ok: ok, provider: 'lovable_emails' },
    });
    if (ok) sent++; else skipped++;
  }

  return new Response(JSON.stringify({ ok: true, date: isoToday, candidates: alerts.length, sent, skipped }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
