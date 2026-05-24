import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 120000;
const ASYNC_RESPONSE_DELAY_MS = 250;

type SkillId =
  | "contract-review"
  | "nda-triage"
  | "risk-assessment"
  | "compliance"
  | "full"
  | "auto";

function sanitize(content: string): string {
  return content.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, MAX_CONTENT_LENGTH);
}

function detectAuto(tipo: string | null | undefined): Exclude<SkillId, "auto"> {
  const t = (tipo || "").toLowerCase();
  if (/(nda|confidencial|sigilo|nao[-_ ]?divulg)/.test(t)) return "nda-triage";
  return "contract-review";
}

// =================== PROMPTS POR SKILL =====================
const PROMPTS: Record<Exclude<SkillId, "auto" | "full">, { system: string; tool: any }> = {
  "contract-review": {
    system: `Você é um revisor contratual sênior aplicando o playbook conservador da LexFlow. Analise cláusula a cláusula contra o padrão esperado. Classifique cada cláusula como 🟢 aceitavel, 🟡 atencao, 🔴 risco ou ⚫ ausente. Para cada item amarelo/vermelho/ausente, gere um redline sugerido. Categorias a mapear: identificacao, objeto, pagamento, reajuste, vigencia, rescisao, multas, garantias, responsabilidade, confidencialidade, propriedade_intelectual, forca_maior, compliance, disputa, seguros. Score 0-10 (0 sem risco, 10 risco altíssimo). Considere legislação brasileira (CC, CLT, LGPD, CDC) como default.`,
    tool: {
      type: "function",
      function: {
        name: "registrar_revisao_contratual",
        description: "Registra revisão cláusula a cláusula",
        parameters: {
          type: "object",
          properties: {
            score_risco: { type: "number" },
            resumo_executivo: { type: "string" },
            recomendacao: {
              type: "string",
              enum: ["aprovar", "aprovar_com_ressalvas", "negociar", "rejeitar"],
            },
            clausulas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoria: { type: "string" },
                  titulo: { type: "string" },
                  status: { type: "string", enum: ["aceitavel", "atencao", "risco", "ausente"] },
                  texto_original: { type: "string" },
                  problema: { type: "string" },
                  redline_sugerido: { type: "string" },
                  prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
                },
                required: ["categoria", "titulo", "status"],
              },
            },
          },
          required: ["score_risco", "resumo_executivo", "recomendacao", "clausulas"],
        },
      },
    },
  },

  "nda-triage": {
    system: `Você é um especialista em triagem de NDAs. Classifique o NDA em: aprovar (padrão), revisar (desvios negociáveis) ou rejeitar (inaceitável). Avalie: direção (mútuo/unilateral), definição de info confidencial, exclusões clássicas, prazo, obrigações do receptor, devolução, penalidades, residuals, non-solicitation, non-compete, indenização, lei aplicável, foro. Considere padrão brasileiro.`,
    tool: {
      type: "function",
      function: {
        name: "registrar_triagem_nda",
        description: "Registra triagem rápida de NDA",
        parameters: {
          type: "object",
          properties: {
            classificacao: { type: "string", enum: ["aprovar", "revisar", "rejeitar"] },
            tipo: { type: "string", enum: ["mutuo", "unilateral_favoravel", "unilateral_desfavoravel"] },
            vigencia_anos: { type: "number" },
            resumo: { type: "string" },
            pontos_atencao: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ponto: { type: "string" },
                  status: { type: "string", enum: ["ok", "atencao", "rejeitar"] },
                  recomendacao: { type: "string" },
                },
                required: ["ponto", "status"],
              },
            },
            red_flags: { type: "array", items: { type: "string" } },
          },
          required: ["classificacao", "resumo", "pontos_atencao"],
        },
      },
    },
  },

  "risk-assessment": {
    system: `Você é um avaliador de riscos jurídicos. Mapeie riscos em 8 categorias: contratual, regulatorio, trabalhista, tributario, propriedade_intelectual, dados_lgpd, reputacional, litigio. Para cada risco classifique probabilidade (alta/media/baixa) e impacto (alto/medio/baixo). Calcule classificação final (critico/alto/medio/baixo) via matriz padrão. Sugira mitigantes acionáveis. Quando possível, estime exposição financeira em R$.`,
    tool: {
      type: "function",
      function: {
        name: "registrar_mapa_de_riscos",
        description: "Registra avaliação de riscos jurídicos",
        parameters: {
          type: "object",
          properties: {
            score_geral: { type: "number" },
            classificacao_geral: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
            exposicao_total_estimada_brl: { type: "number" },
            resumo: { type: "string" },
            riscos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoria: {
                    type: "string",
                    enum: [
                      "contratual",
                      "regulatorio",
                      "trabalhista",
                      "tributario",
                      "propriedade_intelectual",
                      "dados_lgpd",
                      "reputacional",
                      "litigio",
                    ],
                  },
                  descricao: { type: "string" },
                  probabilidade: { type: "string", enum: ["alta", "media", "baixa"] },
                  impacto: { type: "string", enum: ["alto", "medio", "baixo"] },
                  classificacao: { type: "string", enum: ["critico", "alto", "medio", "baixo"] },
                  mitigante: { type: "string" },
                  exposicao_estimada_brl: { type: "number" },
                },
                required: ["categoria", "descricao", "probabilidade", "impacto", "classificacao"],
              },
            },
          },
          required: ["score_geral", "classificacao_geral", "resumo", "riscos"],
        },
      },
    },
  },

  compliance: {
    system: `Você é um especialista em compliance corporativo brasileiro. Analise o contrato sob os frameworks: LGPD (Lei 13.709/2018), Anticorrupção (Lei 12.846/2013), Trabalhista (CLT), Tributário/Fiscal e Ambiental (se aplicável). Para cada framework: status (conforme / parcialmente_conforme / nao_conforme / nao_aplicavel) e gaps específicos. Inclua ações necessárias priorizadas.`,
    tool: {
      type: "function",
      function: {
        name: "registrar_compliance",
        description: "Registra análise de compliance",
        parameters: {
          type: "object",
          properties: {
            status_geral: {
              type: "string",
              enum: ["conforme", "parcialmente_conforme", "nao_conforme"],
            },
            resumo: { type: "string" },
            frameworks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: {
                    type: "string",
                    enum: ["lgpd", "anticorrupcao", "trabalhista", "tributario", "ambiental"],
                  },
                  status: {
                    type: "string",
                    enum: ["conforme", "parcialmente_conforme", "nao_conforme", "nao_aplicavel"],
                  },
                  gaps: { type: "array", items: { type: "string" } },
                  observacoes: { type: "string" },
                },
                required: ["nome", "status"],
              },
            },
            acoes_necessarias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  acao: { type: "string" },
                  prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
                  framework: { type: "string" },
                },
                required: ["acao", "prioridade"],
              },
            },
          },
          required: ["status_geral", "resumo", "frameworks", "acoes_necessarias"],
        },
      },
    },
  },
};

