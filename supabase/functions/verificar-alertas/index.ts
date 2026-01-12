import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando verificação de alertas automáticos...');

    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];

    // Buscar contratos que estão vencendo
    const { data: contratos, error: contratosError } = await supabase
      .from('contratos')
      .select('*')
      .eq('status', 'vigente')
      .not('data_fim', 'is', null);

    if (contratosError) {
      console.error('Erro ao buscar contratos:', contratosError);
      throw contratosError;
    }

    const alertasCriados = [];

    for (const contrato of contratos || []) {
      const dataFim = new Date(contrato.data_fim);
      const diffDias = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Criar alertas em intervalos específicos: 30, 15, 7 e 1 dia antes
      const diasParaAlertar = [30, 15, 7, 1];

      for (const dias of diasParaAlertar) {
        if (diffDias === dias) {
          // Verificar se já existe alerta para esta data
          const { data: alertaExistente } = await supabase
            .from('contract_alerts')
            .select('id')
            .eq('contrato_id', contrato.id)
            .eq('tipo_alerta', 'vencimento')
            .eq('dias_antecedencia', dias)
            .maybeSingle();

          if (!alertaExistente) {
            const { data: novoAlerta, error: alertaError } = await supabase
              .from('contract_alerts')
              .insert({
                contrato_id: contrato.id,
                tipo_alerta: 'vencimento',
                titulo: `Contrato vencendo em ${dias} dias`,
                mensagem: `O contrato ${contrato.numero_contrato} - ${contrato.titulo} vence em ${dias} dias (${dataFim.toLocaleDateString('pt-BR')})`,
                data_alerta: dataFim.toISOString().split('T')[0],
                dias_antecedencia: dias,
                enviado: false,
              })
              .select()
              .single();

            if (!alertaError && novoAlerta) {
              alertasCriados.push(novoAlerta);
              console.log(`Alerta criado: ${novoAlerta.titulo} para contrato ${contrato.numero_contrato}`);
            }
          }
        }
      }

      // Alertas de renovação (60 dias antes)
      if (diffDias === 60) {
        const { data: alertaExistente } = await supabase
          .from('contract_alerts')
          .select('id')
          .eq('contrato_id', contrato.id)
          .eq('tipo_alerta', 'renovacao')
          .maybeSingle();

        if (!alertaExistente) {
          await supabase
            .from('contract_alerts')
            .insert({
              contrato_id: contrato.id,
              tipo_alerta: 'renovacao',
              titulo: 'Contrato próximo da renovação',
              mensagem: `O contrato ${contrato.numero_contrato} pode precisar de renovação. Vence em ${diffDias} dias.`,
              data_alerta: dataFim.toISOString().split('T')[0],
              dias_antecedencia: 60,
              enviado: false,
            });
        }
      }
    }

    // Buscar obrigações vencendo com informações do contrato e responsável
    const { data: obrigacoes, error: obrigacoesError } = await supabase
      .from('contract_obligations')
      .select(`
        *,
        contratos (
          numero_contrato,
          titulo
        ),
        profiles:responsavel_id (
          full_name,
          email
        )
      `)
      .eq('status', 'pendente')
      .gte('data_vencimento', dataHoje);

    if (!obrigacoesError && obrigacoes) {
      for (const obrigacao of obrigacoes) {
        const dataVencimento = new Date(obrigacao.data_vencimento);
        const diffDias = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if ([7, 3, 1].includes(diffDias)) {
          const { data: alertaExistente } = await supabase
            .from('contract_alerts')
            .select('id')
            .eq('contrato_id', obrigacao.contrato_id)
            .eq('tipo_alerta', 'obrigacao')
            .eq('dias_antecedencia', diffDias)
            .ilike('mensagem', `%${obrigacao.titulo}%`)
            .maybeSingle();

          if (!alertaExistente) {
            const responsavelNome = obrigacao.profiles?.full_name || 'Não atribuído';
            const contratoNumero = obrigacao.contratos?.numero_contrato || 'N/A';
            const tipoLabels: Record<string, string> = {
              pagamento: '💰 Pagamento',
              entrega: '📦 Entrega',
              relatorio: '📋 Relatório',
              renovacao: '🔄 Renovação',
              notificacao: '🔔 Notificação'
            };
            const tipoLabel = tipoLabels[obrigacao.tipo as string] || '📋 Obrigação';

            const valorFormatado = obrigacao.valor 
              ? ` | Valor: R$ ${obrigacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '';

            await supabase
              .from('contract_alerts')
              .insert({
                contrato_id: obrigacao.contrato_id,
                tipo_alerta: 'obrigacao',
                titulo: `${tipoLabel} vencendo em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`,
                mensagem: `${obrigacao.titulo} (Contrato: ${contratoNumero}) | Responsável: ${responsavelNome}${valorFormatado} | Vence em ${dataVencimento.toLocaleDateString('pt-BR')}`,
                data_alerta: dataVencimento.toISOString().split('T')[0],
                dias_antecedencia: diffDias,
                enviado: false,
              });
            
            alertasCriados.push({ tipo: 'obrigacao', titulo: obrigacao.titulo, dias: diffDias });
            console.log(`Alerta de obrigação criado: ${obrigacao.titulo} - ${diffDias} dias`);
          }
        }
      }
    }

    // Buscar alertas pendentes para enviar notificações
    const { data: alertasPendentes } = await supabase
      .from('contract_alerts')
      .select(`
        *,
        contratos (
          numero_contrato,
          titulo,
          data_fim
        )
      `)
      .eq('enviado', false)
      .lte('data_alerta', dataHoje);

    let notificacoesEnviadas = 0;
    let emailsEnviados = 0;

    for (const alerta of alertasPendentes || []) {
      try {
        // Tentar enviar notificação WhatsApp
        const { error: whatsappError } = await supabase.functions.invoke('enviar-notificacao-whatsapp', {
          body: {
            mensagem: `⚠️ *${alerta.titulo}*\n\n${alerta.mensagem}`,
            contratoId: alerta.contrato_id,
          },
        });

        if (!whatsappError) {
          notificacoesEnviadas++;
        }

        // Tentar enviar notificação por Email (se ainda não foi enviado)
        if (!alerta.email_enviado) {
          const dataVencimento = alerta.contratos?.data_fim 
            ? new Date(alerta.contratos.data_fim).toLocaleDateString('pt-BR')
            : alerta.data_alerta;

          const { error: emailError } = await supabase.functions.invoke('enviar-notificacao-email', {
            body: {
              alertaId: alerta.id,
              contratoId: alerta.contrato_id,
              tipo: alerta.tipo_alerta,
              titulo: alerta.titulo,
              mensagem: alerta.mensagem,
              diasAntecedencia: alerta.dias_antecedencia,
              numeroContrato: alerta.contratos?.numero_contrato || 'N/A',
              dataVencimento: dataVencimento,
            },
          });

          if (!emailError) {
            emailsEnviados++;
            console.log(`Email enviado para alerta ${alerta.id}`);
          } else {
            console.error(`Erro ao enviar email para alerta ${alerta.id}:`, emailError);
          }
        }

        // Marcar como enviado
        await supabase
          .from('contract_alerts')
          .update({
            enviado: true,
            data_envio: new Date().toISOString(),
          })
          .eq('id', alerta.id);

      } catch (error) {
        console.error(`Erro ao enviar notificação para alerta ${alerta.id}:`, error);
      }
    }

    console.log(`Verificação concluída. ${alertasCriados.length} alertas criados, ${notificacoesEnviadas} WhatsApp, ${emailsEnviados} emails enviados.`);

    return new Response(
      JSON.stringify({
        success: true,
        alertasCriados: alertasCriados.length,
        notificacoesWhatsApp: notificacoesEnviadas,
        notificacoesEmail: emailsEnviados,
        mensagem: 'Verificação de alertas concluída com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na verificação de alertas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
