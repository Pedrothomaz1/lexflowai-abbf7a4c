import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const { contratoId, contraparteEmail, contraparteNome, escopo = 'view', validadeDias = 14 } = await req.json().catch(() => ({}));
    if (!contratoId || !UUID_REGEX.test(contratoId)) return json({ ok: false, error: 'contratoId inválido' });
    if (!contraparteEmail || !EMAIL_REGEX.test(contraparteEmail)) return json({ ok: false, error: 'E-mail inválido' });
    if (!['view', 'comment', 'sign'].includes(escopo)) return json({ ok: false, error: 'Escopo inválido' });

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

    return json({ ok: true, token: saved, url });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Erro' }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
