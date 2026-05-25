// Gera documento substituindo variáveis {{nome_variavel}} de uma versão de template.
// Input: { template_version_id: string, valores: Record<string, string>, contrato_id?: string }
// Output: { conteudo_gerado, variaveis_faltando[], template_id, versao }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { template_version_id, valores, contrato_id } = body ?? {};

    if (!template_version_id || typeof template_version_id !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "template_version_id obrigatório" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const vals: Record<string, string> = (valores && typeof valores === "object") ? valores : {};

    // Busca versão (RLS garante org)
    const { data: versao, error: vErr } = await supabase
      .from("template_versions")
      .select("id, template_id, versao, conteudo, variaveis, organization_id")
      .eq("id", template_version_id)
      .maybeSingle();

    if (vErr || !versao) {
      return new Response(JSON.stringify({ ok: false, error: "Versão de template não encontrada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Substituição {{var}} (tolera espaços internos)
    let conteudo = versao.conteudo as string;
    const variaveisDeclaradas: Array<{ chave: string; obrigatoria?: boolean }> =
      Array.isArray(versao.variaveis) ? versao.variaveis as any : [];

    const faltando: string[] = [];
    for (const v of variaveisDeclaradas) {
      const chave = v.chave;
      const valor = vals[chave];
      if ((valor === undefined || valor === null || valor === "") && v.obrigatoria) {
        faltando.push(chave);
      }
      const re = new RegExp(`\\{\\{\\s*${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
      conteudo = conteudo.replace(re, valor ?? "");
    }
    // Substitui qualquer chave extra fornecida não declarada
    for (const [chave, valor] of Object.entries(vals)) {
      const re = new RegExp(`\\{\\{\\s*${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
      conteudo = conteudo.replace(re, String(valor ?? ""));
    }

    if (faltando.length > 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Variáveis obrigatórias faltando",
        variaveis_faltando: faltando,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      template_id: versao.template_id,
      versao: versao.versao,
      conteudo_gerado: conteudo,
      contrato_id: contrato_id ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('gerar-documento error', e);
    return new Response(JSON.stringify({ ok: false, error: 'Erro interno. Tente novamente.' }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

});
