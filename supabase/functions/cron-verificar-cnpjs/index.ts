import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const APP_URL = Deno.env.get("APP_URL") || "https://lexflowai.com.br";

async function notifyAdminsByEmail(
  admin: ReturnType<typeof createClient>,
  orgId: string,
  fornecedorId: string,
  fornecedorNome: string,
  newStatus: string,
  contratos: Array<{ numero_contrato: string; titulo: string }>,
) {
  try {
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id").eq("organization_id", orgId).eq("is_active", true)
      .in("role_in_org", ["admin", "super_admin", "owner"]);

    const userIds = (members ?? []).map((m: any) => m.user_id);
    if (userIds.length === 0) return;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, email_enabled").in("user_id", userIds);
    const enabledIds = new Set(
      (prefs ?? []).filter((p: any) => p.email_enabled !== false).map((p: any) => p.user_id),
    );
    const finalIds = userIds.filter((id) => !prefs?.some((p: any) => p.user_id === id) || enabledIds.has(id));

    const { data: profiles } = await admin.from("profiles")
      .select("email, full_name").in("id", finalIds);
    const emails = (profiles ?? []).map((p: any) => p.email).filter(Boolean);
    if (emails.length === 0) return;

    for (const email of emails) {
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'supplier-cnpj-status-change',
          recipientEmail: email,
          idempotencyKey: `cnpj-${fornecedorId}-${newStatus}-${email}`,
          templateData: {
            fornecedorNome,
            novoStatus: newStatus,
            contratos,
            fornecedoresUrl: `${APP_URL}/fornecedores`,
          },
        },
      });
    }
    console.log(`Email CNPJ ${newStatus} enfileirado para ${emails.length} admin(s) da org ${orgId}`);
  } catch (e) {
    console.error("Falha enviando email CNPJ inativo:", e);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;
const DELAY_MS = 25_000;

function cleanCnpj(v: string) { return (v || "").replace(/\D/g, ""); }
function normalizeStatus(s?: string): string {
  if (!s) return "erro_consulta";
  const k = s.toLowerCase().trim();
  if (k.startsWith("ativ")) return "ativa";
  if (k.startsWith("baix")) return "baixada";
  if (k.startsWith("susp")) return "suspensa";
  if (k.startsWith("inap")) return "inapta";
  if (k.startsWith("nul")) return "nula";
  return "erro_consulta";
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const provided = req.headers.get("x-cron-secret") || bearer;
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: fornecedores, error } = await admin.from("fornecedores")
    .select("id, nome, cnpj, cnpj_status, organization_id")
    .eq("is_active", true).not("cnpj", "is", null)
    .order("cnpj_verificado_em", { ascending: true, nullsFirst: true }).limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let processed = 0, inativados = 0;

  for (const f of fornecedores ?? []) {
    const cnpj = cleanCnpj(f.cnpj || "");
    if (cnpj.length !== 14) continue;

    try {
      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, { headers: { Accept: "application/json" } });

      if (res.status === 429) {
        await admin.from("cnpj_verification_log").insert({
          fornecedor_id: f.id, cnpj, status: "rate_limited",
          error_message: "Rate limit ReceitaWS", organization_id: f.organization_id,
        });
        await sleep(DELAY_MS * 2);
        continue;
      }

      if (!res.ok) {
        await admin.from("cnpj_verification_log").insert({
          fornecedor_id: f.id, cnpj, status: "erro_consulta",
          error_message: `HTTP ${res.status}`, organization_id: f.organization_id,
        });
        await sleep(DELAY_MS);
        continue;
      }

      const d = await res.json();
      if (d.status === "ERROR") {
        await admin.from("cnpj_verification_log").insert({
          fornecedor_id: f.id, cnpj, status: "erro_consulta",
          error_message: d.message || "Erro ReceitaWS", response: d, organization_id: f.organization_id,
        });
        await sleep(DELAY_MS);
        continue;
      }

      const newStatus = normalizeStatus(d.situacao);
      const situacaoData = d.data_situacao ? d.data_situacao.split("/").reverse().join("-") : null;

      await admin.from("fornecedores").update({
        cnpj_status: newStatus,
        cnpj_situacao_data: situacaoData,
        cnpj_verificado_em: new Date().toISOString(),
        cnpj_dados_receita: d,
      }).eq("id", f.id);

      await admin.from("cnpj_verification_log").insert({
        fornecedor_id: f.id, cnpj, status: newStatus,
        response: d, organization_id: f.organization_id,
      });

      if (newStatus !== "ativa" && (f.cnpj_status === "ativa" || f.cnpj_status === "nao_verificado" || !f.cnpj_status)) {
        inativados++;

        await admin.rpc("notify_org_members", {
          _org_id: f.organization_id,
          _tipo: "cnpj_inativo",
          _titulo: `CNPJ ${newStatus.toUpperCase()}: ${f.nome}`,
          _mensagem: `O CNPJ do fornecedor ${f.nome} consta como ${newStatus} na Receita Federal.`,
          _referencia_id: f.id,
          _referencia_tipo: "fornecedor",
        });

        const { data: contratos } = await admin.from("contratos")
          .select("id, numero_contrato, titulo").eq("fornecedor_id", f.id)
          .in("status", ["ativo", "em_aprovacao", "rascunho", "em_negociacao"]);

        for (const c of contratos ?? []) {
          await admin.from("contract_alerts").insert({
            contrato_id: c.id,
            organization_id: f.organization_id,
            tipo_alerta: "cnpj_inativo",
            titulo: `Fornecedor com CNPJ ${newStatus}: ${c.titulo}`,
            mensagem: `O fornecedor do contrato ${c.numero_contrato} está com CNPJ ${newStatus} na Receita Federal.`,
            data_alerta: new Date().toISOString().slice(0, 10),
            dias_antecedencia: 0,
          });
        }

        await notifyAdminsByEmail(
          admin, f.organization_id, f.id, f.nome, newStatus,
          (contratos ?? []).map((c) => ({ numero_contrato: c.numero_contrato, titulo: c.titulo })),
        );
      }

      processed++;
      await sleep(DELAY_MS);
    } catch (e) {
      console.error("Erro processando", f.id, e);
      await admin.from("cnpj_verification_log").insert({
        fornecedor_id: f.id, cnpj, status: "erro_consulta",
        error_message: String(e), organization_id: f.organization_id,
      });
    }
  }

  return new Response(JSON.stringify({ processed, inativados, total: fornecedores?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
