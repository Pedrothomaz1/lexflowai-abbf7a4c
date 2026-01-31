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
    // SECURITY: CRON_SECRET is mandatory for scheduled/internal calls
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== cronSecret) {
      console.error('Unauthorized access attempt to verificar-alertas');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando verificação de alertas automáticos (multi-tenant)...');

    // Use UTC for consistent date comparisons across timezones
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
    const dataHoje = hoje.toISOString().split('T')[0];

    // =========================================================
    // MULTI-TENANT: Fetch all active organizations
    // =========================================================
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, nome')
      .eq('is_active', true);

    if (orgError) {
      console.error('Erro ao buscar organizações:', orgError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao buscar organizações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!organizations || organizations.length === 0) {
      console.log('Nenhuma organização ativa encontrada');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma organização ativa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${organizations.length} organizações`);

    const resultadoGeral = {
      alertasCriados: 0,
      servicosAlertados: 0,
      notificacoesWhatsApp: 0,
      notificacoesEmail: 0,
      organizacoesProcessadas: 0,
    };

    // =========================================================
    // PROCESS EACH ORGANIZATION SEPARATELY
    // =========================================================
    for (const org of organizations) {
      console.log(`Processando organização: ${org.nome} (${org.id})`);
      
      const alertasCriados: any[] = [];
      const servicosAlertados: any[] = [];

      // Buscar contratos que estão vencendo - SCOPED BY ORGANIZATION
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos')
        .select('*')
        .eq('organization_id', org.id)
        .eq('status', 'vigente')
        .not('data_fim', 'is', null);

      if (contratosError) {
        console.error(`Erro ao buscar contratos para org ${org.id}:`, contratosError);
        continue;
      }

      for (const contrato of contratos || []) {
        const dataFim = new Date(contrato.data_fim);
        dataFim.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
        const diffDias = Math.round((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        // Criar alertas em intervalos específicos: 30, 15, 7 e 1 dia antes
        const diasParaAlertar = [30, 15, 7, 1];

        for (const dias of diasParaAlertar) {
          // Check if within the target day (handles edge cases at midnight)
          if (diffDias === dias) {
            // Verificar se já existe alerta para esta data - SCOPED BY ORGANIZATION
            const { data: alertaExistente } = await supabase
              .from('contract_alerts')
              .select('id')
              .eq('organization_id', org.id)
              .eq('contrato_id', contrato.id)
              .eq('tipo_alerta', 'vencimento')
              .eq('dias_antecedencia', dias)
              .maybeSingle();

            if (!alertaExistente) {
              const { data: novoAlerta, error: alertaError } = await supabase
                .from('contract_alerts')
                .insert({
                  organization_id: org.id,
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
                console.log(`[${org.nome}] Alerta criado: ${novoAlerta.titulo} para contrato ${contrato.numero_contrato}`);
              }
            }
          }
        }

        // Alertas de renovação (60 dias antes)
        if (diffDias === 60) {
          const { data: alertaExistente } = await supabase
            .from('contract_alerts')
            .select('id')
            .eq('organization_id', org.id)
            .eq('contrato_id', contrato.id)
            .eq('tipo_alerta', 'renovacao')
            .maybeSingle();

          if (!alertaExistente) {
            await supabase
              .from('contract_alerts')
              .insert({
                organization_id: org.id,
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

      // Buscar obrigações vencendo - SCOPED BY ORGANIZATION
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
        .eq('organization_id', org.id)
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
              .eq('organization_id', org.id)
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
                  organization_id: org.id,
                  contrato_id: obrigacao.contrato_id,
                  tipo_alerta: 'obrigacao',
                  titulo: `${tipoLabel} vencendo em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`,
                  mensagem: `${obrigacao.titulo} (Contrato: ${contratoNumero}) | Responsável: ${responsavelNome}${valorFormatado} | Vence em ${dataVencimento.toLocaleDateString('pt-BR')}`,
                  data_alerta: dataVencimento.toISOString().split('T')[0],
                  dias_antecedencia: diffDias,
                  enviado: false,
                });
              
              alertasCriados.push({ tipo: 'obrigacao', titulo: obrigacao.titulo, dias: diffDias });
              console.log(`[${org.nome}] Alerta de obrigação criado: ${obrigacao.titulo} - ${diffDias} dias`);
            }
          }
        }
      }

      // =========================================================
      // VERIFICAR SERVIÇOS PERIÓDICOS - SCOPED BY ORGANIZATION
      // =========================================================
      const { data: servicos, error: servicosError } = await supabase
        .from('servicos_periodicos')
        .select(`
          *,
          unidades(nome),
          especificacoes_servico(nome, categoria)
        `)
        .eq('organization_id', org.id)
        .in('status', ['dentro_prazo', 'alerta'])
        .lte('data_alerta', dataHoje);

      if (servicosError) {
        console.error(`[${org.nome}] Erro ao buscar serviços:`, servicosError);
      } else if (servicos && servicos.length > 0) {
        console.log(`[${org.nome}] Encontrados ${servicos.length} serviços para processar`);

        for (const servico of servicos) {
          const dataValidade = new Date(servico.data_validade);
          const diffDias = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          // Determinar novo status
          let novoStatus = servico.status;
          if (diffDias < 0) {
            novoStatus = 'vencido';
          } else if (diffDias <= servico.dias_antecedencia_alerta) {
            novoStatus = 'alerta';
          }

          // Se mudou de status para alerta, processar
          if (servico.status === 'dentro_prazo' && novoStatus === 'alerta') {
            console.log(`[${org.nome}] Serviço entrando em alerta: ${servico.especificacoes_servico?.nome} - ${servico.unidades?.nome}`);

            // Atualizar status do serviço
            await supabase
              .from('servicos_periodicos')
              .update({ status: 'alerta' })
              .eq('id', servico.id)
              .eq('organization_id', org.id);

            // Criar alerta no sistema
            const categoriaLabels: Record<string, string> = {
              seguranca: '🔥 Segurança',
              manutencao: '🔧 Manutenção',
              higiene: '💧 Higiene',
              infraestrutura: '🏗️ Infraestrutura',
              veiculos: '🚗 Veículos',
              outros: '📋 Outros'
            };
            const categoriaLabel = categoriaLabels[servico.especificacoes_servico?.categoria || 'outros'];

            const { error: alertaError } = await supabase
              .from('contract_alerts')
              .insert({
                organization_id: org.id,
                contrato_id: null,
                tipo_alerta: 'servico',
                titulo: `${categoriaLabel} - Serviço vencendo`,
                mensagem: `${servico.especificacoes_servico?.nome} na ${servico.unidades?.nome}${servico.itens_detalhados ? ` (${servico.itens_detalhados})` : ''} vence em ${diffDias > 0 ? diffDias + ' dias' : 'HOJE'} (${dataValidade.toLocaleDateString('pt-BR')})`,
                data_alerta: servico.data_validade,
                dias_antecedencia: diffDias,
                enviado: false,
              });

            if (!alertaError) {
              servicosAlertados.push({
                id: servico.id,
                nome: servico.especificacoes_servico?.nome,
                unidade: servico.unidades?.nome,
                dias: diffDias
              });
            }

            // Verificar se deve enviar para sistema de compras - SCOPED BY ORGANIZATION
            const { data: configCompras } = await supabase
              .from('integracao_config')
              .select('is_active')
              .eq('organization_id', org.id)
              .eq('tipo', 'sistema_compras')
              .single();

            if (configCompras?.is_active) {
              // Verificar se já existe solicitação - SCOPED BY ORGANIZATION
              const { data: solicitacaoExistente } = await supabase
                .from('solicitacoes_compras')
                .select('id')
                .eq('organization_id', org.id)
                .eq('servico_id', servico.id)
                .in('status_envio', ['pendente', 'enviado'])
                .maybeSingle();

              if (!solicitacaoExistente) {
                console.log(`[${org.nome}] Enviando solicitação de compras para serviço ${servico.id}`);
                
                try {
                  await supabase.functions.invoke('enviar-solicitacao-compras', {
                    body: { servicoId: servico.id, organizationId: org.id }
                  });
                } catch (invokeError) {
                  console.error(`[${org.nome}] Erro ao invocar enviar-solicitacao-compras:`, invokeError);
                }
              }
            }
          }

          // Se venceu, atualizar status
          if (novoStatus === 'vencido' && servico.status !== 'vencido') {
            await supabase
              .from('servicos_periodicos')
              .update({ status: 'vencido' })
              .eq('id', servico.id)
              .eq('organization_id', org.id);
            console.log(`[${org.nome}] Serviço marcado como vencido: ${servico.especificacoes_servico?.nome}`);
          }
        }
      }

      // =========================================================
      // ENVIAR NOTIFICAÇÕES - SCOPED BY ORGANIZATION
      // =========================================================
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
        .eq('organization_id', org.id)
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
              organizationId: org.id,
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
                organizationId: org.id,
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
            }
          }

          // Marcar como enviado
          await supabase
            .from('contract_alerts')
            .update({
              enviado: true,
              data_envio: new Date().toISOString(),
            })
            .eq('id', alerta.id)
            .eq('organization_id', org.id);

        } catch (error) {
          console.error(`[${org.nome}] Erro ao enviar notificação para alerta ${alerta.id}:`, error);
        }
      }

      // Acumular resultados
      resultadoGeral.alertasCriados += alertasCriados.length;
      resultadoGeral.servicosAlertados += servicosAlertados.length;
      resultadoGeral.notificacoesWhatsApp += notificacoesEnviadas;
      resultadoGeral.notificacoesEmail += emailsEnviados;
      resultadoGeral.organizacoesProcessadas++;

      console.log(`[${org.nome}] Concluído: ${alertasCriados.length} alertas, ${servicosAlertados.length} serviços, ${notificacoesEnviadas} WhatsApp, ${emailsEnviados} emails`);
    }

    console.log(`Verificação concluída para ${resultadoGeral.organizacoesProcessadas} organizações. Total: ${resultadoGeral.alertasCriados} alertas, ${resultadoGeral.servicosAlertados} serviços.`);

    return new Response(
      JSON.stringify({
        success: true,
        ...resultadoGeral,
        mensagem: 'Verificação de alertas multi-tenant concluída com sucesso',
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
        error: 'Falha ao processar verificação de alertas',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
