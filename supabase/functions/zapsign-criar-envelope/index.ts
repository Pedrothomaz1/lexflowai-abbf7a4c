import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Signer {
  nome: string;
  email: string;
  telefone?: string;
  lado?: "empresa" | "contraparte" | "testemunha";
  ordem?: number;
}

interface Body {
  contrato_id: string;
  assunto?: string;
  mensagem?: string;
  document_url?: string;
  expires_in_days?: number;
  signers: Signer[];
}

const ZAPSIGN_BASE = "https://api.zapsign.com.br/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json(401, { ok: false, error: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAP_TOKEN = Deno.env.get("ZAPSIGN_API_TOKEN");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return json(401, { ok: false, error: "Unauthorized" });
    const userId = claims.claims.sub;

    const body = (await req.json()) as Body;
    if (!body?.contrato_id || !Array.isArray(body.signers) || body.signers.length === 0) {
      return json(200, { ok: false, error: "contrato_id e signers são obrigatórios" });
    }
    for (const s of body.signers) {
      if (!s?.nome || !s?.email) {
        return json(200, { ok: false, error: "Cada signatário precisa de nome e email" });
      }
    }
    if (!ZAP_TOKEN) {
      return json(200, {
        ok: false,
        error: "Integração não configurada. Solicite ao administrador cadastrar ZAPSIGN_API_TOKEN.",
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: contrato } = await admin
      .from("contratos")
      .select("id, titulo, arquivo_url, organization_id")
      .eq("id", body.contrato_id)
      .maybeSingle();
    if (!contrato) return json(200, { ok: false, error: "Contrato não encontrado" });

    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", contrato.organization_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) return json(200, { ok: false, error: "Sem acesso a este contrato" });

    const documentUrl = body.document_url || contrato.arquivo_url;
    if (!documentUrl) {
      return json(200, { ok: false, error: "O contrato precisa ter um documento anexado" });
    }

    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + body.expires_in_days * 86400_000).toISOString()
      : null;

    // 1) Cria documento no ZapSign
    const zapResp = await fetch(`${ZAPSIGN_BASE}/docs/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZAP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.assunto || contrato.titulo,
        url_pdf: documentUrl,
        lang: "pt-br",
        brand_name: "LexFlow",
        disable_signer_emails: false,
        date_limit_to_sign: expiresAt ? expiresAt.slice(0, 10) : undefined,
        external_id: contrato.id,
        signers: body.signers.map((s) => ({
          name: s.nome,
          email: s.email,
          phone_country: s.telefone ? "55" : undefined,
          phone_number: s.telefone || undefined,
          auth_mode: "assinaturaTela",
          send_automatic_email: true,
        })),
      }),
    });
    const zapBody = await zapResp.json().catch(() => ({}));
    if (!zapResp.ok) {
      console.error("ZapSign error", zapResp.status, zapBody);
      return json(200, {
        ok: false,
        error: zapBody?.detail || zapBody?.message || "Falha ao enviar à ZapSign",
      });
    }

    const envelopeProviderId = zapBody?.token || zapBody?.open_id;
    if (!envelopeProviderId) {
      return json(200, { ok: false, error: "Resposta inválida da ZapSign" });
    }

    // 2) Persiste envelope
    const { data: envelope, error: envErr } = await admin
      .from("signature_envelopes")
      .insert([{
        organization_id: contrato.organization_id,
        contrato_id: contrato.id,
        provedor: "zapsign",
        provedor_envelope_id: String(envelopeProviderId),
        status: "enviado",
        assunto: body.assunto || contrato.titulo,
        mensagem: body.mensagem || null,
        original_file_url: documentUrl,
        expires_at: expiresAt,
        sent_at: new Date().toISOString(),
        created_by: userId,
        metadata: { zapsign: zapBody },
      }])
      .select()
      .maybeSingle();

    if (envErr || !envelope) {
      console.error("insert envelope error", envErr);
      return json(200, { ok: false, error: "Falha ao registrar envelope" });
    }

    // 3) Persiste signatários (vinculando ids vindos do ZapSign quando existirem)
    const zapSigners: any[] = Array.isArray(zapBody?.signers) ? zapBody.signers : [];
    const signersRows = body.signers.map((s, idx) => {
      const matched = zapSigners[idx] || zapSigners.find((z) => z?.email === s.email);
      return {
        organization_id: contrato.organization_id,
        envelope_id: envelope.id,
        provedor_signer_id: matched?.token || matched?.external_id || null,
        nome: s.nome,
        email: s.email,
        telefone: s.telefone || null,
        lado: s.lado || "contraparte",
        ordem: s.ordem ?? idx + 1,
        status: "pendente",
        sign_url: matched?.sign_url || null,
      };
    });
    await admin.from("signature_signers").insert(signersRows);

    await admin.from("signature_events").insert([{
      organization_id: contrato.organization_id,
      envelope_id: envelope.id,
      tipo: "envelope_criado",
      descricao: `Envelope enviado para ${body.signers.length} signatário(s)`,
      payload: { zapsign: zapBody },
    }]);

    return json(200, { ok: true, envelope });
  } catch (e) {
    console.error("zapsign-criar-envelope error", e);
    return json(500, { ok: false, error: "Erro interno" });
  }
});
