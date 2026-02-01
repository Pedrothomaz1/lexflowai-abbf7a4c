import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'URL do arquivo não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando análise do contrato:', fileUrl);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Obter URL pública do arquivo
    const { data: urlData } = await supabase
      .storage
      .from('contratos-documentos')
      .createSignedUrl(fileUrl, 60); // URL válida por 60 segundos

    if (!urlData?.signedUrl) {
      console.error('Erro ao gerar URL do arquivo');
      return new Response(
        JSON.stringify({ error: 'Erro ao acessar arquivo do storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('URL gerada para análise');

    // Chamar Lovable AI para analisar o documento
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise este documento de contrato e extraia a data de início (vigência inicial) e a data de término (vigência final) do contrato. Procure por termos como 'vigência', 'prazo', 'início', 'término', 'validade', etc. Retorne as datas no formato YYYY-MM-DD."
              },
              {
                type: "image_url",
                image_url: {
                  url: urlData.signedUrl
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_contract_dates",
              description: "Extrai as datas de início e término de um contrato",
              parameters: {
                type: "object",
                properties: {
                  data_inicio: {
                    type: "string",
                    description: "Data de início da vigência do contrato no formato YYYY-MM-DD"
                  },
                  data_fim: {
                    type: "string",
                    description: "Data de término da vigência do contrato no formato YYYY-MM-DD"
                  }
                },
                required: ["data_inicio", "data_fim"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_contract_dates" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione fundos ao seu workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Erro na API de IA');
    }

    const aiResponse = await response.json();
    console.log('Resposta da IA:', JSON.stringify(aiResponse));

    // Capturar tokens utilizados
    const tokensUsados = aiResponse.usage?.total_tokens || 0;
    const promptTokens = aiResponse.usage?.prompt_tokens || 0;
    const completionTokens = aiResponse.usage?.completion_tokens || 0;

    console.log(`Tokens utilizados: ${tokensUsados} (prompt: ${promptTokens}, completion: ${completionTokens})`);

    // Registrar uso de tokens (user já validado no início)
    if (tokensUsados > 0) {
      const { error: usageError } = await supabase
        .from('uso_sistema')
        .insert({
          tipo: 'ai_tokens',
          recurso: 'analisar-contrato',
          quantidade: tokensUsados,
          custo_unitario: 0.00001,
          custo_total: tokensUsados * 0.00001,
          user_id: user.id,
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

    // Extrair dados do tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const extractedData = JSON.parse(toolCall.function.arguments);
      
      return new Response(
        JSON.stringify({
          success: true,
          data_inicio: extractedData.data_inicio || null,
          data_fim: extractedData.data_fim || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível extrair as datas do contrato'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao analisar contrato:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
