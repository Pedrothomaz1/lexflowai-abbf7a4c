// Extrai campos estruturados e riscos de um contrato via Google Gemini (function calling).
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

const MODEL = "gemini-2.5-flash";

// Schema sem additionalProperties / $schema (Gemini não suporta)
const FUNCTION_DECLARATION = {
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
            confianca: { type: "number" },
            trecho_origem: { type: "string" },
          },
          required: ["campo", "valor", "confianca"],
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
            confianca: { type: "number" },
          },
          required: ["tipo_risco", "severidade", "descricao", "confianca"],
        },
      },
    },
    required: ["campos", "riscos"],
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

    const { data: ctt, error: ctErr } = await supabase
      .from("contratos")
      .select("id, organization_id")
      .eq("id", contrato_id)
      .maybeSingle();
    if (ctErr || !ctt) return json(200, { ok: false, error: "Contrato não encontrado" });
    const orgId = ctt.organization_id;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json(200, { ok: false, error: "GEMINI_API_KEY não configurado" });

    const sys = "Você é um analista de contratos. Extraia campos estruturados (incluindo bloco financeiro: forma/condição de pagamento, parcelas, vencimentos, índice e periodicidade de reajuste, multa de atraso, juros de mora e dados bancários quando presentes) e riscos do texto fornecido. Use confiança baixa quando o campo for ambíguo ou ausente. Responda em português chamando a função registrar_analise_estruturada.";
    const userMsg = `Analise o contrato abaixo e chame a ferramenta registrar_analise_estruturada com os campos e riscos identificados.\n\n${texto.slice(0, 30000)}`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        tools: [{ functionDeclarations: [FUNCTION_DECLARATION] }],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["registrar_analise_estruturada"] },
        },
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (aiRes.status === 429) return json(200, { ok: false, error: "Limite de uso de IA atingido. Tente em instantes." });
    if (aiRes.status === 403) return json(200, { ok: false, error: "GEMINI_API_KEY inválida ou sem permissão." });
    if (aiRes.status === 400) {
      const t = await aiRes.text();
      console.error("Gemini 400", t);
      return json(200, { ok: false, error: "Requisição inválida ao Gemini." });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json(200, { ok: false, error: "Falha na IA" });
    }

    const aiBody = await aiRes.json();
    const partsArr = aiBody?.candidates?.[0]?.content?.parts ?? [];
    const fc = partsArr.find((p: any) => p?.functionCall)?.functionCall;
    if (!fc?.args) {
      console.error("Gemini sem functionCall", JSON.stringify(aiBody).slice(0, 500));
      return json(200, { ok: false, error: "IA não retornou estrutura esperada" });
    }
    const parsed = fc.args as { campos?: any[]; riscos?: any[] };

    const campos = Array.isArray(parsed.campos) ? parsed.campos : [];
    const riscos = Array.isArray(parsed.riscos) ? parsed.riscos : [];

    const extracoesPayload = campos.map((c) => ({
      organization_id: orgId,
      contrato_id,
      campo: String(c.campo).slice(0, 100),
      valor_extraido: c.valor != null ? String(c.valor) : null,
      confianca: typeof c.confianca === "number" ? Math.max(0, Math.min(1, c.confianca)) : null,
      trecho_origem: c.trecho_origem ?? null,
      modelo: MODEL,
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
