import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (value === null) return "N/A";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;
    const body: NotificacaoRequest = await req.json();
    const { tipo, contratoId, servicoId, emailFinanceiro, emailsAdicionais, observacoes, parcelasAdicionais } = body;

    if (!emailFinanceiro || !emailFinanceiro.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MULTI-TENANT: Resolve organization from entity
    let organizationId: string | null = null;
    let emailHtml = "", emailText = "", emailSubject = "", idempotencyKey = "";

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

      emailSubject = `[LexFlow] Aprovação de Contrato - ${contrato.numero_contrato}`;
      emailHtml = `<html><body><h1>Contrato ${contrato.numero_contrato} aprovado</h1><p>${contrato.titulo}</p><p>Valor: ${formatCurrency(contrato.valor_total)}</p></body></html>`;
      emailText = `Contrato ${contrato.numero_contrato} aprovado - ${contrato.titulo} - Valor: ${formatCurrency(contrato.valor_total)}`;
    } else if (tipo === "servico" && servicoId) {
      const { data: servico, error: servicoError } = await supabase
        .from("servicos_periodicos").select("*").eq("id", servicoId).single();

      if (servicoError || !servico) {
        return new Response(JSON.stringify({ success: false, error: "Serviço não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      organizationId = servico.organization_id;
      idempotencyKey = `finance-servico-${servicoId}-${organizationId}-${Date.now()}`;

      let especificacao = null;
      if (servico.especificacao_id) {
        const { data } = await supabase.from("especificacoes_servico").select("nome, categoria")
          .eq("id", servico.especificacao_id).eq("organization_id", organizationId).single();
        especificacao = data;
      }

      emailSubject = `[LexFlow] Renovação de Serviço - ${especificacao?.nome || "Serviço"}`;
      emailHtml = `<html><body><h1>Serviço ${especificacao?.nome || "N/A"} renovado</h1><p>Valor: ${formatCurrency(servico.valor)}</p></body></html>`;
      emailText = `Serviço ${especificacao?.nome || "N/A"} renovado - Valor: ${formatCurrency(servico.valor)}`;
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ success: false, error: "Organização não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const recipients = [emailFinanceiro];
    if (emailsAdicionais) {
      recipients.push(...emailsAdicionais.split(",").map(e => e.trim()).filter(e => e.includes("@")));
    }

    const resend = new Resend(resendKey);
    const { data: emailResult, error: sendError } = await resend.emails.send({
      from: "LexFlow <pedro@porveri.com.br>",
      to: recipients,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      replyTo: "suporte@veridianaquirino.com.br",
      headers: { "X-Organization-Id": organizationId, "X-Idempotency-Key": idempotencyKey },
    });

    if (sendError) {
      return new Response(JSON.stringify({ success: false, error: "Erro ao enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log usage - SCOPED BY ORGANIZATION
    await supabase.from("uso_sistema").insert({
      tipo: "email", recurso: "notificacao_financeiro", user_id: userId,
      contrato_id: tipo === "contrato" ? contratoId : null,
      servico_id: tipo === "servico" ? servicoId : null,
      metadata: { destinatarios: recipients.length, email_id: emailResult?.id, organization_id: organizationId },
    });

    // Audit log - SCOPED BY ORGANIZATION
    await supabase.from("audit_logs").insert({
      organization_id: organizationId, acao: 'FINANCE_NOTIFICATION_SENT',
      entidade: tipo === "contrato" ? 'contratos' : 'servicos_periodicos',
      entidade_id: tipo === "contrato" ? contratoId : servicoId,
      user_id: userId, metadata: { recipients: recipients.length },
      event_category: 'financial', risk_level: 'low',
    });

    return new Response(JSON.stringify({ success: true, emailId: emailResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error in enviar-notificacao-financeiro:", error);
    return new Response(JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
