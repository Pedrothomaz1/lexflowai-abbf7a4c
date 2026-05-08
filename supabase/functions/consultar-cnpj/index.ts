import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cleanCnpj(v: string) {
  return (v || "").replace(/\D/g, "");
}

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

export async function consultarReceitaWS(cnpj: string) {
  const url = `https://receitaws.com.br/v1/cnpj/${cnpj}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 429) {
    return { ok: false, rateLimited: true, status: res.status };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  }
  const data = await res.json();
  if (data.status === "ERROR") {
    return { ok: false, error: data.message || "Erro ReceitaWS", data };
  }
  return { ok: true, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const cnpj = cleanCnpj(body.cnpj || "");
    const fornecedorId: string | undefined = body.fornecedor_id;
    const force: boolean = !!body.force;

    if (cnpj.length !== 14) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Descobrir organization_id do usuário
    const { data: orgRow } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userRes.user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const organizationId = orgRow?.organization_id;
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache 24h se não forçado
    if (fornecedorId && !force) {
      const { data: f } = await admin
        .from("fornecedores")
        .select("cnpj_status, cnpj_situacao_data, cnpj_verificado_em, cnpj_dados_receita")
        .eq("id", fornecedorId)
        .maybeSingle();
      if (f?.cnpj_verificado_em) {
        const age = Date.now() - new Date(f.cnpj_verificado_em).getTime();
        if (age < 24 * 60 * 60 * 1000 && f.cnpj_status && f.cnpj_status !== "nao_verificado") {
          return new Response(
            JSON.stringify({ cached: true, ...f }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const result = await consultarReceitaWS(cnpj);

    if (!result.ok) {
      const status = result.rateLimited ? "rate_limited" : "erro_consulta";
      await admin.from("cnpj_verification_log").insert({
        fornecedor_id: fornecedorId ?? null,
        cnpj,
        status,
        error_message: result.error || (result.rateLimited ? "Rate limit ReceitaWS" : "Erro"),
        organization_id: organizationId,
        created_by: userRes.user.id,
      });
      return new Response(
        JSON.stringify({
          status,
          error: result.error || "Limite de consultas atingido. Tente em alguns segundos.",
        }),
        {
          status: result.rateLimited ? 429 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const d = result.data;
    const cnpjStatus = normalizeStatus(d.situacao);
    const situacaoData = d.data_situacao
      ? d.data_situacao.split("/").reverse().join("-")
      : null;

    const payload = {
      cnpj_status: cnpjStatus,
      cnpj_situacao_data: situacaoData,
      cnpj_verificado_em: new Date().toISOString(),
      cnpj_dados_receita: d,
    };

    if (fornecedorId) {
      await admin.from("fornecedores").update(payload).eq("id", fornecedorId);
    }

    await admin.from("cnpj_verification_log").insert({
      fornecedor_id: fornecedorId ?? null,
      cnpj,
      status: cnpjStatus,
      response: d,
      organization_id: organizationId,
      created_by: userRes.user.id,
    });

    return new Response(
      JSON.stringify({
        status: cnpjStatus,
        situacao: d.situacao,
        situacao_data: situacaoData,
        nome: d.nome,
        fantasia: d.fantasia,
        atividade_principal: d.atividade_principal?.[0],
        endereco: {
          logradouro: d.logradouro,
          numero: d.numero,
          bairro: d.bairro,
          municipio: d.municipio,
          uf: d.uf,
          cep: d.cep,
        },
        email: d.email,
        telefone: d.telefone,
        verificado_em: payload.cnpj_verificado_em,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("consultar-cnpj error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
