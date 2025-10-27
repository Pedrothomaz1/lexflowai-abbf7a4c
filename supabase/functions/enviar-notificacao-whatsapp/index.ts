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

    // Configurar a API de WhatsApp (exemplo genérico)
    const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL')
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY')

    if (!whatsappApiUrl || !whatsappApiKey) {
      console.error('Credenciais do WhatsApp não configuradas')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Credenciais do WhatsApp não configuradas. Configure WHATSAPP_API_URL e WHATSAPP_API_KEY.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Mensagem personalizada
    const mensagem = `🔔 *Novo Contrato para Aprovação*\n\n` +
      `📄 *Contrato:* ${contratoNumero}\n` +
      `📋 *Título:* ${contratoTitulo}\n` +
      `📊 *Status:* ${novoStatus.replace(/_/g, ' ')}\n\n` +
      `Por favor, acesse o sistema LexFlow para revisar e aprovar este contrato.`

    const notificacoesEnviadas = []

    // Enviar notificação para cada aprovador
    for (const aprovador of aprovadoresComTelefone) {
      try {
        const profile = aprovador.profiles as any
        const telefone = profile.phone.replace(/\D/g, '') // Remove formatação
        
        // Exemplo de chamada genérica - adaptar conforme a API escolhida
        const response = await fetch(whatsappApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${whatsappApiKey}`,
          },
          body: JSON.stringify({
            phone: telefone,
            message: mensagem,
            // Adicionar campos específicos da API conforme necessário
          }),
        })

        if (response.ok) {
          notificacoesEnviadas.push({
            nome: profile.full_name,
            telefone: telefone,
            status: 'enviado',
          })
          console.log(`Notificação enviada para ${profile.full_name}`)
        } else {
          const errorText = await response.text()
          console.error(`Erro ao enviar para ${profile.full_name}:`, errorText)
          notificacoesEnviadas.push({
            nome: profile.full_name,
            telefone: telefone,
            status: 'erro',
            erro: errorText,
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
