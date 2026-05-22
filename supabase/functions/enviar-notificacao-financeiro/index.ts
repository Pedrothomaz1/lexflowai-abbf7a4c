import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

    const token = authHeader.replace("Bearer ", "");
    const isInternalTrigger = token === supabaseKey;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: isInternalTrigger ? `Bearer ${supabaseKey}` : authHeader } },
    });

    let userId: string | null = null;
    if (!isInternalTrigger) {
      const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claims?.claims) {
        return new Response(
          JSON.stringify({ success: false, error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = claims.claims.sub as string;
    }

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

      const parcelasHtml = obrigacoes.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="background:#f4f4f5;">
                <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e4e4e7;font-size:13px;color:#71717a;">Parcela</th>
                <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e4e4e7;font-size:13px;color:#71717a;">Vencimento</th>
                <th style="text-align:right;padding:10px 12px;border-bottom:2px solid #e4e4e7;font-size:13px;color:#71717a;">Valor</th>
                <th style="text-align:center;padding:10px 12px;border-bottom:2px solid #e4e4e7;font-size:13px;color:#71717a;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${obrigacoes.map((o: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
                  <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;">${o.titulo}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;">${formatDate(o.data_vencimento)}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;text-align:right;font-weight:600;">${formatCurrency(o.valor)}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;text-align:center;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:${(o.status === 'concluida' || o.status === 'pago') ? '#dcfce7;color:#166534' : '#fef9c3;color:#854d0e'};">${o.status || 'pendente'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '<p style="color:#71717a;font-size:14px;">Nenhuma parcela cadastrada para este contrato.</p>';

      const fornecedorInfo = fornecedor 
        ? `<p style="margin:4px 0;color:#3f3f46;font-size:14px;"><strong>Fornecedor:</strong> ${fornecedor.nome}${fornecedor.cnpj ? ` (CNPJ: ${fornecedor.cnpj})` : fornecedor.cpf ? ` (CPF: ${fornecedor.cpf})` : ''}</p>`
        : '';

      const obsSection = observacoes 
        ? `<div style="margin-top:16px;padding:12px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;"><strong style="color:#1e40af;">Observações:</strong><p style="margin:4px 0 0;color:#1e3a5f;font-size:14px;">${observacoes}</p></div>`
        : '';

      emailSubject = `[LexFlow] Aprovação de Contrato - ${contrato.numero_contrato}`;
      emailHtml = `
        <html><body style="font-family:'Segoe UI',Arial,sans-serif;color:#18181b;max-width:640px;margin:0 auto;padding:24px;">
          <div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:20px;">
            <h1 style="margin:0;font-size:22px;color:#18181b;">Contrato ${contrato.numero_contrato} aprovado</h1>
            <p style="margin:6px 0 0;font-size:15px;color:#52525b;">${contrato.titulo}</p>
          </div>
          
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
            <table style="width:100%;"><tr>
              <td><span style="font-size:12px;color:#71717a;">Valor Total</span><br/><strong style="font-size:20px;color:#18181b;">${formatCurrency(contrato.valor_total)}</strong></td>
              <td><span style="font-size:12px;color:#71717a;">Vigência</span><br/><strong style="font-size:14px;color:#18181b;">${formatDate(contrato.data_inicio)} a ${formatDate(contrato.data_fim)}</strong></td>
              <td><span style="font-size:12px;color:#71717a;">Moeda</span><br/><strong style="font-size:14px;color:#18181b;">${contrato.moeda || 'BRL'}</strong></td>
            </tr></table>
          </div>

          ${fornecedorInfo}

          <h2 style="font-size:16px;color:#18181b;margin:24px 0 8px;border-bottom:1px solid #e4e4e7;padding-bottom:8px;">📋 Parcelas e Vencimentos</h2>
          ${parcelasHtml}

          ${obsSection}

          <p style="margin-top:28px;font-size:13px;color:#a1a1aa;border-top:1px solid #e4e4e7;padding-top:12px;">
            Este email foi gerado automaticamente pelo LexFlow. Em caso de dúvidas, entre em contato com o gestor do contrato.
          </p>
        </body></html>`;
      emailText = `Contrato ${contrato.numero_contrato} aprovado\n${contrato.titulo}\nValor Total: ${formatCurrency(contrato.valor_total)}\nVigência: ${formatDate(contrato.data_inicio)} a ${formatDate(contrato.data_fim)}\n${fornecedor ? `Fornecedor: ${fornecedor.nome}\n` : ''}${obrigacoes.length > 0 ? `\nParcelas:\n${obrigacoes.map((o: any) => `- ${o.titulo}: ${formatCurrency(o.valor)} | Vencimento: ${formatDate(o.data_vencimento)} | Status: ${o.status || 'pendente'}`).join('\n')}` : '\nNenhuma parcela cadastrada.'}${observacoes ? `\n\nObservações: ${observacoes}` : ''}`;
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

      const obsSection = observacoes 
        ? `<div style="margin-top:16px;padding:12px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;"><strong style="color:#1e40af;">Observações:</strong><p style="margin:4px 0 0;color:#1e3a5f;font-size:14px;">${observacoes}</p></div>`
        : '';

      emailSubject = `[LexFlow] Renovação de Serviço - ${especificacao?.nome || "Serviço"}`;
      emailHtml = `
        <html><body style="font-family:'Segoe UI',Arial,sans-serif;color:#18181b;max-width:640px;margin:0 auto;padding:24px;">
          <div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:20px;">
            <h1 style="margin:0;font-size:22px;color:#18181b;">Serviço Renovado</h1>
            <p style="margin:6px 0 0;font-size:15px;color:#52525b;">${especificacao?.nome || "N/A"}${especificacao?.categoria ? ` — ${especificacao.categoria}` : ''}</p>
          </div>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
            <table style="width:100%;"><tr>
              <td><span style="font-size:12px;color:#71717a;">Valor</span><br/><strong style="font-size:20px;color:#18181b;">${formatCurrency(servico.valor)}</strong></td>
              <td><span style="font-size:12px;color:#71717a;">Frequência</span><br/><strong style="font-size:14px;color:#18181b;">${servico.frequencia || 'N/A'}</strong></td>
              <td><span style="font-size:12px;color:#71717a;">Próx. Vencimento</span><br/><strong style="font-size:14px;color:#18181b;">${formatDate(servico.proximo_vencimento)}</strong></td>
            </tr></table>
          </div>
          ${obsSection}
          <p style="margin-top:28px;font-size:13px;color:#a1a1aa;border-top:1px solid #e4e4e7;padding-top:12px;">
            Este email foi gerado automaticamente pelo LexFlow.
          </p>
        </body></html>`;
      emailText = `Serviço Renovado: ${especificacao?.nome || "N/A"}\nValor: ${formatCurrency(servico.valor)}\nFrequência: ${servico.frequencia || 'N/A'}\nPróximo Vencimento: ${formatDate(servico.proximo_vencimento)}${observacoes ? `\n\nObservações: ${observacoes}` : ''}`;
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
      from: "LexFlow <onboarding@resend.dev>",
      to: recipients,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      replyTo: "suporte@lexflowai.com.br",
      headers: { "X-Organization-Id": organizationId, "X-Idempotency-Key": idempotencyKey },
    });

    if (sendError) {
      console.error("Resend error:", JSON.stringify(sendError));
      return new Response(JSON.stringify({ success: false, error: "Erro ao enviar email", details: sendError?.message }),
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
