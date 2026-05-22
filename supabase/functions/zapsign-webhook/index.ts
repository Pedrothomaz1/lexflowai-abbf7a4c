import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Webhook público da ZapSign.
 * Configurar em ZapSign > Configurações > Webhooks apontando para:
 *   https://<project>.supabase.co/functions/v1/zapsign-webhook
 *
 * Eventos: doc_signed, doc_refused, doc_deleted, doc_viewed,
 *          signature, document_signed
 *
 * Segurança: validamos via campo `external_id` (= contrato_id) e
 * cruzamos com o `token`/`open_id` salvos no envelope. Opcionalmente
 * checamos um segredo compartilhado via header `X-Zapsign-Secret`
 * quando ZAPSIGN_WEBHOOK_SECRET estiver configurado.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SECRET = Deno.env.get("ZAPSIGN_WEBHOOK_SECRET");
    if (SECRET) {
      const provided = req.headers.get("x-zapsign-secret") || req.headers.get("X-Zapsign-Secret");
      if (provided !== SECRET) return json(401, { ok: false, error: "Invalid secret" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const payload = await req.json().catch(() => ({} as any));
    console.log("zapsign-webhook payload", JSON.stringify(payload).slice(0, 800));

    const eventType: string = payload?.event_type || payload?.event || "evento";
    const docToken: string | undefined =
      payload?.token || payload?.open_id || payload?.doc?.token || payload?.doc?.open_id;
    const externalId: string | undefined = payload?.external_id || payload?.doc?.external_id;

    let envelope: any = null;
    if (docToken) {
      const { data } = await admin
        .from("signature_envelopes")
        .select("*")
        .eq("provedor_envelope_id", docToken)
        .maybeSingle();
      envelope = data;
    }
    if (!envelope && externalId) {
      const { data } = await admin
        .from("signature_envelopes")
        .select("*")
        .eq("contrato_id", externalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      envelope = data;
    }
    if (!envelope) return json(200, { ok: true, ignored: true });

    // Atualiza signer específico se houver
    const signerEmail: string | undefined =
      payload?.signer?.email || payload?.email;
    const signerToken: string | undefined =
      payload?.signer?.token || payload?.signer_token;
    let signerId: string | null = null;

    if (signerEmail || signerToken) {
      const q = admin.from("signature_signers").select("*").eq("envelope_id", envelope.id);
      const { data: signer } = signerToken
        ? await q.eq("provedor_signer_id", signerToken).maybeSingle()
        : await q.eq("email", signerEmail!).maybeSingle();

      if (signer) {
        signerId = signer.id;
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (/sign(ed|ature)/i.test(eventType)) {
          updates.status = "assinado";
          updates.signed_at = new Date().toISOString();
        } else if (/refused|recus/i.test(eventType)) {
          updates.status = "recusado";
        } else if (/view/i.test(eventType)) {
          updates.status = "visualizado";
        }
        if (Object.keys(updates).length > 1) {
          await admin
            .from("signature_signers")
            .update(updates)
            .eq("id", signer.id)
            .select()
            .maybeSingle();
        }
      }
    }

    // Atualiza envelope conforme o tipo
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const signedUrl =
      payload?.signed_file || payload?.signed_file_url || payload?.doc?.signed_file;
    if (signedUrl) updates.signed_file_url = signedUrl;

    if (/doc_signed|document_signed|completed|concluido/i.test(eventType)) {
      updates.status = "concluido";
      updates.completed_at = new Date().toISOString();
    } else if (/refused|recus/i.test(eventType)) {
      updates.status = "recusado";
    } else if (/deleted|cancel/i.test(eventType)) {
      updates.status = "cancelado";
      updates.cancelled_at = new Date().toISOString();
    } else if (/expired/i.test(eventType)) {
      updates.status = "expirado";
    } else {
      // Se algum signer já assinou mas nem todos, marca parcial
      const { count: total } = await admin
        .from("signature_signers")
        .select("*", { count: "exact", head: true })
        .eq("envelope_id", envelope.id);
      const { count: assinados } = await admin
        .from("signature_signers")
        .select("*", { count: "exact", head: true })
        .eq("envelope_id", envelope.id)
        .eq("status", "assinado");
      if ((assinados ?? 0) > 0 && (assinados ?? 0) < (total ?? 0)) {
        updates.status = "parcialmente_assinado";
      }
    }

    await admin
      .from("signature_envelopes")
      .update(updates)
      .eq("id", envelope.id)
      .select()
      .maybeSingle();

    // Trilha
    await admin.from("signature_events").insert([{
      organization_id: envelope.organization_id,
      envelope_id: envelope.id,
      signer_id: signerId,
      tipo: eventType,
      descricao: signerEmail ? `Evento "${eventType}" do signatário ${signerEmail}` : `Evento "${eventType}"`,
      payload,
    }]);

    // Quando concluído, sincroniza contrato
    if (updates.status === "concluido") {
      await admin
        .from("contratos")
        .update({
          status: "vigente",
          data_assinatura: new Date().toISOString().slice(0, 10),
          arquivo_url: signedUrl || envelope.original_file_url,
        })
        .eq("id", envelope.contrato_id)
        .select()
        .maybeSingle();
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("zapsign-webhook error", e);
    return json(200, { ok: false, error: "internal" });
  }
});
