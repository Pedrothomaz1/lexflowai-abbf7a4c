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

    const { data: contrato } = await supabase.from('contratos').select('id, organization_id, titulo, numero_contrato').eq('id', contratoId).maybeSingle();
    if (!contrato) return json({ ok: false, error: 'Contrato não encontrado' }, 404);

    // Verify caller is admin of contract org
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('organization_id', contrato.organization_id).maybeSingle();
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

    // Send email via Resend
    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    if (enviarEmail) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        emailStatus = { sent: false, error: 'RESEND_API_KEY não configurada' };
      } else {
        try {
          const escopoLabel = escopo === 'sign' ? 'visualizar, comentar e assinar' : escopo === 'comment' ? 'visualizar e comentar' : 'visualizar';
          const nomeContrato = contrato.titulo || contrato.numero_contrato || 'Contrato';
          const saudacao = contraparteNome ? `Olá, ${contraparteNome}` : 'Olá';
          const mensagemCustom = mensagem ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(mensagem)}</p>` : '';
          const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:20px;color:#111827;margin:0 0 16px">LexFlow — Acesso ao contrato</h1>
  <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6">${saudacao},</p>
  <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6">Você recebeu acesso ao contrato <strong>${escapeHtml(nomeContrato)}</strong> para <strong>${escopoLabel}</strong>. O link expira em ${validadeDias} dias.</p>
  ${mensagemCustom}
  <p style="margin:24px 0"><a href="${url}" style="background:#0f5132;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">Acessar contrato</a></p>
  <p style="margin:16px 0 0;color:#6b7280;font-size:12px;word-break:break-all">Se o botão não funcionar, copie o link: ${url}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
  <p style="margin:0;color:#9ca3af;font-size:11px">Enviado por LexFlow. Não responda a este e-mail.</p>
</div></body></html>`;

          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: 'LexFlow <onboarding@resend.dev>',
              to: [contraparteEmail.toLowerCase()],
              subject: `LexFlow — Acesso ao contrato ${nomeContrato}`,
              html,
            }),
          });
          if (!resp.ok) {
            const txt = await resp.text();
            emailStatus = { sent: false, error: `Resend ${resp.status}: ${txt.slice(0, 200)}` };
          } else {
            emailStatus = { sent: true };
            await supabase.from('portal_externo_eventos').insert({
              organization_id: contrato.organization_id,
              token_id: saved.id,
              tipo: 'email_enviado',
              metadata: { destinatario: contraparteEmail.toLowerCase() },
            });
          }
        } catch (e) {
          emailStatus = { sent: false, error: e instanceof Error ? e.message : 'Erro envio' };
        }
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
