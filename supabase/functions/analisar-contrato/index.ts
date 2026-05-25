import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

// CORS: use wildcard since this endpoint is already protected by JWT auth
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
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

    const { data: fileBlob, error: downloadError } = await supabase
      .storage
      .from('contratos-documentos')
      .download(fileUrl);

    if (downloadError || !fileBlob) {
      console.error('Erro ao baixar arquivo do storage:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao acessar arquivo do storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
    const detectedMimeType = detectMimeType(fileUrl);
    const mimeType = !fileBlob.type || fileBlob.type === 'application/octet-stream' ? detectedMimeType : fileBlob.type;
    const nativeText = await extractNativeText(fileBytes, mimeType);
    const input = hasGoodText(nativeText)
      ? { kind: 'text' as const, text: nativeText }
      : { kind: 'file' as const, base64: toBase64(fileBytes), mimeType };

    console.log(`Método de extração: ${input.kind === 'text' ? 'texto nativo' : 'arquivo multimodal/OCR'}; caracteres nativos=${nativeText.length}`);

    const { payload: extractedData, usage } = await callExtractionAI({
      apiKey: LOVABLE_API_KEY,
      input,
    });

    // Capturar tokens utilizados
    const tokensUsados = usage.total;
    const promptTokens = usage.prompt;
    const completionTokens = usage.completion;

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

    if (extractedData) {
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
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
