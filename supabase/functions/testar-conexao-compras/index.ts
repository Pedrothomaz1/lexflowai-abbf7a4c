import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, tipo_autenticacao, organization_id } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, message: 'URL não informada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build headers based on auth type
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const apiKey = Deno.env.get("COMPRAS_API_KEY");

    if (tipo_autenticacao === "api_key" && apiKey) {
      headers["X-API-Key"] = apiKey;
    } else if (tipo_autenticacao === "bearer" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (tipo_autenticacao === "basic" && apiKey) {
      headers["Authorization"] = `Basic ${apiKey}`;
    }

    console.log(`Testing connection to: ${url}`);

    // Try a GET or OPTIONS request to check connectivity
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const statusCode = response.status;
    const isSuccess = statusCode >= 200 && statusCode < 500; // Even 4xx means server is reachable

    // Update config status if org provided
    if (organization_id) {
      await supabase
        .from("integracao_config")
        .update({
          ultimo_teste: new Date().toISOString(),
          status_ultimo_teste: isSuccess ? "success" : "error",
        })
        .eq("organization_id", organization_id)
        .eq("tipo", "sistema_compras");
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        status_code: statusCode,
        message: isSuccess
          ? `Conexão estabelecida com sucesso (HTTP ${statusCode})`
          : `Servidor retornou erro HTTP ${statusCode}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`Connection test failed: ${error.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Não foi possível conectar: ${error.message}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
