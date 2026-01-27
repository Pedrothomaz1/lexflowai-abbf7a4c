import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificacaoRequest {
  tipo: "contrato" | "servico";
  contratoId?: string;
  servicoId?: string;
  emailFinanceiro: string;
  emailsAdicionais?: string;
  observacoes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;

    // Validate request body
    const body: NotificacaoRequest = await req.json();
    const { tipo, contratoId, servicoId, emailFinanceiro, emailsAdicionais, observacoes } = body;

    if (!emailFinanceiro || !emailFinanceiro.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tipo === "contrato" && !contratoId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do contrato é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tipo === "servico" && !servicoId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do serviço é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailHtml = "";
    let emailSubject = "";

    if (tipo === "contrato" && contratoId) {
      // Fetch contrato data
      const { data: contrato, error: contratoError } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", contratoId)
        .single();

      if (contratoError || !contrato) {
        return new Response(
          JSON.stringify({ success: false, error: "Contrato não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch fornecedor data
      let fornecedor = null;
      if (contrato.fornecedor_id) {
        const { data: fornecedorData } = await supabase
          .from("fornecedores")
          .select("*")
          .eq("id", contrato.fornecedor_id)
          .single();
        fornecedor = fornecedorData;
      }

      // Fetch obrigacoes de pagamento
      const { data: obrigacoes } = await supabase
        .from("contract_obligations")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("tipo", "pagamento")
        .order("data_vencimento", { ascending: true });

      emailSubject = `[LexFlow] Aprovação de Contrato - ${contrato.numero_contrato}`;
      emailHtml = buildContratoEmail(contrato, fornecedor, obrigacoes || [], observacoes, supabaseUrl.replace(".supabase.co", ".lovable.app"));
    } else if (tipo === "servico" && servicoId) {
      // Fetch servico data
      const { data: servico, error: servicoError } = await supabase
        .from("servicos_periodicos")
        .select("*")
        .eq("id", servicoId)
        .single();

      if (servicoError || !servico) {
        return new Response(
          JSON.stringify({ success: false, error: "Serviço não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch especificacao
      let especificacao = null;
      if (servico.especificacao_id) {
        const { data: especificacaoData } = await supabase
          .from("especificacoes_servico")
          .select("nome, categoria")
          .eq("id", servico.especificacao_id)
          .single();
        especificacao = especificacaoData;
      }

      // Fetch unidade
      let unidade = null;
      if (servico.unidade_id) {
        const { data: unidadeData } = await supabase
          .from("unidades")
          .select("nome")
          .eq("id", servico.unidade_id)
          .single();
        unidade = unidadeData;
      }

      // Fetch fornecedor
      let fornecedor = null;
      if (servico.fornecedor_preferencial_id) {
        const { data: fornecedorData } = await supabase
          .from("fornecedores")
          .select("*")
          .eq("id", servico.fornecedor_preferencial_id)
          .single();
        fornecedor = fornecedorData;
      }

      emailSubject = `[LexFlow] Renovação de Serviço - ${especificacao?.nome || "Serviço"}`;
      emailHtml = buildServicoEmail(servico, especificacao, unidade, fornecedor, observacoes);
    }

    // Parse additional emails
    const recipients = [emailFinanceiro];
    if (emailsAdicionais) {
      const additionalEmails = emailsAdicionais
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));
      recipients.push(...additionalEmails);
    }

    // Send email via Resend
    const resend = new Resend(resendKey);

    // Using onboarding@resend.dev temporarily while domain porveri.com.br is pending verification
    const { error: sendError } = await resend.emails.send({
      from: "LexFlow <onboarding@resend.dev>",
      to: recipients,
      subject: emailSubject,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Error sending email:", sendError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage
    await supabase.from("uso_sistema").insert({
      tipo: "email",
      recurso: "notificacao_financeiro",
      user_id: userId,
      contrato_id: tipo === "contrato" ? contratoId : null,
      servico_id: tipo === "servico" ? servicoId : null,
      metadata: { destinatarios: recipients.length },
    });

    console.log(`Finance notification sent successfully to ${recipients.length} recipients`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in enviar-notificacao-financeiro:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

function buildContratoEmail(
  contrato: any,
  fornecedor: any,
  obrigacoes: any[],
  observacoes?: string,
  appUrl?: string
): string {
  const parcelasHtml = obrigacoes.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Parcela</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Vencimento</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Valor</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${obrigacoes.map((o, i) => `
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${i + 1}/${obrigacoes.length} - ${o.titulo}</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatDate(o.data_vencimento)}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(o.valor)}</td>
              <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">${o.status || "Pendente"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : "<p style='color: #6b7280;'>Nenhuma parcela cadastrada.</p>";

  const dadosBancariosHtml = fornecedor && (fornecedor.banco || fornecedor.pix)
    ? `
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">💳 DADOS BANCÁRIOS DO FORNECEDOR</h3>
        <table style="width: 100%;">
          ${fornecedor.banco ? `<tr><td style="padding: 5px 0; color: #6b7280;">Banco:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.banco}</td></tr>` : ""}
          ${fornecedor.agencia ? `<tr><td style="padding: 5px 0; color: #6b7280;">Agência:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.agencia}</td></tr>` : ""}
          ${fornecedor.conta ? `<tr><td style="padding: 5px 0; color: #6b7280;">Conta:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.conta}</td></tr>` : ""}
          ${fornecedor.pix ? `<tr><td style="padding: 5px 0; color: #6b7280;">PIX:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.pix}</td></tr>` : ""}
          ${fornecedor.titular_conta ? `<tr><td style="padding: 5px 0; color: #6b7280;">Titular:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.titular_conta}</td></tr>` : ""}
        </table>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LexFlow</h1>
          <p style="color: #c7d2fe; margin: 10px 0 0 0; font-size: 14px;">COMUNICADO AO SETOR FINANCEIRO</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Informamos que o contrato abaixo foi aprovado e requer providências de pagamento:
          </p>

          <!-- Contract Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">📄 DADOS DO CONTRATO</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 5px 0; color: #6b7280;">Número:</td><td style="padding: 5px 0; font-weight: 600;">${contrato.numero_contrato}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Título:</td><td style="padding: 5px 0; font-weight: 500;">${contrato.titulo}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Fornecedor:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor?.nome || "N/A"}</td></tr>
              ${fornecedor?.cnpj ? `<tr><td style="padding: 5px 0; color: #6b7280;">CNPJ:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.cnpj}</td></tr>` : ""}
              <tr><td style="padding: 5px 0; color: #6b7280;">Valor Total:</td><td style="padding: 5px 0; font-weight: 600; color: #059669;">${formatCurrency(contrato.valor_total)}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Vigência:</td><td style="padding: 5px 0; font-weight: 500;">${formatDate(contrato.data_inicio)} a ${formatDate(contrato.data_fim)}</td></tr>
            </table>
          </div>

          <!-- Payment Schedule -->
          <h3 style="color: #111827; font-size: 16px; margin: 30px 0 15px 0;">📅 CRONOGRAMA DE PAGAMENTOS</h3>
          ${parcelasHtml}

          <!-- Bank Data -->
          ${dadosBancariosHtml}

          <!-- Observations -->
          ${observacoes ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong style="color: #92400e;">📝 Observações:</strong>
              <p style="margin: 10px 0 0 0; color: #78350f;">${observacoes}</p>
            </div>
          ` : ""}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl || "#"}/contrato/${contrato.id}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Ver Contrato no Sistema
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            LexFlow - Sistema de Gestão de Contratos<br>
            Email automático. Não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildServicoEmail(
  servico: any,
  especificacao: any,
  unidade: any,
  fornecedor: any,
  observacoes?: string
): string {
  const dadosBancariosHtml = fornecedor && (fornecedor.banco || fornecedor.pix)
    ? `
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">💳 DADOS BANCÁRIOS DO FORNECEDOR</h3>
        <table style="width: 100%;">
          ${fornecedor.banco ? `<tr><td style="padding: 5px 0; color: #6b7280;">Banco:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.banco}</td></tr>` : ""}
          ${fornecedor.agencia ? `<tr><td style="padding: 5px 0; color: #6b7280;">Agência:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.agencia}</td></tr>` : ""}
          ${fornecedor.conta ? `<tr><td style="padding: 5px 0; color: #6b7280;">Conta:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.conta}</td></tr>` : ""}
          ${fornecedor.pix ? `<tr><td style="padding: 5px 0; color: #6b7280;">PIX:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.pix}</td></tr>` : ""}
          ${fornecedor.titular_conta ? `<tr><td style="padding: 5px 0; color: #6b7280;">Titular:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.titular_conta}</td></tr>` : ""}
        </table>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LexFlow</h1>
          <p style="color: #a7f3d0; margin: 10px 0 0 0; font-size: 14px;">RENOVAÇÃO DE SERVIÇO</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Informamos que o serviço abaixo foi renovado e requer providências de pagamento:
          </p>

          <!-- Service Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">🔧 DADOS DO SERVIÇO</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 5px 0; color: #6b7280;">Serviço:</td><td style="padding: 5px 0; font-weight: 600;">${especificacao?.nome || "N/A"}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Categoria:</td><td style="padding: 5px 0; font-weight: 500;">${especificacao?.categoria || "N/A"}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Unidade:</td><td style="padding: 5px 0; font-weight: 500;">${unidade?.nome || "N/A"}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Fornecedor:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor?.nome || "N/A"}</td></tr>
              ${fornecedor?.cnpj ? `<tr><td style="padding: 5px 0; color: #6b7280;">CNPJ:</td><td style="padding: 5px 0; font-weight: 500;">${fornecedor.cnpj}</td></tr>` : ""}
              <tr><td style="padding: 5px 0; color: #6b7280;">Valor Estimado:</td><td style="padding: 5px 0; font-weight: 600; color: #059669;">${formatCurrency(servico.valor_estimado)}</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Próximo Vencimento:</td><td style="padding: 5px 0; font-weight: 500;">${formatDate(servico.data_validade)}</td></tr>
            </table>
          </div>

          <!-- Bank Data -->
          ${dadosBancariosHtml}

          <!-- Observations -->
          ${observacoes ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong style="color: #92400e;">📝 Observações:</strong>
              <p style="margin: 10px 0 0 0; color: #78350f;">${observacoes}</p>
            </div>
          ` : ""}
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            LexFlow - Sistema de Gestão de Contratos<br>
            Email automático. Não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
