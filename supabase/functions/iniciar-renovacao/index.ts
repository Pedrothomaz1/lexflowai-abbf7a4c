// Inicia uma renovação de contrato (#13 master spec v2).
// Cria registro em contract_renovacoes + (opcional) contract_request vinculada.
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
    const contrato_id_origem = String(body?.contrato_id_origem ?? "");
    const criar_requisicao = Boolean(body?.criar_requisicao ?? true);
    const observacao = body?.observacao ? String(body.observacao) : null;

    if (!contrato_id_origem) {
      return new Response(JSON.stringify({ ok: false, error: "contrato_id_origem ausente" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contrato } = await supabase
      .from("contratos")
      .select("id, titulo, tipo, organization_id, fornecedor_id, valor_total")
      .eq("id", contrato_id_origem)
      .maybeSingle();

    if (!contrato) {
      return new Response(JSON.stringify({ ok: false, error: "Contrato não encontrado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Cria renovação
    const { data: renovacao, error: renoErr } = await supabase
      .from("contract_renovacoes")
      .insert({
        organization_id: contrato.organization_id,
        contrato_id_origem,
        status: "iniciada",
        observacao,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (renoErr || !renovacao) {
      return new Response(JSON.stringify({ ok: false, error: renoErr?.message ?? "Falha ao criar renovação" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. (opcional) cria requisição vinculada
    let requisicao_id: string | null = null;
    if (criar_requisicao) {
      const { data: req2 } = await supabase
        .from("contract_requests")
        .insert({
          organization_id: contrato.organization_id,
          titulo: `Renovação — ${contrato.titulo}`,
          descricao: `Renovação do contrato ${contrato.titulo}.`,
          tipo_contrato: contrato.tipo,
          departamento: "Jurídico",
          urgencia: "media",
          solicitante_nome: user.email ?? "Sistema",
          solicitante_email: user.email ?? "",
          status: "pendente",
          valor_estimado: contrato.valor_total,
          justificativa: "Renovação automática gerada pelo sistema.",
        })
        .select("id")
        .maybeSingle();

      requisicao_id = req2?.id ?? null;

      if (requisicao_id) {
        await supabase
          .from("contract_renovacoes")
          .update({ requisicao_id })
          .eq("id", renovacao.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, renovacao_id: renovacao.id, requisicao_id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("iniciar-renovacao error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
