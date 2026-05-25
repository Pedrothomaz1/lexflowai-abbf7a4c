import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LEN = 60000;
const MODEL = "gemini-2.5-pro";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHTML(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function computeChanges(original: string, modified: string) {
  const o = original.split(/\s+/);
  const m = modified.split(/\s+/);
  const changes: any[] = [];
  let i = 0, j = 0;
  while (i < o.length || j < m.length) {
    if (i >= o.length) { changes.push({ type: "insert", position: j, new: m[j] }); j++; }
    else if (j >= m.length) { changes.push({ type: "delete", position: i, original: o[i] }); i++; }
    else if (o[i] === m[j]) { i++; j++; }
    else { changes.push({ type: "replace", position: i, original: o[i], new: m[j] }); i++; j++; }
  }
  return changes;
}

function generateMarkedContent(original: string, modified: string) {
  const o = original.split(/\s+/);
  const m = modified.split(/\s+/);
  const out: string[] = [];
  let i = 0, j = 0;
  while (i < o.length || j < m.length) {
    if (i >= o.length) { out.push(`<ins class="bg-green-100 text-green-800">${escapeHTML(m[j])}</ins>`); j++; }
    else if (j >= m.length) { out.push(`<del class="bg-red-100 text-red-800 line-through">${escapeHTML(o[i])}</del>`); i++; }
    else if (o[i] === m[j]) { out.push(escapeHTML(o[i])); i++; j++; }
    else {
      out.push(`<del class="bg-red-100 text-red-800 line-through">${escapeHTML(o[i])}</del>`);
      out.push(`<ins class="bg-green-100 text-green-800">${escapeHTML(m[j])}</ins>`);
      i++; j++;
    }
  }
  return out.join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { contratoId, conteudo, foco } = await req.json().catch(() => ({}));
    if (!contratoId || !UUID_REGEX.test(contratoId)) return json({ ok: false, error: "contratoId inválido" });
    if (!conteudo || typeof conteudo !== "string" || conteudo.length < 50) {
      return json({ ok: false, error: "Conteúdo do contrato insuficiente (mínimo 50 caracteres)." });
    }

    const { data: contrato } = await supabase
      .from("contratos").select("id, organization_id, tipo, titulo, created_by")
      .eq("id", contratoId).maybeSingle();
    if (!contrato) return json({ ok: false, error: "Contrato não encontrado" }, 404);

    let canAccess = contrato.created_by === user.id;
    if (!canAccess) {
      const { data: membership } = await supabase.from("organization_members")
        .select("id").eq("user_id", user.id).eq("organization_id", contrato.organization_id).eq("is_active", true).maybeSingle();
      canAccess = !!membership;
    }
    if (!canAccess) return json({ ok: false, error: "Forbidden" }, 403);


    const sanitized = conteudo.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").substring(0, MAX_LEN);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const sys = `Você é um advogado contratual sênior. Sua tarefa é REVISAR o contrato e devolver uma VERSÃO MARCADA (markup) com inserções, remoções e ajustes de redação para reduzir risco para a parte contratante.
REGRAS:
- Preserve a estrutura, ordem das cláusulas e títulos.
- Modifique APENAS o necessário (cláusulas frágeis, ausência de SLA/multa/foro/LGPD/anticorrupção/confidencialidade/PI, prazos abusivos).
- NÃO invente fatos; trabalhe sobre o texto fornecido.
- Devolva APENAS JSON válido no formato:
{
  "conteudo_revisado": "TEXTO COMPLETO já com as alterações aplicadas (sem marcas, sem HTML, sem comentários)",
  "resumo_alteracoes": [
    { "categoria": string, "prioridade": "alta"|"media"|"baixa", "descricao": string }
  ]
}`;

    const userMsg = `Tipo do contrato: ${contrato.tipo || "n/d"}\nFoco da revisão: ${foco || "geral, com ênfase em redução de risco"}\n\n--- CONTRATO ORIGINAL ---\n${sanitized}`;

    const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Gemini error", aiResp.status, errText);
      if (aiResp.status === 429) return json({ ok: false, error: "Limite de uso da IA excedido. Tente novamente em instantes." });
      if (aiResp.status === 403) return json({ ok: false, error: "GEMINI_API_KEY inválida ou sem permissão." });
      if (aiResp.status === 400) return json({ ok: false, error: "Requisição inválida ao Gemini." });
      throw new Error(`Gemini error ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const raw: string = parts.map((p: any) => p?.text || "").join("").trim();
    const tokens = data?.usageMetadata?.totalTokenCount || 0;

    let parsed: any;
    try {
      const m = raw.match(/```json\n?([\s\S]*?)```/) || raw.match(/```\n?([\s\S]*?)```/);
      parsed = JSON.parse(m ? m[1] : raw);
    } catch {
      return json({ ok: false, error: "A IA não retornou JSON válido. Tente novamente." });
    }

    const conteudoRevisado: string = (parsed?.conteudo_revisado || "").trim();
    if (!conteudoRevisado || conteudoRevisado.length < 30) {
      return json({ ok: false, error: "IA não retornou conteúdo revisado." });
    }
    if (conteudoRevisado.trim() === sanitized.trim()) {
      return json({ ok: false, error: "A IA não identificou pontos de melhoria neste contrato." });
    }

    const alteracoes = computeChanges(sanitized, conteudoRevisado);
    const marcado = generateMarkedContent(sanitized, conteudoRevisado);

    const { data: existing } = await supabase
      .from("contract_redlines").select("versao")
      .eq("contrato_id", contratoId).order("versao", { ascending: false }).limit(1).maybeSingle();
    const versao = (existing?.versao || 0) + 1;

    const { data: redline, error: insErr } = await supabase
      .from("contract_redlines")
      .insert({
        organization_id: contrato.organization_id,
        contrato_id: contratoId,
        versao,
        conteudo_original: sanitized,
        conteudo_marcado: marcado,
        alteracoes,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (insErr) {
      console.error("insert redline error", insErr);
      return json({ ok: false, error: "Falha ao salvar a marcação sugerida." });
    }

    await supabase.from("contract_ai_insights").insert({
      organization_id: contrato.organization_id,
      contrato_id: contratoId,
      tipo: "redline",
      conteudo: {
        redline_id: redline?.id,
        versao,
        resumo_alteracoes: parsed?.resumo_alteracoes ?? [],
        total_alteracoes: alteracoes.length,
      },
      model: MODEL,
      tokens_usados: tokens,
      created_by: user.id,
    });

    return json({
      ok: true,
      redline,
      resumo_alteracoes: parsed?.resumo_alteracoes ?? [],
      total_alteracoes: alteracoes.length,
    });
  } catch (e) {
    console.error("ia-redline-sugerir error", e);
    return json({ ok: false, error: "Erro interno. Tente novamente." }, 500);
  }

});
