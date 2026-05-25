import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface ParcelaAdicional {
  titulo: string;
  data_vencimento: string | null;
  valor: number | null;
  status: string | null;
}

interface NotificacaoRequest {
  tipo: "contrato" | "servico";
  contratoId?: string;
  servicoId?: string;
  emailFinanceiro: string;
  emailsAdicionais?: string;
  observacoes?: string;
  parcelasAdicionais?: ParcelaAdicional[];
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const isInternalTrigger = token === supabaseKey;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: isInternalTrigger ? `Bearer ${supabaseKey}` : authHeader } },
    });

    let userId: string | null = null;
    if (!isInternalTrigger) {
      const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claims?.claims) {
        return new Response(JSON.stringify({ success: false, error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userId = claims.claims.sub as string;
    }

    const body: NotificacaoRequest = await req.json();
    const { tipo, contratoId, servicoId, emailFinanceiro, emailsAdicionais, observacoes, parcelasAdicionais } = body;

    if (!emailFinanceiro || !emailFinanceiro.includes("@")) {
      return new Response(JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let organizationId: string | null = null;
    let templateName = "";
    let templateData: Record<string, any> = {};
    let idempotencyKey = "";

    if (tipo === "contrato" && contratoId) {
      const { data: contrato, error: contratoError } = await supabase
        .from("contratos").select("*").eq("id", contratoId).single();
      if (contratoError || !contrato) {
        return new Response(JSON.stringify({ success: false, error: "Contrato não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      organizationId = contrato.organization_id;
      idempotencyKey = `finance-contrato-${contratoId}-${organizationId}-${Date.now()}`;

      let fornecedor = null;
      if (contrato.fornecedor_id) {
        const { data } = await supabase.from("fornecedores").select("*")
          .eq("id", contrato.fornecedor_id).eq("organization_id", organizationId).single();
        fornecedor = data;
      }

      const { data: obrigacoesDb } = await supabase.from("contract_obligations").select("*")
        .eq("organization_id", organizationId).eq("contrato_id", contratoId)
        .not("valor", "is", null).order("data_vencimento", { ascending: true });

      const obrigacoes = [...(obrigacoesDb || []), ...(parcelasAdicionais || []).filter(p =>
        !obrigacoesDb?.some(o => o.titulo === p.titulo && o.data_vencimento === p.data_vencimento))];

      const parcelas = obrigacoes.map((o: any) => ({
        titulo: o.titulo,
        data_vencimento: formatDate(o.data_vencimento),
        valor: formatCurrency(o.valor),
        status: o.status || 'pendente',
      }));

      const fornecedorLinha = fornecedor
        ? `${fornecedor.nome}${fornecedor.cnpj ? ` (CNPJ: ${fornecedor.cnpj})` : fornecedor.cpf ? ` (CPF: ${fornecedor.cpf})` : ''}`
        : undefined;

      templateName = "finance-contract-report";
      templateData = {
        numeroContrato: contrato.numero_contrato,
        tituloContrato: contrato.titulo,
        valorTotalFormatado: formatCurrency(contrato.valor_total),
        vigencia: `${formatDate(contrato.data_inicio)} a ${formatDate(contrato.data_fim)}`,
        moeda: contrato.moeda || 'BRL',
        fornecedorLinha,
        parcelas,
        observacoes,
      };
    } else if (tipo === "servico" && servicoId) {
      const { data: servico, error: servicoError } = await supabase
        .from("servicos_periodicos").select("*").eq("id", servicoId).single();
      if (servicoError || !servico) {
        return new Response(JSON.stringify({ success: false, error: "Serviço não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      organizationId = servico.organization_id;
      idempotencyKey = `finance-servico-${servicoId}-${organizationId}-${Date.now()}`;

      let especificacao: any = null;
      if (servico.especificacao_id) {
        const { data } = await supabase.from("especificacoes_servico").select("nome, categoria")
          .eq("id", servico.especificacao_id).eq("organization_id", organizationId).single();
        especificacao = data;
      }

      templateName = "finance-service-renewal";
      templateData = {
        nomeServico: especificacao?.nome || "Serviço",
        categoria: especificacao?.categoria,
        valorFormatado: formatCurrency(servico.valor),
        frequencia: servico.frequencia || 'N/A',
        proximoVencimento: formatDate(servico.proximo_vencimento),
        observacoes,
      };
    }

    if (!organizationId || !templateName) {
      return new Response(JSON.stringify({ success: false, error: "Organização não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const recipients = [emailFinanceiro];
    if (emailsAdicionais) {
      recipients.push(...emailsAdicionais.split(",").map(e => e.trim()).filter(e => e.includes("@")));
    }
    const uniqueRecipients = Array.from(new Set(recipients.map(r => r.toLowerCase())));

    let enviados = 0;
    const erros: string[] = [];
    for (const to of uniqueRecipients) {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName,
          recipientEmail: to,
          idempotencyKey: `${idempotencyKey}-${to}`,
          templateData,
        },
      });
      if (error) erros.push(`${to}: ${error.message ?? String(error)}`);
      else enviados++;
    }

    if (userId) {
      await supabase.from("uso_sistema").insert({
        tipo: "email", recurso: "notificacao_financeiro", user_id: userId,
        contrato_id: tipo === "contrato" ? contratoId : null,
        servico_id: tipo === "servico" ? servicoId : null,
        metadata: { destinatarios: uniqueRecipients.length, organization_id: organizationId, provider: 'lovable_emails' },
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId, acao: 'FINANCE_NOTIFICATION_SENT',
      entidade: tipo === "contrato" ? 'contratos' : 'servicos_periodicos',
      entidade_id: tipo === "contrato" ? contratoId : servicoId,
      user_id: userId,
      metadata: { recipients: uniqueRecipients.length, auto: isInternalTrigger, provider: 'lovable_emails' },
      event_category: 'financial', risk_level: 'low',
    });

    return new Response(JSON.stringify({ success: true, enviados, erros: erros.length > 0 ? erros : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error in enviar-notificacao-financeiro:", error);
    return new Response(JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
