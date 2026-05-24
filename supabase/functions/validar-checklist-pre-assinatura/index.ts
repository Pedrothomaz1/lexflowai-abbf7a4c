// Valida o checklist pré-assinatura conforme master spec v2 (#11).
// Retorna sempre HTTP 200 com { ok, pendencias[] } — padrão LexFlow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Pendencia {
  criterio: string;
  detalhe: string;
}

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
    if (!contrato_id) {
      return new Response(JSON.stringify({ ok: false, pendencias: [{ criterio: "input", detalhe: "contrato_id ausente" }] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pendencias: Pendencia[] = [];

    // 1. Documento final definido
    const { data: contrato } = await supabase
      .from("contratos")
      .select("id, titulo, arquivo_url, fornecedor_id, valor_total, data_inicio, data_fim, status")
      .eq("id", contrato_id)
      .maybeSingle();

    if (!contrato) {
      return new Response(JSON.stringify({ ok: false, pendencias: [{ criterio: "contrato", detalhe: "Contrato não encontrado ou sem acesso" }] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contrato.arquivo_url) {
      pendencias.push({ criterio: "documento_final", detalhe: "Documento final do contrato não foi anexado" });
    }

    // 2. Campos obrigatórios
    if (!contrato.titulo) pendencias.push({ criterio: "campos_obrigatorios", detalhe: "Título ausente" });
    if (!contrato.valor_total) pendencias.push({ criterio: "campos_obrigatorios", detalhe: "Valor total ausente" });
    if (!contrato.data_inicio) pendencias.push({ criterio: "campos_obrigatorios", detalhe: "Data de início ausente" });

    // 3. Aprovações concluídas (novo modelo approval_steps + fallback contract_approvals)
    const { data: steps } = await supabase
      .from("approval_steps")
      .select("id, status")
      .eq("contrato_id", contrato_id);

    if (steps && steps.length > 0) {
      const pendentes = steps.filter((s: { status: string }) => s.status !== "aprovado");
      if (pendentes.length > 0) {
        pendencias.push({ criterio: "aprovacoes", detalhe: `${pendentes.length} passo(s) de aprovação pendente(s)` });
      }
    } else {
      const { data: legacy } = await supabase
        .from("contract_approvals")
        .select("status")
        .eq("contrato_id", contrato_id);
      if (!legacy || legacy.length === 0) {
        pendencias.push({ criterio: "aprovacoes", detalhe: "Nenhuma aprovação registrada" });
      } else if (legacy.some((a: { status: string }) => a.status !== "aprovado")) {
        pendencias.push({ criterio: "aprovacoes", detalhe: "Existem aprovações não finalizadas" });
      }
    }

    // 4. Anexos obrigatórios
    const { count: anexosCount } = await supabase
      .from("contract_attachments")
      .select("id", { count: "exact", head: true })
      .eq("contrato_id", contrato_id);

    if (!anexosCount || anexosCount === 0) {
      pendencias.push({ criterio: "anexos", detalhe: "Nenhum anexo vinculado ao contrato" });
    }

    // 5. Contraparte validada (fornecedor com CNPJ verificado)
    if (!contrato.fornecedor_id) {
      pendencias.push({ criterio: "contraparte", detalhe: "Fornecedor/contraparte não vinculado" });
    } else {
      const { data: fornecedor } = await supabase
        .from("fornecedores")
        .select("cnpj, cnpj_status, is_active")
        .eq("id", contrato.fornecedor_id)
        .maybeSingle();
      if (!fornecedor) {
        pendencias.push({ criterio: "contraparte", detalhe: "Fornecedor não encontrado" });
      } else if (fornecedor.is_active === false) {
        pendencias.push({ criterio: "contraparte", detalhe: "Fornecedor inativo" });
      } else if (fornecedor.cnpj && fornecedor.cnpj_status === "nao_verificado") {
        pendencias.push({ criterio: "contraparte", detalhe: "CNPJ do fornecedor não foi verificado" });
      }
    }

    // 6. Checklist manual (contract_checklist) — itens não satisfeitos
    const { data: checklist } = await supabase
      .from("contract_checklist")
      .select("criterio, satisfeito")
      .eq("contrato_id", contrato_id);

    if (checklist && checklist.length > 0) {
      checklist
        .filter((c: { satisfeito: boolean }) => !c.satisfeito)
        .forEach((c: { criterio: string }) => {
          pendencias.push({ criterio: "checklist_manual", detalhe: `Item não validado: ${c.criterio}` });
        });
    }

    return new Response(JSON.stringify({ ok: pendencias.length === 0, pendencias }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validar-checklist-pre-assinatura error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
