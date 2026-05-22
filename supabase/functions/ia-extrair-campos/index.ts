// Extrai campos estruturados e riscos de um contrato via Lovable AI (tool calling).
// Input: { contrato_id: string, texto: string }
// Persiste em ai_extractions (campos + confiança) e ai_risk_reviews (riscos).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TOOL = {
  type: "function",
  function: {
    name: "registrar_analise_estruturada",
    description: "Registra campos extraídos do contrato e riscos identificados, cada um com score de confiança de 0 a 1.",
    parameters: {
      type: "object",
      properties: {
        campos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              campo: { type: "string", description: "Use SOMENTE estes nomes quando o valor estiver no contrato: parte_contratante, parte_contratada, valor_total, data_inicio, data_fim, vigencia, objeto, multa_rescisoria, foro, forma_pagamento (boleto|pix|ted|cartao|debito_automatico), condicao_pagamento (à vista|30 dias|parcelado|etc), numero_parcelas, dia_vencimento, valor_parcela, data_primeiro_vencimento, indice_reajuste (IPCA|IGPM|INPC|etc), periodicidade_reajuste (anual|semestral|mensal), multa_atraso_pct, juros_mora_pct, banco, agencia, conta, pix, favorecido" },
              valor: { type: "string" },
              confianca: { type: "number", minimum: 0, maximum: 1 },
              trecho_origem: { type: "string" },
            },
            required: ["campo", "valor", "confianca"],
            additionalProperties: false,
          },
        },
        riscos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clausula: { type: "string" },
              tipo_risco: { type: "string", description: "Ex: financeiro, juridico, operacional, prazo, garantia, propriedade_intelectual" },
              severidade: { type: "string", enum: ["alta", "media", "baixa"] },
              descricao: { type: "string" },
              recomendacao: { type: "string" },
              trecho_origem: { type: "string" },
              confianca: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["tipo_risco", "severidade", "descricao", "confianca"],
            additionalProperties: false,
          },
        },
      },
      required: ["campos", "riscos"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const { contrato_id, texto } = await req.json().catch(() => ({}));
    if (!contrato_id || typeof texto !== "string" || texto.length < 50) {
      return json(200, { ok: false, error: "contrato_id e texto (>=50 chars) obrigatórios" });
    }

    // Resolve org via contrato (RLS garante visibilidade)
    const { data: ctt, error: ctErr } = await supabase
      .from("contratos")
      .select("id, organization_id")
      .eq("id", contrato_id)
      .maybeSingle();
    if (ctErr || !ctt) return json(200, { ok: false, error: "Contrato não encontrado" });
    const orgId = ctt.organization_id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(200, { ok: false, error: "LOVABLE_API_KEY não configurado" });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um analista de contratos. Extraia campos estruturados e riscos do texto fornecido. Use confiança baixa quando o campo for ambíguo ou ausente. Responda em português." },
          { role: "user", content: `Analise o contrato abaixo e chame a ferramenta registrar_analise_estruturada com os campos e riscos identificados.\n\n${texto.slice(0, 30000)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "registrar_analise_estruturada" } },
      }),
    });

    if (aiRes.status === 429) return json(200, { ok: false, error: "Limite de uso de IA atingido. Tente em instantes." });
    if (aiRes.status === 402) return json(200, { ok: false, error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json(200, { ok: false, error: "Falha na IA" });
    }

    const aiBody = await aiRes.json();
    const toolCall = aiBody?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return json(200, { ok: false, error: "IA não retornou estrutura esperada" });
    }
    let parsed: { campos: any[]; riscos: any[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return json(200, { ok: false, error: "IA retornou JSON inválido" });
    }

    const campos = Array.isArray(parsed.campos) ? parsed.campos : [];
    const riscos = Array.isArray(parsed.riscos) ? parsed.riscos : [];

    const extracoesPayload = campos.map((c) => ({
      organization_id: orgId,
      contrato_id,
      campo: String(c.campo).slice(0, 100),
      valor_extraido: c.valor != null ? String(c.valor) : null,
      confianca: typeof c.confianca === "number" ? Math.max(0, Math.min(1, c.confianca)) : null,
      trecho_origem: c.trecho_origem ?? null,
      modelo: "google/gemini-3-flash-preview",
      status: "pendente",
      created_by: userId,
    }));

    const riscosPayload = riscos.map((r) => ({
      organization_id: orgId,
      contrato_id,
      clausula: r.clausula ?? null,
      tipo_risco: String(r.tipo_risco).slice(0, 80),
      severidade: ["alta", "media", "baixa"].includes(r.severidade) ? r.severidade : "media",
      descricao: r.descricao ?? null,
      recomendacao: r.recomendacao ?? null,
      trecho_origem: r.trecho_origem ?? null,
      confianca: typeof r.confianca === "number" ? Math.max(0, Math.min(1, r.confianca)) : null,
      status: "pendente",
      created_by: userId,
    }));

    let extracoesInseridas = 0;
    let riscosInseridos = 0;
    if (extracoesPayload.length) {
      const { error, count } = await supabase.from("ai_extractions").insert(extracoesPayload, { count: "exact" });
      if (error) console.error("insert extractions", error);
      else extracoesInseridas = count ?? extracoesPayload.length;
    }
    if (riscosPayload.length) {
      const { error, count } = await supabase.from("ai_risk_reviews").insert(riscosPayload, { count: "exact" });
      if (error) console.error("insert risks", error);
      else riscosInseridos = count ?? riscosPayload.length;
    }

    return json(200, {
      ok: true,
      extracoes_inseridas: extracoesInseridas,
      riscos_inseridos: riscosInseridos,
    });
  } catch (e) {
    console.error(e);
    return json(200, { ok: false, error: (e as Error).message });
  }
});
