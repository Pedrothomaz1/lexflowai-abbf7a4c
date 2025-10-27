import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificacaoRequest {
  contratoId: string
  contratoNumero: string
  contratoTitulo: string
  novoStatus: string
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contratoId, contratoNumero, contratoTitulo, novoStatus } = await req.json() as NotificacaoRequest

    console.log('Processando notificação para contrato:', contratoNumero)

    // Buscar aprovadores (consultoria_juridica e administrador)
    const { data: aprovadores, error: aprovadoresError } = await supabaseClient
      .from('user_roles')
      .select('user_id, profiles!inner(full_name, phone)')
      .in('role', ['consultoria_juridica', 'administrador'])

    if (aprovadoresError) {
      console.error('Erro ao buscar aprovadores:', aprovadoresError)
      throw aprovadoresError
    }

    console.log('Aprovadores encontrados:', aprovadores?.length)

    // Filtrar apenas aprovadores com telefone cadastrado
    const aprovadoresComTelefone = aprovadores?.filter(
      (aprovador: any) => aprovador.profiles && (aprovador.profiles as any).phone
    ) || []

    console.log('Aprovadores com telefone:', aprovadoresComTelefone.length)

    if (aprovadoresComTelefone.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum aprovador com telefone cadastrado' 
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
    for (const aprovador of aprovadoresComTelefone) {
      try {
        const profile = aprovador.profiles as any
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
          console.log(`Notificação enviada para ${profile.full_name}`)
        } else {
          notificacoesEnviadas.push({
            nome: profile.full_name,
            telefone: telefone,
            status: 'erro',
            erro: 'Falha ao enviar pela Evolution API',
          })
        }
      } catch (error: any) {
        const profile = aprovador.profiles as any
        console.error(`Erro ao enviar notificação para ${profile?.full_name || 'aprovador'}:`, error)
        notificacoesEnviadas.push({
          nome: profile?.full_name || 'Desconhecido',
          status: 'erro',
          erro: error?.message || 'Erro desconhecido',
        })
      }
    }

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
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
