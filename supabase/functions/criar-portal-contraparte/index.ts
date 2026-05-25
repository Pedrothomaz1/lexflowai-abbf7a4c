import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  contratoId: z.string().uuid(),
  contraparteEmail: z.string().trim().toLowerCase().email().max(255),
  contraparteNome: z.string().trim().max(200).optional().nullable(),
  escopo: z.enum(['view', 'comment', 'sign']).default('view'),
  validadeDias: z.number().int().min(1).max(90).default(14),
  enviarEmail: z.boolean().default(true),
  mensagem: z.string().trim().max(2000).optional(),
}).strict();

function genToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ ok: false, error: 'Unauthorized' }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ ok: false, error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors });
    }
    const { contratoId, contraparteEmail, contraparteNome, escopo, validadeDias, enviarEmail, mensagem } = parsed.data;

    const { data: contrato } = await supabase.from('contratos')
      .select('id, organization_id, titulo, numero_contrato').eq('id', contratoId).maybeSingle();
    if (!contrato) return json({ ok: false, error: 'Contrato não encontrado' }, 404);

    const { data: roleRow } = await supabase.from('user_roles')
      .select('role').eq('user_id', user.id).eq('organization_id', contrato.organization_id).maybeSingle();
    if (!roleRow || roleRow.role !== 'administrador') {
      return json({ ok: false, error: 'Apenas administradores podem gerar links de portal externo' }, 403);
    }

    const token = genToken();
    const expiresAt = new Date(Date.now() + validadeDias * 86400_000).toISOString();

    const { data: saved, error } = await supabase.from('portal_externo_tokens').insert({
      organization_id: contrato.organization_id,
      contrato_id: contratoId,
      token,
      contraparte_email: contraparteEmail.toLowerCase(),
      contraparte_nome: contraparteNome ?? null,
      escopo,
      expires_at: expiresAt,
      created_by: user.id,
    }).select().maybeSingle();
    if (error) throw error;

    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://lexflowai.com.br';
    const url = `${new URL(origin).origin}/portal/${token}`;

    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    if (enviarEmail) {
      try {
        const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'counterparty-portal-access',
            recipientEmail: contraparteEmail.toLowerCase(),
            idempotencyKey: `portal-access-${saved.id}`,
            templateData: {
              contraparteNome: contraparteNome ?? undefined,
              contratoNome: contrato.titulo || contrato.numero_contrato || undefined,
              escopo,
              validadeDias,
              portalUrl: url,
              mensagem: mensagem || undefined,
            },
          },
        });
        if (invokeErr) {
          emailStatus = { sent: false, error: invokeErr.message ?? String(invokeErr) };
        } else {
          emailStatus = { sent: true };
          await supabase.from('portal_externo_eventos').insert({
            organization_id: contrato.organization_id,
            token_id: saved.id,
            tipo: 'email_enviado',
            metadata: { destinatario: contraparteEmail.toLowerCase(), provider: 'lovable_emails' },
          });
        }
      } catch (e) {
        emailStatus = { sent: false, error: e instanceof Error ? e.message : 'Erro envio' };
      }
    }

    return json({ ok: true, token: saved, url, email: emailStatus });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Erro' }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
