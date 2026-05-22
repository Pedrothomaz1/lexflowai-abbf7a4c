import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

// Allowed origins for CORS
const STATIC_ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lexflowai.com.br',
  'https://www.lexflowai.com.br',
  'https://lexflowai.lovable.app',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean));

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/i,
];

function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

// Get CORS headers based on request origin
function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') || '';
  if (!isOriginAllowed(origin)) return null;
  const allowedOrigin = origin || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

type ExtractionPayload = {
  data_inicio?: string | null;
  data_fim?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  tipo?: string | null;
  valor_total?: string | null;
  moeda?: string | null;
  fornecedor_nome?: string | null;
};

const EXTRACTION_TOOL = {
  type: "function",
  function: {
    name: "extract_contract_dates",
    description: "Extrai campos principais de um contrato",
    parameters: {
      type: "object",
      properties: {
        data_inicio: { type: "string", description: "YYYY-MM-DD ou string vazia" },
        data_fim: { type: "string", description: "YYYY-MM-DD ou string vazia" },
        titulo: { type: "string" },
        descricao: { type: "string" },
        tipo: { type: "string", enum: ["prestacao_servicos", "fornecimento", "locacao", "confidencialidade", "parceria", "outro"] },
        valor_total: { type: "string", description: "Número como string, ex.: 12000.50" },
        moeda: { type: "string", enum: ["BRL", "USD", "EUR"] },
        fornecedor_nome: { type: "string" },
      },
      required: ["data_inicio", "data_fim", "titulo", "descricao", "tipo", "valor_total", "moeda", "fornecedor_nome"],
      additionalProperties: false,
    },
  },
};

const extractionPrompt = `Você é um assistente jurídico. Analise este contrato e extraia os campos abaixo. Use estritamente o formato do schema da função. Se um campo não for identificável com segurança, retorne string vazia.

Campos:
- data_inicio, data_fim (YYYY-MM-DD; procure por "vigência", "prazo", "início", "término")
- titulo: título curto descritivo (ex.: "Prestação de Serviços de TI - Acme")
- descricao: objeto/escopo em 1-2 frases
- tipo: um de [prestacao_servicos, fornecimento, locacao, confidencialidade, parceria, outro]
- valor_total: número como string, somente dígitos e ponto decimal, sem moeda/símbolo
- moeda: BRL, USD ou EUR
- fornecedor_nome: razão social/nome da parte contratada/fornecedora (sem CNPJ).`;

function detectMimeType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function hasGoodText(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > 500 && (normalized.match(/[A-Za-zÀ-ÿ]/g) || []).length > 100;
}

async function extractNativeText(fileBytes: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') return new TextDecoder().decode(fileBytes);
  if (mimeType === 'application/pdf') {
    try {
      const data = await pdfParse(Buffer.from(fileBytes));
      return data.text || '';
    } catch (error) {
      console.warn('Native PDF extraction failed:', error);
      return '';
    }
  }
  return '';
}

async function callExtractionAI(params: {
  apiKey: string;
  input: { kind: 'text'; text: string } | { kind: 'file'; base64: string; mimeType: string };
}): Promise<{ payload: ExtractionPayload | null; usage: { total: number; prompt: number; completion: number } }> {
  const content = params.input.kind === 'text'
    ? `${extractionPrompt}\n\nTexto do contrato:\n${params.input.text.slice(0, 30000)}`
    : [
        { type: 'text', text: extractionPrompt },
        {
          type: 'file',
          file: {
            filename: params.input.mimeType === 'application/pdf' ? 'contrato.pdf' : 'contrato.txt',
            file_data: `data:${params.input.mimeType};base64,${params.input.base64}`,
          },
        },
      ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content }],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "function", function: { name: "extract_contract_dates" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na API Lovable:', response.status, errorText);
    if (response.status === 429) throw new Error("Limite de requisições excedido. Tente novamente mais tarde.");
    if (response.status === 402) throw new Error("Créditos insuficientes. Adicione fundos ao seu workspace Lovable AI.");
    throw new Error('Erro na API de IA');
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  const payload = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;

  return {
    payload,
    usage: {
      total: aiResponse.usage?.total_tokens || 0,
      prompt: aiResponse.usage?.prompt_tokens || 0,
      completion: aiResponse.usage?.completion_tokens || 0,
    },
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

    if (!fileUrl || typeof fileUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL do arquivo não fornecida' }),
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
        JSON.stringify({ error: 'Acesso negado ao arquivo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
                text: `Você é um assistente jurídico. Analise este contrato e extraia os campos abaixo. Use estritamente o formato do schema da função. Se um campo não for identificável com segurança, retorne string vazia.

Campos:
- data_inicio, data_fim (YYYY-MM-DD; procure por "vigência", "prazo", "início", "término")
- titulo: título curto descritivo (ex.: "Prestação de Serviços de TI - Acme")
- descricao: objeto/escopo em 1-2 frases
- tipo: um de [prestacao_servicos, fornecimento, locacao, confidencialidade, parceria, outro]
- valor_total: número como string, somente dígitos e ponto decimal, sem moeda/símbolo
- moeda: BRL, USD ou EUR
- fornecedor_nome: razão social/nome da parte contratada/fornecedora (sem CNPJ).`
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
              description: "Extrai campos principais de um contrato",
              parameters: {
                type: "object",
                properties: {
                  data_inicio: { type: "string", description: "YYYY-MM-DD" },
                  data_fim: { type: "string", description: "YYYY-MM-DD" },
                  titulo: { type: "string" },
                  descricao: { type: "string" },
                  tipo: { type: "string", enum: ["prestacao_servicos","fornecimento","locacao","confidencialidade","parceria","outro"] },
                  valor_total: { type: "string", description: "Número como string, ex.: 12000.50" },
                  moeda: { type: "string", enum: ["BRL","USD","EUR"] },
                  fornecedor_nome: { type: "string" }
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
          data_fim: extractedData.data_fim || null,
          titulo: extractedData.titulo || null,
          descricao: extractedData.descricao || null,
          tipo: extractedData.tipo || null,
          valor_total: extractedData.valor_total || null,
          moeda: extractedData.moeda || null,
          fornecedor_nome: extractedData.fornecedor_nome || null,
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
