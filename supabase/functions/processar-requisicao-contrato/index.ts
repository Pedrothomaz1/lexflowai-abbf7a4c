import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContractRequestInput {
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone?: string;
  departamento: string;
  tipo_contrato: string;
  titulo: string;
  descricao: string;
  justificativa?: string;
  valor_estimado?: number;
  urgencia: string;
  data_necessidade?: string;
  fornecedor_sugerido?: string;
  honeypot?: string; // Anti-spam field
}

// Input validation
function validateInput(data: ContractRequestInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.solicitante_nome?.trim() || data.solicitante_nome.length < 3) {
    errors.push("Nome do solicitante é obrigatório (mínimo 3 caracteres)");
  }
  if (data.solicitante_nome?.length > 100) {
    errors.push("Nome do solicitante deve ter no máximo 100 caracteres");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.solicitante_email?.trim() || !emailRegex.test(data.solicitante_email)) {
    errors.push("Email inválido");
  }
  if (data.solicitante_email?.length > 255) {
    errors.push("Email deve ter no máximo 255 caracteres");
  }

  if (!data.departamento?.trim()) {
    errors.push("Departamento é obrigatório");
  }
  if (data.departamento?.length > 100) {
    errors.push("Departamento deve ter no máximo 100 caracteres");
  }

  if (!data.titulo?.trim() || data.titulo.length < 5) {
    errors.push("Título é obrigatório (mínimo 5 caracteres)");
  }
  if (data.titulo?.length > 200) {
    errors.push("Título deve ter no máximo 200 caracteres");
  }

  if (!data.descricao?.trim() || data.descricao.length < 20) {
    errors.push("Descrição é obrigatória (mínimo 20 caracteres)");
  }
  if (data.descricao?.length > 5000) {
    errors.push("Descrição deve ter no máximo 5000 caracteres");
  }

  const validUrgencies = ["baixa", "media", "alta", "critica"];
  if (!data.urgencia || !validUrgencies.includes(data.urgencia)) {
    errors.push("Urgência inválida");
  }

  const validTypes = ["prestacao_servicos", "fornecimento", "locacao", "confidencialidade", "parceria", "outro"];
  if (!data.tipo_contrato || !validTypes.includes(data.tipo_contrato)) {
    errors.push("Tipo de contrato inválido");
  }

  // Optional field validations
  if (data.justificativa && data.justificativa.length > 2000) {
    errors.push("Justificativa deve ter no máximo 2000 caracteres");
  }

  if (data.valor_estimado !== undefined && data.valor_estimado !== null) {
    if (isNaN(data.valor_estimado) || data.valor_estimado < 0) {
      errors.push("Valor estimado deve ser um número positivo");
    }
  }

  if (data.fornecedor_sugerido && data.fornecedor_sugerido.length > 200) {
    errors.push("Fornecedor sugerido deve ter no máximo 200 caracteres");
  }

  if (data.solicitante_telefone && data.solicitante_telefone.length > 20) {
    errors.push("Telefone deve ter no máximo 20 caracteres");
  }

  return { valid: errors.length === 0, errors };
}

// Sanitize text input
function sanitize(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>]/g, "") // Remove remaining angle brackets
    .trim()
    .slice(0, 10000); // Limit length
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP and user agent for audit
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      req.headers.get("cf-connecting-ip") || 
                      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create Supabase client with service role for bypassing RLS on rate limit check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check: max 5 requests per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("contract_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("created_at", oneHourAgo);

    if (count && count >= 5) {
      console.log(`Rate limit exceeded for IP: ${ipAddress}`);
      return new Response(
        JSON.stringify({ 
          error: "Limite de requisições excedido. Tente novamente em 1 hora." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ContractRequestInput = await req.json();

    // Honeypot check (anti-spam)
    if (body.honeypot) {
      console.log(`Honeypot triggered for IP: ${ipAddress}`);
      // Return success to avoid revealing the trap
      return new Response(
        JSON.stringify({ 
          success: true, 
          numero_requisicao: "REQ-SPAM-DETECTED",
          message: "Requisição recebida com sucesso!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare data for insertion (sanitize all text fields)
    const insertData = {
      solicitante_nome: sanitize(body.solicitante_nome),
      solicitante_email: sanitize(body.solicitante_email).toLowerCase(),
      solicitante_telefone: sanitize(body.solicitante_telefone) || null,
      departamento: sanitize(body.departamento),
      tipo_contrato: body.tipo_contrato,
      titulo: sanitize(body.titulo),
      descricao: sanitize(body.descricao),
      justificativa: sanitize(body.justificativa) || null,
      valor_estimado: body.valor_estimado || null,
      urgencia: body.urgencia,
      data_necessidade: body.data_necessidade || null,
      fornecedor_sugerido: sanitize(body.fornecedor_sugerido) || null,
      ip_address: ipAddress,
      user_agent: userAgent.slice(0, 500),
      numero_requisicao: "", // Will be generated by trigger
    };

    console.log(`Processing contract request from: ${insertData.solicitante_email}, IP: ${ipAddress}`);

    // Insert into database
    const { data, error } = await supabase
      .from("contract_requests")
      .insert(insertData)
      .select("id, numero_requisicao")
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Contract request created: ${data.numero_requisicao}`);

    // Return success with protocol number
    return new Response(
      JSON.stringify({
        success: true,
        numero_requisicao: data.numero_requisicao,
        message: `Sua requisição foi recebida com sucesso! Guarde o número de protocolo: ${data.numero_requisicao}`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente mais tarde." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
