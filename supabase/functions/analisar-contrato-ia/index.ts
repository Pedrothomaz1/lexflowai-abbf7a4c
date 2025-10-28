import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contratoId, conteudo } = await req.json();

    if (!contratoId || !conteudo) {
      throw new Error('contratoId e conteudo são obrigatórios');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log(`Analisando contrato ${contratoId} com IA`);

    // Chamada para Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista jurídico em análise de contratos. Analise o contrato fornecido e identifique:
1. Riscos potenciais (jurídicos, financeiros, operacionais)
2. Cláusulas importantes e críticas
3. Sugestões de melhorias
4. Score de risco geral (0 a 10, onde 0 é sem risco e 10 é altíssimo risco)

Retorne a resposta em formato JSON estruturado com as chaves:
- riscos_identificados: array de objetos com {tipo, descricao, gravidade}
- clausulas_importantes: array de objetos com {titulo, descricao, atencao}
- sugestoes_melhoria: array de strings
- score_risco: número de 0 a 10
- resumo_executivo: string com resumo geral`
          },
          {
            role: 'user',
            content: `Analise este contrato:\n\n${conteudo}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos ao seu workspace Lovable.');
      }
      
      throw new Error(`Erro ao chamar API de IA: ${response.status}`);
    }

    const data = await response.json();
    const analiseTexto = data.choices[0]?.message?.content;

    if (!analiseTexto) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Análise recebida:', analiseTexto);

    // Tentar parsear como JSON
    let analise;
    try {
      // Remover markdown code blocks se existirem
      const jsonMatch = analiseTexto.match(/```json\n?([\s\S]*?)\n?```/) || 
                        analiseTexto.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : analiseTexto;
      analise = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', parseError);
      // Se não conseguir parsear, criar estrutura padrão
      analise = {
        riscos_identificados: [
          {
            tipo: 'analise_manual_necessaria',
            descricao: 'Não foi possível estruturar a análise automaticamente',
            gravidade: 'media'
          }
        ],
        clausulas_importantes: [],
        sugestoes_melhoria: ['Revisar manualmente o contrato'],
        score_risco: 5.0,
        resumo_executivo: analiseTexto.substring(0, 500)
      };
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = null;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Salvar análise no banco
    const { data: savedAnalysis, error: insertError } = await supabase
      .from('contract_analysis')
      .insert({
        contrato_id: contratoId,
        riscos_identificados: analise.riscos_identificados,
        clausulas_importantes: analise.clausulas_importantes,
        sugestoes_melhoria: analise.sugestoes_melhoria,
        score_risco: analise.score_risco,
        analisado_por: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar análise:', insertError);
      throw insertError;
    }

    console.log('Análise salva com sucesso:', savedAnalysis.id);

    return new Response(
      JSON.stringify({
        success: true,
        analise: savedAnalysis,
        resumo: analise.resumo_executivo,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na análise do contrato:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
