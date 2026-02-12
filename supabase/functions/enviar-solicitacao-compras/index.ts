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

interface ServicoData {
  id: string;
  organization_id: string;
  itens_detalhados: string | null;
  quantidade: number;
  localizacao_fisica: string | null;
  data_validade: string;
  prioridade: string;
  valor_estimado: number | null;
  observacoes: string | null;
  unidades: {
    nome: string;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  especificacoes_servico: {
    nome: string;
    categoria: string;
    orgao_regulador: string | null;
  } | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  fornecedores: {
    nome: string;
    cnpj: string | null;
    telefone: string | null;
  } | null;
}

function calcularUrgencia(dataValidade: string): string {
  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diasRestantes <= 0) return "critica";
  if (diasRestantes <= 7) return "alta";
  if (diasRestantes <= 15) return "media";
  return "normal";
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

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Accept CRON_SECRET for scheduled calls OR authenticated user token
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    let isAuthorized = false;
    
    // Check CRON_SECRET first
    if (cronSecret && authHeader && authHeader.replace('Bearer ', '') === cronSecret) {
      isAuthorized = true;
    }
    
    // If not CRON, check if it's a valid authenticated user
    if (!isAuthorized && authHeader) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claimsError && claimsData?.claims?.sub) {
        isAuthorized = true;
        console.log(`Authenticated user: ${claimsData.claims.sub}`);
      }
    }
    
    if (!isAuthorized) {
      console.error('Unauthorized access attempt to enviar-solicitacao-compras');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const svcUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(svcUrl, supabaseKey);

    const { servicoId } = await req.json();

    if (!servicoId) {
      throw new Error("servicoId é obrigatório");
    }

    console.log(`Processando solicitação de compras para serviço: ${servicoId}`);

    // =========================================================
    // MULTI-TENANT: Fetch service with organization_id
    // The organization is resolved from the service itself
    // =========================================================
    const { data: servico, error: servicoError } = await supabase
      .from("servicos_periodicos")
      .select(`
        *,
        unidades(nome, endereco, cidade, estado),
        especificacoes_servico(nome, categoria, orgao_regulador),
        profiles:responsavel_id(full_name, email),
        fornecedores:fornecedor_preferencial_id(nome, cnpj, telefone)
      `)
      .eq("id", servicoId)
      .single();

    if (servicoError || !servico) {
      throw new Error(`Serviço não encontrado: ${servicoError?.message}`);
    }

    const organizationId = servico.organization_id;
    if (!organizationId) {
      throw new Error("Serviço não possui organization_id válido");
    }

    console.log(`[Org ${organizationId}] Processando serviço: ${servico.id}`);

    // Buscar histórico para estimativas - SCOPED BY ORGANIZATION
    const { data: historico } = await supabase
      .from("servico_historico")
      .select(`
        data_execucao,
        valor,
        observacoes,
        fornecedores:fornecedor_id(nome)
      `)
      .eq("organization_id", organizationId)
      .eq("servico_id", servicoId)
      .order("data_execucao", { ascending: false })
      .limit(5);

    // Verificar se já existe solicitação pendente/enviada - SCOPED BY ORGANIZATION
    const { data: existingSolicitacao } = await supabase
      .from("solicitacoes_compras")
      .select("id, status_envio")
      .eq("organization_id", organizationId)
      .eq("servico_id", servicoId)
      .in("status_envio", ["pendente", "enviado"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingSolicitacao && existingSolicitacao.length > 0) {
      console.log(`[Org ${organizationId}] Já existe solicitação pendente/enviada para este serviço`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Já existe solicitação pendente para este serviço",
          solicitacao_id: existingSolicitacao[0].id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração de integração - SCOPED BY ORGANIZATION
    const { data: config } = await supabase
      .from("integracao_config")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("tipo", "sistema_compras")
      .eq("is_active", true)
      .single();

    // Montar payload completo
    const payload = {
      origem: "LEXFLOW",
      tipo: "SERVICO_PERIODICO",
      organization_id: organizationId,
      data_solicitacao: new Date().toISOString(),
      urgencia: calcularUrgencia(servico.data_validade),
      servico: {
        id: servico.id,
        especificacao: servico.especificacoes_servico?.nome,
        categoria: servico.especificacoes_servico?.categoria,
        itens_detalhados: servico.itens_detalhados,
        quantidade: servico.quantidade,
        localizacao: servico.localizacao_fisica,
        data_vencimento: servico.data_validade,
        prioridade: servico.prioridade,
        orgao_regulador: servico.especificacoes_servico?.orgao_regulador,
      },
      unidade: {
        nome: servico.unidades?.nome,
        endereco: servico.unidades?.endereco,
        cidade: servico.unidades?.cidade,
        estado: servico.unidades?.estado,
        responsavel: servico.profiles?.full_name,
        email_responsavel: servico.profiles?.email,
      },
      estimativas: {
        valor_estimado: servico.valor_estimado,
        valor_ultima_execucao: historico?.[0]?.valor,
        fornecedor_preferencial: servico.fornecedores ? {
          nome: servico.fornecedores.nome,
          cnpj: servico.fornecedores.cnpj,
          telefone: servico.fornecedores.telefone,
        } : null,
      },
      historico: historico?.map((h: any) => ({
        data: h.data_execucao,
        valor: h.valor,
        fornecedor: h.fornecedores?.nome,
        observacoes: h.observacoes,
      })),
      observacoes: servico.observacoes,
    };

    // Se não há configuração ativa ou não há URL, apenas registrar como pendente
    if (!config || !config.url_api) {
      console.log(`[Org ${organizationId}] Integração não configurada - registrando como pendente`);
      
      const { data: solicitacao, error: insertError } = await supabase
        .from("solicitacoes_compras")
        .insert({
          organization_id: organizationId,
          servico_id: servicoId,
          status_envio: "pendente",
          payload_enviado: payload,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "pendente",
          message: "Solicitação registrada. Configure a integração para envio automático.",
          solicitacao_id: solicitacao.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tentar enviar para API de compras
    const apiUrl = config.url_api;
    const apiKey = Deno.env.get("COMPRAS_API_KEY");
    
    
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Adicionar autenticação conforme tipo
    if (config.tipo_autenticacao === "api_key" && apiKey) {
      headers["X-API-Key"] = apiKey;
    } else if (config.tipo_autenticacao === "bearer" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Adicionar headers customizados ANTES da autenticação para não sobrescrever
    if (config.headers_customizados && typeof config.headers_customizados === "object") {
      const customHeaders = config.headers_customizados as Record<string, string>;
      // Remove Authorization dos customizados para não sobrescrever
      const { Authorization: _removed, ...safeCustomHeaders } = customHeaders;
      headers = { ...headers, ...safeCustomHeaders };
    }


    console.log(`[Org ${organizationId}] Enviando para API: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}: ${JSON.stringify(resultado)}`);
      }

      // Registrar sucesso - SCOPED BY ORGANIZATION
      const { data: solicitacao, error: insertError } = await supabase
        .from("solicitacoes_compras")
        .insert({
          organization_id: organizationId,
          servico_id: servicoId,
          status_envio: "enviado",
          payload_enviado: payload,
          resposta_api: resultado,
          codigo_solicitacao: resultado.numero_solicitacao || resultado.id || null,
          enviado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`[Org ${organizationId}] Solicitação enviada com sucesso: ${solicitacao.id}`);

      // Log audit - SCOPED BY ORGANIZATION
      await supabase.from("audit_logs").insert({
        organization_id: organizationId,
        acao: 'PURCHASE_REQUEST_SENT',
        entidade: 'solicitacoes_compras',
        entidade_id: solicitacao.id,
        metadata: {
          servico_id: servicoId,
          api_response: resultado,
        },
        event_category: 'financial',
        risk_level: 'medium',
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "enviado",
          solicitacao_id: solicitacao.id,
          codigo_solicitacao: resultado.numero_solicitacao || resultado.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError: any) {
      console.error(`[Org ${organizationId}] Erro ao enviar para API: ${apiError.message}`);

      // Registrar erro - SCOPED BY ORGANIZATION
      const { data: solicitacao } = await supabase
        .from("solicitacoes_compras")
        .insert({
          organization_id: organizationId,
          servico_id: servicoId,
          status_envio: "erro",
          payload_enviado: payload,
          erro_mensagem: apiError.message,
          tentativas: 1,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ 
          success: false, 
          status: "erro",
          message: apiError.message,
          solicitacao_id: solicitacao?.id,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error(`Erro geral: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
