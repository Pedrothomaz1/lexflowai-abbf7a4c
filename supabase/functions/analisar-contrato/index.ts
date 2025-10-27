import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Buscar o arquivo do storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('contratos-documentos')
      .download(fileUrl);

    if (downloadError) {
      console.error('Erro ao baixar arquivo:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao baixar arquivo do storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter arquivo para base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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
            role: "system",
            content: "Você é um assistente especializado em análise de contratos. Sua função é extrair informações-chave de documentos de contrato, especialmente as datas de início e término da vigência."
          },
          {
            role: "user",
            content: "Analise este documento de contrato e extraia a data de início e a data de término da vigência. Retorne APENAS no formato JSON: {\"data_inicio\": \"YYYY-MM-DD\", \"data_fim\": \"YYYY-MM-DD\"}. Se não encontrar as datas, retorne null para os campos correspondentes."
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
