import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const { action, token, comentario } = body;

    if (!token || typeof token !== 'string' || token.length < 16) {
      return json({ ok: false, error: 'Token inválido' });
    }

    const { data: t } = await supabase
      .from('portal_externo_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!t) return json({ ok: false, error: 'Token não encontrado' });
    if (t.revoked_at) return json({ ok: false, error: 'Link revogado' });
    if (new Date(t.expires_at) < new Date()) return json({ ok: false, error: 'Link expirado' });

    const ip = req.headers.get('x-forwarded-for') || '';
    const ua = req.headers.get('user-agent') || '';

    if (!action || action === 'view') {
      const { data: contrato } = await supabase
        .from('contratos')
        .select('id, titulo, numero_contrato, tipo, status, data_inicio, data_fim, valor_total, moeda, descricao, observacoes')
        .eq('id', t.contrato_id)
        .maybeSingle();
      if (!contrato) return json({ ok: false, error: 'Contrato não encontrado' }, 404);

      const { data: negs } = await supabase
        .from('contract_negotiations')
        .select('id, autor_lado, tipo, conteudo, metadata, created_at')
        .eq('contrato_id', t.contrato_id)
        .order('created_at', { ascending: true });

      await supabase.from('portal_externo_tokens').update({
        last_access_at: new Date().toISOString(),
        access_count: (t.access_count ?? 0) + 1,
      }).eq('id', t.id);
      await supabase.from('portal_externo_eventos').insert({
        organization_id: t.organization_id,
        token_id: t.id,
        contrato_id: t.contrato_id,
        acao: 'view',
        ip, user_agent: ua,
      });

      return json({
        ok: true,
        contraparte: { email: t.contraparte_email, nome: t.contraparte_nome, escopo: t.escopo },
        contrato,
        negociacoes: negs ?? [],
        expires_at: t.expires_at,
      });
    }

    if (action === 'comment') {
      if (!['comment', 'sign'].includes(t.escopo)) return json({ ok: false, error: 'Sem permissão de comentar' }, 403);
      if (!comentario || typeof comentario !== 'string' || comentario.trim().length < 2) return json({ ok: false, error: 'Comentário vazio' });
      const conteudo = comentario.substring(0, 5000);

      const { data: inserted, error } = await supabase.from('contract_negotiations').insert({
        organization_id: t.organization_id,
        contrato_id: t.contrato_id,
        autor_lado: 'contraparte',
        tipo: 'comentario',
        conteudo,
        metadata: {
          autor_nome: t.contraparte_nome || t.contraparte_email,
          autor_email: t.contraparte_email,
          via: 'portal_externo',
          token_id: t.id,
        },
      }).select().maybeSingle();
      if (error) throw error;

      await supabase.from('portal_externo_eventos').insert({
        organization_id: t.organization_id,
        token_id: t.id,
        contrato_id: t.contrato_id,
        acao: 'comment',
        ip, user_agent: ua,
        metadata: { negociacao_id: inserted?.id },
      });
      return json({ ok: true, negociacao: inserted });
    }

    return json({ ok: false, error: 'Ação desconhecida' });
  } catch (e) {
    console.error('[portal-externo-publico] error:', e);
    return json({ ok: false, error: 'Erro interno. Tente novamente.' }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
