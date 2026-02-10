import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - add your production domain here
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean);

// Get CORS headers based on request origin
function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  if (!isAllowedOrigin && origin) {
    // Reject requests from unknown origins (except empty origin for same-origin requests)
    return null;
  }
  const allowedOrigin = isAllowedOrigin ? origin : (ALLOWED_ORIGINS[0] || 'http://localhost:8080');

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Maximum content length (100KB)
const MAX_CONTENT_LENGTH = 102400;

// Sanitize content to prevent prompt injection
function sanitizeContent(content: string): string {
  return content
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .substring(0, MAX_CONTENT_LENGTH); // Enforce hard limit
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Reject requests from unauthorized origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse and validate request body
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contratoId, conteudo } = requestBody;

    // Validate contratoId format
    if (!contratoId || typeof contratoId !== 'string' || !UUID_REGEX.test(contratoId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid contract ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content
    if (!conteudo || typeof conteudo !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conteudo.length > MAX_CONTENT_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify contract exists and user has permission to analyze it
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('id, created_by, organization_id')
      .eq('id', contratoId)
      .single();

    if (contratoError || !contrato) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role for authorization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const canAnalyze = contrato.created_by === userId || 
      ['consultoria_juridica', 'administrador'].includes(userRole?.role || '');

    if (!canAnalyze) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Insufficient permissions to analyze this contract' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Sanitize content before sending to AI
    const sanitizedConteudo = sanitizeContent(conteudo);

    console.log(`Analyzing contract ${contratoId} for user ${userId}`);

    // Call Lovable AI
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
            content: `Atue como um especialista jurídico (direito contratual) e revisor técnico-linguístico. Analise integralmente o contrato fornecido pelo usuário para identificar: (1) riscos potenciais (jurídicos, financeiros e operacionais), (2) cláusulas importantes e críticas, (3) erros gramaticais/ambiguidade/redação que possam gerar interpretações conflitantes, e (4) oportunidades de melhoria para reduzir risco e aumentar clareza e executabilidade. Ao final, atribua um score de risco geral de 0 a 10 (0 = sem risco relevante; 10 = risco altíssimo).

Retorne APENAS um JSON válido (sem comentários, sem markdown, sem texto fora do JSON) com as seguintes chaves e estruturas:

{
  "riscos_identificados": [
    {
      "tipo": "juridico|financeiro|operacional|conformidade|reputacional|gramatical_redacional|outro",
      "descricao": "string detalhando o risco, a origem no texto e o impacto prático",
      "gravidade": "baixa|media|alta|critica"
    }
  ],
  "clausulas_importantes": [
    {
      "titulo": "string (nome curto da cláusula/tema)",
      "descricao": "string explicando o conteúdo e por que é crítica",
      "atencao": "string com o que revisar/negociar, incluindo pontos específicos"
    }
  ],
  "sugestoes_melhoria": [
    "string com sugestão objetiva de melhoria"
  ],
  "score_risco": 0,
  "resumo_executivo": "string com resumo geral (3 a 7 linhas)"
}

Regras de preenchimento:
- Cite, sempre que possível, o trecho/cláusula de onde o risco vem (ex: "Cláusula X – ..." ou excerto curto entre aspas).
- Liste os riscos em ordem decrescente de gravidade e impacto.
- Em "clausulas_importantes", inclua cláusulas que afetam: responsabilidade, preço/pagamento, prazos, rescisão, multas, garantias, propriedade intelectual, confidencialidade, LGPD/privacidade, foro/lei aplicável, SLA, limitação de responsabilidade, indenização, força maior, subcontratação, não concorrência, exclusividade e alterações/renovações.
- Em "sugestoes_melhoria", seja acionável: diga o que mudar e por quê; quando pertinente, inclua sugestão de redação alternativa curta.
- Score (0 a 10): justifique implicitamente no resumo executivo. Use número inteiro ou uma casa decimal.
- Se o contrato estiver incompleto, sinalize em "resumo_executivo" e aponte o que falta.
- Se não houver riscos relevantes, preencha as chaves com arrays vazios e score baixo, explicando no resumo.

Avisos importantes:
- Não invente fatos nem presuma leis específicas sem indicação de jurisdição; quando não estiver clara, indique a incerteza e sugira confirmar o país/estado aplicável.
- Não forneça aconselhamento jurídico definitivo; trate como análise de riscos, recomendando validação por advogado(a) responsável quando o risco for alto/crítico.
- Evite citar artigos de lei específicos se não tiver certeza; prefira mencionar "exigências legais aplicáveis" (LGPD, anticorrupção, trabalhista, tributária).
- Seja objetivo e não repita conteúdo. Não inclua texto fora do JSON.
- Atenção a termos vagos ("prazo razoável", "conforme necessário", "a critério exclusivo"), inconsistências numéricas, lacunas, conflitos entre cláusulas e definições não utilizadas/ausentes.
- Identifique erros gramaticais e de coesão que mudem sentido, gerem ambiguidade ou permitam dupla interpretação; priorize problemas com efeito jurídico.`
          },
          {
            role: 'user',
            content: `Analise este contrato:\n\n${sanitizedConteudo}`
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

    // Capture tokens used
    const tokensUsados = data.usage?.total_tokens || 0;
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    console.log(`Tokens utilizados: ${tokensUsados} (prompt: ${promptTokens}, completion: ${completionTokens})`);

    if (!analiseTexto) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Análise recebida:', analiseTexto);

    // Try to parse as JSON
    let analise;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = analiseTexto.match(/```json\n?([\s\S]*?)\n?```/) || 
                        analiseTexto.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : analiseTexto;
      analise = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', parseError);
      // Create default structure if parsing fails
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

    // Save analysis to database
    const { data: savedAnalysis, error: insertError } = await supabase
      .from('contract_analysis')
      .insert({
        contrato_id: contratoId,
        organization_id: contrato.organization_id,
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

    // Register token usage
    if (tokensUsados > 0) {
      const { error: usageError } = await supabase
        .from('uso_sistema')
        .insert({
          tipo: 'ai_tokens',
          recurso: 'analisar-contrato-ia',
          quantidade: tokensUsados,
          custo_unitario: 0.00001,
          custo_total: tokensUsados * 0.00001,
          user_id: userId,
          contrato_id: contratoId,
          metadata: {
            modelo: 'google/gemini-2.5-flash',
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens
          }
        });

      if (usageError) {
        console.error('Erro ao registrar uso de tokens:', usageError);
      } else {
        console.log('Uso de tokens registrado com sucesso');
      }
    }

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
