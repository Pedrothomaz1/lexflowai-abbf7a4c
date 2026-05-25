import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LEN = 80000;
const MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ ok: false, error: 'Unauthorized' }, 401);
    const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);

    const { contratoId, conteudo, tipoContrato, contexto } = await req.json().catch(() => ({}));
    if (!contratoId || !UUID_REGEX.test(contratoId)) return json({ ok: false, error: 'contratoId inválido' });
    if (!conteudo || typeof conteudo !== 'string') return json({ ok: false, error: 'conteudo obrigatório' });

    const { data: contrato } = await supabase.from('contratos').select('id, organization_id, tipo, created_by').eq('id', contratoId).maybeSingle();
    if (!contrato) return json({ ok: false, error: 'Contrato não encontrado' }, 404);

    let canAccess = contrato.created_by === user.id;
    if (!canAccess) {
      const { data: membership } = await supabase.from('organization_members')
        .select('id').eq('user_id', user.id).eq('organization_id', contrato.organization_id).eq('is_active', true).maybeSingle();
      canAccess = !!membership;
    }
    if (!canAccess) return json({ ok: false, error: 'Forbidden' }, 403);



    const sanitized = conteudo.replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, MAX_LEN);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

    const sys = `Você é um advogado contratual sênior. Sugira cláusulas a adicionar, fortalecer ou ajustar com base no contrato analisado. Considere LGPD, anticorrupção, SLA, multas, foro, propriedade intelectual, confidencialidade. Retorne APENAS JSON válido: { "sugestoes": [{ "categoria": string, "prioridade": "alta"|"media"|"baixa", "titulo": string, "justificativa": string, "redacao_sugerida": string, "acao": "adicionar"|"substituir"|"reforcar" }] }`;
    const userMsg = `Tipo: ${tipoContrato || contrato.tipo || 'n/d'}\nContexto: ${contexto || 'n/d'}\n\nContrato:\n${sanitized}`;

    const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('Gemini error', aiResp.status, errText);
      if (aiResp.status === 429) return json({ ok: false, error: 'Limite excedido. Tente novamente.' });
      if (aiResp.status === 403) return json({ ok: false, error: 'GEMINI_API_KEY inválida ou sem permissão.' });
      if (aiResp.status === 400) return json({ ok: false, error: 'Requisição inválida ao Gemini.' });
      throw new Error(`Gemini error ${aiResp.status}`);
    }
    const data = await aiResp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map((p: any) => p?.text || '').join('').trim();
    const tokens = data?.usageMetadata?.totalTokenCount || 0;

    let parsed: any;
    try {
      const m = raw.match(/```json\n?([\s\S]*?)```/) || raw.match(/```\n?([\s\S]*?)```/);
      parsed = JSON.parse(m ? m[1] : raw);
    } catch { parsed = { sugestoes: [], raw }; }

    const { data: saved } = await supabase.from('contract_ai_insights').insert({
      organization_id: contrato.organization_id,
      contrato_id: contratoId,
      tipo: 'sugestao_clausulas',
      conteudo: parsed,
      model: MODEL,
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