function modelFor(_skill: Exclude<SkillId, "auto" | "full">): string {
  // Usamos flash em todas as skills para garantir conclusão dentro do limite do edge runtime.
  return "google/gemini-2.5-flash";
}

async function runSkill(
  skill: Exclude<SkillId, "auto" | "full">,
  conteudo: string,
  apiKey: string,
): Promise<{ payload: any; tokens: number; promptTokens: number; completionTokens: number }> {
  const { system, tool } = PROMPTS[skill];
  const model = modelFor(skill);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Analise o contrato a seguir e chame a função obrigatoriamente.\n\n${conteudo}` },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error(`AI gateway error [${skill}]`, res.status, t);
    if (res.status === 429) throw new Error("Limite de requisições excedido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos insuficientes. Adicione créditos ao workspace.");
    throw new Error(`Erro ao chamar IA (${skill}): ${res.status}`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  let payload: any = {};
  if (call?.function?.arguments) {
    try {
      payload = JSON.parse(call.function.arguments);
    } catch (e) {
      console.error("Falha parse tool args", e);
    }
  } else if (data.choices?.[0]?.message?.content) {
    payload = { texto_bruto: data.choices[0].message.content };
  }

  return {
    payload,
    tokens: data.usage?.total_tokens ?? 0,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function processAnalysis(params: {
  supabase: ReturnType<typeof createClient>;
  contratoId: string;
  contrato: { organization_id: string; tipo: string | null };
  conteudo: string;
  skillReq: SkillId;
  userId: string;
  apiKey: string;
}) {
  const { supabase, contratoId, contrato, conteudo, skillReq, userId, apiKey } = params;

  // Tentar enriquecer com o texto do documento anexado (preferir o original)
  let docText = "";
  try {
    const { data: docs } = await supabase
      .from("contract_attachments")
      .select("arquivo_url, nome_arquivo, is_original, created_at")
      .eq("contrato_id", contratoId)
      .order("is_original", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    const doc = docs?.[0];
    if (doc?.arquivo_url) {
      const filePath = doc.arquivo_url as string;
      const ext = (filePath.split(".").pop() || "").toLowerCase();
      const { data: signed } = await supabase.storage
        .from("contratos-documentos")
        .createSignedUrl(filePath, 120);
      if (signed?.signedUrl) {
        const resp = await fetch(signed.signedUrl);
        if (resp.ok) {
          const buf = new Uint8Array(await resp.arrayBuffer());
          if (ext === "docx") {
            const mammoth = await import("npm:mammoth@1.8.0");
            const { value } = await mammoth.extractRawText({ buffer: buf });
            docText = (value || "").slice(0, MAX_CONTENT_LENGTH);
          } else if (ext === "pdf" || ext === "txt") {
            if (ext === "pdf") {
              try {
                const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
                const parsed = await pdfParse(buf);
                docText = (parsed.text || "").slice(0, MAX_CONTENT_LENGTH);
              } catch (e) {
                console.error("pdf-parse falhou:", e);
              }
            } else {
              docText = new TextDecoder().decode(buf).slice(0, MAX_CONTENT_LENGTH);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Falha ao extrair texto do documento:", e);
  }

  const conteudoCompleto = docText
    ? `${conteudo}\n\n=== TEXTO INTEGRAL DO CONTRATO ===\n${docText}`
    : conteudo;
  const sanitizado = sanitize(conteudoCompleto);

  // Resolver skills a rodar
  const resolved: Exclude<SkillId, "auto" | "full">[] =
    skillReq === "full"
      ? ["contract-review", "risk-assessment", "compliance"]
      : skillReq === "auto"
        ? [detectAuto(contrato.tipo)]
        : [skillReq as Exclude<SkillId, "auto" | "full">];

  console.log(`Analyzing ${contratoId} skills=${resolved.join(",")}`);

  const results: Record<string, any> = {};
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  const skillResults = await Promise.all(
    resolved.map(async (sk) => ({
      skill: sk,
      result: await runSkill(sk, sanitizado, apiKey),
    })),
  );

  for (const { skill: sk, result: r } of skillResults) {
    results[sk] = r.payload;
    totalTokens += r.tokens;
    promptTokens += r.promptTokens;
    completionTokens += r.completionTokens;
  }

  // Skill primária para colunas legadas (compatibilidade com UI atual)
  const primary = resolved[0];
  const primaryPayload = results[primary] ?? {};

  // Score: usa contract-review se houver, senão risk-assessment, senão null
  const score =
    results["contract-review"]?.score_risco ??
    results["risk-assessment"]?.score_geral ??
    primaryPayload.score_risco ??
    primaryPayload.score_geral ??
    null;

  // Compat com colunas legadas
  const riscos =
    results["risk-assessment"]?.riscos?.map((r: any) => ({
      tipo: r.categoria,
      descricao: r.descricao,
      gravidade: r.classificacao,
    })) ??
    results["contract-review"]?.clausulas
      ?.filter((c: any) => c.status === "risco" || c.status === "atencao")
      .map((c: any) => ({
        tipo: c.categoria,
        descricao: c.problema ?? c.titulo,
        gravidade: c.status === "risco" ? "alta" : "media",
      })) ??
    [];

  const clausulas =
    results["contract-review"]?.clausulas?.map((c: any) => ({
      titulo: c.titulo,
      descricao: c.problema ?? c.texto_original ?? "",
      atencao: c.redline_sugerido,
    })) ?? [];

  const sugestoes =
    results["contract-review"]?.clausulas
      ?.filter((c: any) => c.redline_sugerido)
      .map((c: any) => `${c.titulo}: ${c.redline_sugerido}`) ??
    results["compliance"]?.acoes_necessarias?.map((a: any) => a.acao) ??
    [];

  const skillAplicada = skillReq === "full" ? "full" : primary;

  const { data: saved, error: insertErr } = await supabase
    .from("contract_analysis")
    .insert({
      contrato_id: contratoId,
      organization_id: contrato.organization_id,
      riscos_identificados: riscos,
      clausulas_importantes: clausulas,
      sugestoes_melhoria: sugestoes,
      score_risco: score,
      analisado_por: userId,
      skill_aplicada: skillAplicada,
      payload_estruturado: results,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Erro ao salvar análise:", insertErr);
    throw insertErr;
  }

  if (totalTokens > 0) {
    await supabase.from("uso_sistema").insert({
      tipo: "ai_tokens",
      recurso: "analisar-contrato-ia",
      quantidade: totalTokens,
      custo_unitario: 0.00001,
      custo_total: totalTokens * 0.00001,
      user_id: userId,
      contrato_id: contratoId,
      metadata: {
        skill: skillAplicada,
        skills_executadas: resolved,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      },
    });
  }

  return { saved, skillAplicada, results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contratoId, conteudo } = body;
    const skillReq: SkillId = (body.skill ?? "auto") as SkillId;

    if (!contratoId || !UUID_REGEX.test(contratoId)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid contract ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!conteudo || typeof conteudo !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("id, created_by, organization_id, tipo")
      .eq("id", contratoId)
      .maybeSingle();
    if (contratoError || !contrato) {
      console.error("Contrato lookup error:", contratoError);
      return new Response(JSON.stringify({ success: false, error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autorização: precisa pertencer à organização do contrato (criador OU membro ativo)
    let canAnalyze = contrato.created_by === userId;
    if (!canAnalyze) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", contrato.organization_id)
        .eq("is_active", true)
        .maybeSingle();
      canAnalyze = !!membership;
    }
    if (!canAnalyze) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const analysisPromise = processAnalysis({
      supabase,
      contratoId,
      contrato,
      conteudo,
      skillReq,
      userId,
      apiKey,
    });

    if (body.async === true) {
      EdgeRuntime.waitUntil(
        analysisPromise.catch((error) => {
          console.error("Erro análise assíncrona:", error);
        }),
      );

      return jsonResponse({
        success: true,
        processing: true,
        contratoId,
        message: "Análise iniciada. O resultado será carregado automaticamente.",
      });
    }

    const { saved, skillAplicada, results } = await analysisPromise;
    return jsonResponse({
      success: true,
      analise: saved,
      skill: skillAplicada,
      resumo:
        results["contract-review"]?.resumo_executivo ??
        results["risk-assessment"]?.resumo ??
        results["compliance"]?.resumo ??
        results["nda-triage"]?.resumo ??
        null,
    });
  } catch (e) {
    console.error("Erro análise:", e);
    return jsonResponse({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
