import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_TO = "pedrothomaz1@gmail.com";
const FROM = "LexFlow <onboarding@resend.dev>";

function fmtBRL(centavos: number | null) {
  if (centavos == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function sendEmail(resendKey: string, to: string[], subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (cronSecret && provided !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const resendKey = Deno.env.get("RESEND_API_KEY");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isoToday = today.toISOString().slice(0, 10);

  const addDays = (n: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // Carrega orgs ativas com billing
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, nome, plano, status, trial_ends_at, proximo_vencimento, ultimo_pagamento_em, valor_mensal_centavos")
    .in("status", ["ativa", "pendente_aprovacao"]);

  const alerts: Array<{ org: any; tipo: string; data_alvo: string; dias: number }> = [];

  for (const org of orgs || []) {
    // Trial expirando em 7, 3, 1 dias e expirado hoje
    if (org.trial_ends_at) {
      for (const d of [7, 3, 1, 0, -1]) {
        if (org.trial_ends_at === addDays(d)) {
          alerts.push({ org, tipo: d < 0 ? "trial_vencido" : "trial_expirando", data_alvo: org.trial_ends_at, dias: d });
        }
      }
    }
    // Vencimento de mensalidade em 7, 3 dias e atraso 1, 5 dias
    if (org.proximo_vencimento) {
      for (const d of [7, 3, 0, -1, -5]) {
        if (org.proximo_vencimento === addDays(d)) {
          alerts.push({
            org,
            tipo: d > 0 ? "vencimento_proximo" : d === 0 ? "vencimento_hoje" : d === -1 ? "pagamento_atrasado" : "inadimplencia_critica",
            data_alvo: org.proximo_vencimento,
            dias: d,
          });
        }
      }
    }
  }

  let sent = 0;
  let skipped = 0;

  for (const a of alerts) {
    // Idempotência
    const { data: existing } = await admin
      .from("billing_alerts_log")
      .select("id")
      .eq("organization_id", a.org.id)
      .eq("tipo", a.tipo)
      .eq("data_alvo", a.data_alvo)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    if (!resendKey) { skipped++; continue; }

    const labels: Record<string, string> = {
      trial_expirando: `Trial expira em ${a.dias} dia(s)`,
      trial_vencido: "Trial expirou ontem",
      vencimento_proximo: `Mensalidade vence em ${a.dias} dia(s)`,
      vencimento_hoje: "Mensalidade vence hoje",
      pagamento_atrasado: "Pagamento atrasado (1 dia)",
      inadimplencia_critica: "Inadimplência crítica (5 dias) — considere suspender",
    };

    const subj = `[LexFlow Cobrança] ${a.org.nome}: ${labels[a.tipo]}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px">
        <h2 style="color:#1a5c3a">${esc(labels[a.tipo])}</h2>
        <table style="font-size:14px">
          <tr><td><strong>Cliente:</strong></td><td>${esc(a.org.nome)}</td></tr>
          <tr><td><strong>Plano:</strong></td><td>${esc(a.org.plano)}</td></tr>
          <tr><td><strong>Valor mensal:</strong></td><td>${fmtBRL(a.org.valor_mensal_centavos)}</td></tr>
          <tr><td><strong>Data alvo:</strong></td><td>${a.data_alvo}</td></tr>
          <tr><td><strong>Status:</strong></td><td>${esc(a.org.status)}</td></tr>
        </table>
        <p><a href="https://lexflowai.com.br/super-admin">Abrir painel Super Admin</a></p>
      </div>`;

    const res = await sendEmail(resendKey, [INTERNAL_TO], subj, html);
    const ok = res.ok;

    await admin.from("billing_alerts_log").insert({
      organization_id: a.org.id,
      tipo: a.tipo,
      data_alvo: a.data_alvo,
      destinatarios: [INTERNAL_TO],
      detalhes: { dias: a.dias, plano: a.org.plano, email_ok: ok },
    });
    if (ok) sent++; else skipped++;
  }

  return new Response(JSON.stringify({ ok: true, date: isoToday, candidates: alerts.length, sent, skipped }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
