import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LEN = 80000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ ok: false, error: 'Unauthorized' }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const { contratoId, conteudo } = body;
    if (!contratoId || !UUID_REGEX.test(contratoId)) return json({ ok: false, error: 'contratoId inválido' });
    if (!conteudo || typeof conteudo !== 'string') return json({ ok: false, error: 'conteudo obrigatório' });

    const { data: contrato } = await supabase.from('contratos').select('id, organization_id').eq('id', contratoId).maybeSingle();
    if (!contrato) return json({ ok: false, error: 'Contrato não encontrado' }, 404);

    const sanitized = conteudo.replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, MAX_LEN);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY não configurada');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `Você é um assistente para gestores não-jurídicos. Gere um resumo executivo do contrato em PT-BR, direto, sem juridiquês. Retorne JSON: { "objetivo": string, "partes": string, "valor": string, "prazo": string, "principais_obrigacoes": string[], "principais_riscos": string[], "pontos_de_atencao_gestor": string[], "tldr": string }. Apenas JSON.` },
          { role: 'user', content: sanitized }
        ],
        temperature: 0.3,
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ ok: false, error: 'Limite excedido. Tente novamente.' });
      if (aiResp.status === 402) return json({ ok: false, error: 'Créditos insuficientes.' });
      throw new Error(`AI error ${aiResp.status}`);
    }
    const data = await aiResp.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const tokens = data.usage?.total_tokens || 0;
    let parsed: any;
    try {
      const m = raw.match(/```json\n?([\s\S]*?)```/) || raw.match(/```\n?([\s\S]*?)```/);
      parsed = JSON.parse(m ? m[1] : raw);
    } catch { parsed = { tldr: raw.substring(0, 800) }; }

    const { data: saved } = await supabase.from('contract_ai_insights').insert({
      organization_id: contrato.organization_id,
      contrato_id: contratoId,
      tipo: 'resumo_executivo',
      conteudo: parsed,
      model: 'google/gemini-2.5-flash',
      tokens_usados: tokens,
      created_by: user.id,
    }).select().maybeSingle();

    return json({ ok: true, insight: saved });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Erro' }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
