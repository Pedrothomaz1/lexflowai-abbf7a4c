import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Signer {
  name: string;
  email: string;
  role?: string;
}

interface Body {
  contrato_id: string;
  signers: Signer[];
  document_url?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const zapToken = Deno.env.get("ZAPSIGN_API_TOKEN");

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: claims, error: claimErr } = await userClient.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (claimErr || !claims?.claims) {
      return json(401, { ok: false, error: "Unauthorized" });
    }
    const userId = claims.claims.sub;

    const body = (await req.json()) as Body;
    if (!body?.contrato_id || !Array.isArray(body.signers) || body.signers.length === 0) {
      return json(200, { ok: false, error: "contrato_id e signers são obrigatórios" });
    }
    for (const s of body.signers) {
      if (!s?.name || !s?.email) {
        return json(200, { ok: false, error: "Todos os signatários precisam de nome e email" });
      }
    }

    if (!zapToken) {
      return json(200, {
        ok: false,
        error: "Integração ZapSign não configurada. Solicite ao administrador para cadastrar ZAPSIGN_API_TOKEN.",
      });
    }

    const admin = createClient(supabaseUrl, service);

    // Carrega contrato + organização do solicitante
    const { data: contrato, error: contratoErr } = await admin
      .from("contratos")
      .select("id, titulo, arquivo_url, organization_id")
      .eq("id", body.contrato_id)
      .maybeSingle();
    if (contratoErr || !contrato) {
      return json(200, { ok: false, error: "Contrato não encontrado" });
    }

    // Verifica membership ativo do usuário na org do contrato
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", contrato.organization_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) {
      return json(200, { ok: false, error: "Sem acesso a este contrato" });
    }

    const documentUrl = body.document_url || contrato.arquivo_url;
    if (!documentUrl) {
      return json(200, { ok: false, error: "Contrato precisa ter um documento anexado" });
    }

    // Cria documento no ZapSign
    const zapResp = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zapToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: contrato.titulo,
        url_pdf: documentUrl,
        signers: body.signers.map((s) => ({
          name: s.name,
          email: s.email,
          auth_mode: "assinaturaTela",
          send_automatic_email: true,
        })),
        lang: "pt-br",
        disable_signer_emails: false,
        brand_name: "LexFlow",
      }),
    });

    const zapBody = await zapResp.json().catch(() => ({}));
    if (!zapResp.ok) {
      console.error("ZapSign error", zapResp.status, zapBody);
      return json(200, {
        ok: false,
        error: zapBody?.detail || zapBody?.message || "Falha ao enviar documento ao ZapSign",
      });
    }

    const externalId = zapBody?.token || zapBody?.open_id || zapBody?.id;
    if (!externalId) {
      return json(200, { ok: false, error: "Resposta inválida do ZapSign" });
    }

    const { data: signature, error: insErr } = await admin
      .from("contract_signatures")
      .insert([{
        organization_id: contrato.organization_id,
        contrato_id: contrato.id,
        provider: "zapsign",
        external_id: String(externalId),
        signers: body.signers,
        status: "sent",
        document_url: documentUrl,
        sent_at: new Date().toISOString(),
        created_by: userId,
        metadata: {
          contract_title: contrato.titulo,
          zapsign_open_id: zapBody?.open_id ?? null,
          zapsign_status: zapBody?.status ?? null,
        },
      }])
      .select()
      .maybeSingle();

    if (insErr) {
      console.error("insert signature error", insErr);
      return json(200, { ok: false, error: "Falha ao registrar assinatura" });
    }

    return json(200, { ok: true, signature, zapsign: { token: externalId } });
  } catch (e: any) {
    console.error("enviar-zapsign error", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
