import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS: use wildcard since this endpoint is already protected by JWT auth
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileUrl, contratoId } = requestBody;

    if (!fileUrl || typeof fileUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'fileUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate contratoId if provided
    if (contratoId && !UUID_REGEX.test(contratoId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid contract ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: enforce that fileUrl belongs to caller's org folder or own user folder
    const firstSegment = fileUrl.split('/')[0];
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true);
    const allowedPrefixes = new Set<string>([user.id, ...((memberships || []).map((m: any) => m.organization_id))]);
    if (!firstSegment || !allowedPrefixes.has(firstSegment)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado ao arquivo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting data from file: ${fileUrl}`);

    // Validate file extension — Gemini supports PDF + images directly; DOCX is extracted to text.
    const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    const isDocx = ext === 'docx';
    const mimeType = mimeMap[ext];
    if (!mimeType && !isDocx) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Formato .${ext} não suportado. Envie PDF, DOCX ou imagem.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL and download file
    const { data: urlData } = await supabase
      .storage
      .from('contratos-documentos')
      .createSignedUrl(fileUrl, 120);

    if (!urlData?.signedUrl) {
      console.error('Error generating signed URL');
      return new Response(
        JSON.stringify({ success: false, error: 'Could not access file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileResp = await fetch(urlData.signedUrl);
    if (!fileResp.ok) {
      throw new Error(`Failed to download file: ${fileResp.status}`);
    }
    const fileBuf = new Uint8Array(await fileResp.arrayBuffer());

    let userContent: any;
    if (isDocx) {
      // Extract text from DOCX
      const mammoth = await import('npm:mammoth@1.8.0');
      const { value: docText } = await mammoth.extractRawText({ buffer: fileBuf });
      const trimmed = (docText || '').slice(0, 120000);
      if (!trimmed.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Não foi possível extrair texto do DOCX.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userContent = [{
        type: 'text',
        text: `Analise este contrato (texto extraído de DOCX) e extraia as informações estruturadas. Conteúdo:\n\n${trimmed}`
      }];
    } else {
      // Base64 encode in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < fileBuf.length; i += chunkSize) {
        binary += String.fromCharCode(...fileBuf.subarray(i, i + chunkSize));
      }
      const dataUrl = `data:${mimeType};base64,${btoa(binary)}`;
      userContent = [
        { type: 'text', text: 'Analise este documento de contrato e extraia as informações estruturadas. Seja preciso e extraia apenas o que está claramente presente no documento.' },
        { type: 'image_url', image_url: { url: dataUrl } }
      ];
    }


    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI for extraction
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
            role: 'user',
            content: userContent
          }
        ],

        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_contract_data',
              description: 'Extrai dados estruturados de um contrato',
              parameters: {
                type: 'object',
                properties: {
                  titulo: {
                    type: 'string',
                    description: 'Título ou objeto do contrato'
                  },
                  numero_contrato: {
                    type: 'string',
                    description: 'Número ou identificador do contrato'
                  },
                  tipo: {
                    type: 'string',
                    enum: ['prestacao_servicos', 'fornecimento', 'locacao', 'confidencialidade', 'parceria', 'outro'],
                    description: 'Tipo do contrato'
                  },
                  contratante: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome/Razão social do contratante' },
                      documento: { type: 'string', description: 'CNPJ ou CPF do contratante' }
                    }
                  },
                  contratada: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome/Razão social da contratada' },
                      documento: { type: 'string', description: 'CNPJ ou CPF da contratada' }
                    }
                  },
                  valor_total: {
                    type: 'number',
                    description: 'Valor total do contrato em reais (apenas número)'
                  },
                  data_inicio: {
                    type: 'string',
                    description: 'Data de início da vigência no formato YYYY-MM-DD'
                  },
                  data_fim: {
                    type: 'string',
                    description: 'Data de término da vigência no formato YYYY-MM-DD'
                  },
                  data_assinatura: {
                    type: 'string',
                    description: 'Data de assinatura no formato YYYY-MM-DD'
                  },
                  objeto: {
                    type: 'string',
                    description: 'Descrição do objeto do contrato (máximo 500 caracteres)'
                  },
                  clausulas_principais: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        numero: { type: 'string', description: 'Número da cláusula' },
                        titulo: { type: 'string', description: 'Título da cláusula' },
                        resumo: { type: 'string', description: 'Resumo do conteúdo' }
                      }
                    },
                    description: 'Lista das principais cláusulas identificadas'
                  },
                  confianca: {
                    type: 'number',
                    description: 'Nível de confiança da extração de 0 a 100'
                  }
                },
                required: ['confianca'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_contract_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Log token usage
    const tokensUsados = aiResponse.usage?.total_tokens || 0;
    const promptTokens = aiResponse.usage?.prompt_tokens || 0;
    const completionTokens = aiResponse.usage?.completion_tokens || 0;

    console.log(`Tokens used: ${tokensUsados} (prompt: ${promptTokens}, completion: ${completionTokens})`);

    // Register usage
    if (tokensUsados > 0) {
      await supabase
        .from('uso_sistema')
        .insert({
          tipo: 'ai_tokens',
          recurso: 'extrair-dados-pdf',
          quantidade: tokensUsados,
          custo_unitario: 0.00001,
          custo_total: tokensUsados * 0.00001,
          user_id: user.id,
          contrato_id: contratoId || null,
          metadata: {
            modelo: 'google/gemini-2.5-flash',
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens
          }
        });
    }

    // Extract data from tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const extractedData = JSON.parse(toolCall.function.arguments);
      
      console.log('Extraction successful:', JSON.stringify(extractedData));
      
      return new Response(
        JSON.stringify({
          success: true,
          data: extractedData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not extract data from document'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting PDF data:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
