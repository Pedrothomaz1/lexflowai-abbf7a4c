import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

interface NotificacaoRequest {
  contratoId: string
  contratoNumero: string
  contratoTitulo: string
  novoStatus: string
  organizationId?: string // For CRON calls - but we NEVER trust this, we resolve from contract
}

// Função para enviar mensagem via Evolution API
async function enviarWhatsAppEvolution(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  numero: string,
  mensagem: string
): Promise<boolean> {
  try {
    const url = `${apiUrl}/message/sendText/${instanceName}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: numero,
        text: mensagem,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na Evolution API:', errorText)
      return false
    }

    const result = await response.json()
    console.log('Resposta Evolution API:', result)
    return true
  } catch (error: any) {
    console.error('Erro ao enviar WhatsApp:', error)
    return false
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Reject requests from unauthorized origins
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contratoId, contratoNumero, contratoTitulo, novoStatus } = await req.json() as NotificacaoRequest

    console.log('Processando notificação para contrato:', contratoNumero || contratoId)

    // =========================================================
    // MULTI-TENANT: Resolve organization from contract
    // NEVER trust organizationId from request body
    // =========================================================
    let organizationId: string | null = null

    if (contratoId) {
      const { data: contract } = await supabaseClient
        .from('contratos')
        .select('organization_id')
        .eq('id', contratoId)
        .single()
      
      if (contract?.organization_id) {
        organizationId = contract.organization_id
      }
    }

    if (!organizationId) {
      console.error('Não foi possível determinar a organização para o contrato')
      return new Response(
        JSON.stringify({ success: false, error: 'Organização não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processando WhatsApp para organização: ${organizationId}`)

    // =========================================================
    // Get organization members first - SCOPED BY ORGANIZATION
    // =========================================================
    const { data: orgMembers } = await supabaseClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (!orgMembers || orgMembers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum membro ativo na organização' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const memberUserIds = orgMembers.map(m => m.user_id)

    // Buscar aprovadores (consultoria_juridica e administrador) - SCOPED BY ORGANIZATION MEMBERS
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .in('role', ['consultoria_juridica', 'administrador'])
      .in('user_id', memberUserIds)

    if (rolesError) {
      console.error('Erro ao buscar roles:', rolesError)
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao processar notificação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userRoles || userRoles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum aprovador encontrado na organização' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = userRoles.map(r => r.user_id)

    // Buscar profiles dos aprovadores
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds)
      .not('phone', 'is', null)

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError)
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao processar notificação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Org ${organizationId}] Aprovadores encontrados:`, profiles?.length || 0)

    // Filtrar apenas aprovadores com telefone cadastrado
    const aprovadoresComTelefone = profiles?.filter(
      (profile: any) => profile.phone && profile.phone.trim() !== ''
    ) || []

    console.log(`[Org ${organizationId}] Aprovadores com telefone:`, aprovadoresComTelefone.length)

    if (aprovadoresComTelefone.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum aprovador com telefone cadastrado na organização' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configurar Evolution API
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
    const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME')

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      console.error('Credenciais da Evolution API não configuradas')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Credenciais da Evolution API não configuradas. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Mensagem personalizada
    const mensagem = `🔔 *Novo Contrato para Aprovação - VERI*\n\n` +
      `📄 *Contrato:* ${contratoNumero}\n` +
      `📋 *Título:* ${contratoTitulo}\n` +
      `📊 *Status:* ${novoStatus.replace(/_/g, ' ')}\n\n` +
      `Por favor, acesse o sistema LexFlow para revisar e aprovar este contrato.\n\n` +
      `_VERI - Por Veridiana Quirino_`

    const notificacoesEnviadas = []

    // Enviar notificação para cada aprovador
    for (const profile of aprovadoresComTelefone) {
      try {
        let telefone = profile.phone.replace(/\D/g, '') // Remove formatação
        
        // Adicionar código do país se não tiver (Brasil = 55)
        if (!telefone.startsWith('55')) {
          telefone = '55' + telefone
        }

        const sucesso = await enviarWhatsAppEvolution(
          evolutionApiUrl,
          evolutionApiKey,
          evolutionInstance,
          telefone,
          mensagem
        )

        if (sucesso) {
          notificacoesEnviadas.push({
            nome: profile.full_name,
            telefone: telefone,
            status: 'enviado',
          })
          console.log(`[Org ${organizationId}] Notificação enviada para ${profile.full_name}`)
        } else {
          notificacoesEnviadas.push({
            nome: profile.full_name,
            telefone: telefone,
            status: 'erro',
            erro: 'Falha ao enviar pela Evolution API',
          })
        }
      } catch (error: any) {
        console.error(`[Org ${organizationId}] Erro ao enviar notificação para ${profile?.full_name || 'aprovador'}:`, error)
        notificacoesEnviadas.push({
          nome: profile?.full_name || 'Desconhecido',
          status: 'erro',
          erro: error?.message || 'Erro desconhecido',
        })
      }
    }

    // Log audit - SCOPED BY ORGANIZATION
    await supabaseClient.from('audit_logs').insert({
      organization_id: organizationId,
      acao: 'WHATSAPP_NOTIFICATION_SENT',
      entidade: 'contratos',
      entidade_id: contratoId,
      metadata: {
        recipients: notificacoesEnviadas.length,
        success_count: notificacoesEnviadas.filter(n => n.status === 'enviado').length,
      },
      event_category: 'notification',
      risk_level: 'low',
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificações processadas',
        notificacoes: notificacoesEnviadas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Erro ao processar notificação:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao enviar notificação' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
