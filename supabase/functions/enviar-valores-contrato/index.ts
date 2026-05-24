import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

interface ValoresContratoRequest {
  contratoId: string;
  tipo: 'renovacao' | 'vencimento' | 'alerta';
  destinatarios?: string[];
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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);
    const body: ValoresContratoRequest = await req.json();
    const { contratoId, tipo, destinatarios: customDestinatarios } = body;

    console.log(`Enviando email de ${tipo} para contrato ${contratoId}`);

    // Buscar dados do contrato
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        *,
        fornecedores (
          nome,
          email
        )
      `)
      .eq("id", contratoId)
      .single();

    if (contratoError || !contrato) {
      throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
    }

    // Determinar destinatários
    let destinatarios: string[] = customDestinatarios || [];

    if (destinatarios.length === 0) {
      // Buscar usuários com role consultoria_juridica ou administrador
      // Buscar usuários com role consultoria_juridica ou administrador NA MESMA organização
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner (
            email
          )
        `)
        .in("role", ["consultoria_juridica", "administrador"])
        .eq("organization_id", contrato.organization_id);

      if (userRoles) {
        destinatarios = userRoles
          .map((ur: any) => ur.profiles?.email)
          .filter((email: string | null): email is string => !!email);
      }
    }

    if (destinatarios.length === 0) {
      console.log("Nenhum destinatário encontrado");
      return new Response(
        JSON.stringify({ success: true, emailsEnviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar valores
    const valorFormatado = contrato.valor_total
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: contrato.moeda || "BRL" }).format(contrato.valor_total)
      : "Não informado";

    const dataFim = contrato.data_fim
      ? new Date(contrato.data_fim).toLocaleDateString("pt-BR")
      : "Não informado";

    // Configuração por tipo
    const configTipo = {
      renovacao: {
        emoji: "🔄",
        titulo: "Renovação de Contrato",
        corPrincipal: "#2563EB",
        mensagemAdicional: "Este contrato está em processo de renovação.",
      },
      vencimento: {
        emoji: "⚠️",
        titulo: "Contrato Próximo ao Vencimento",
        corPrincipal: "#DC2626",
        mensagemAdicional: "Ação necessária: Avalie a renovação ou encerramento.",
      },
      alerta: {
        emoji: "🔔",
        titulo: "Alerta de Contrato",
        corPrincipal: "#D97706",
        mensagemAdicional: "Este contrato requer sua atenção.",
      },
    };

    const config = configTipo[tipo];

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: ${config.corPrincipal}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${config.emoji} ${config.titulo}
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${config.mensagemAdicional}
      </p>
      
      <!-- Info Box -->
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e4e4e7;">Contrato:</td>
            <td style="padding: 12px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">${contrato.numero_contrato}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e4e4e7;">Título:</td>
            <td style="padding: 12px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">${contrato.titulo}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e4e4e7;">Fornecedor:</td>
            <td style="padding: 12px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">${contrato.fornecedores?.nome || "Não informado"}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e4e4e7;">Vencimento:</td>
            <td style="padding: 12px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #e4e4e7;">${dataFim}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #71717a; font-size: 14px;">Valor:</td>
            <td style="padding: 12px 0; color: ${config.corPrincipal}; font-size: 18px; font-weight: 700; text-align: right;">${valorFormatado}</td>
          </tr>
        </table>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/contratos/${contratoId}" 
           style="display: inline-block; background-color: ${config.corPrincipal}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Ver Contrato
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="color: #71717a; font-size: 14px; margin: 0 0 8px 0;">
        <strong>LexFlow</strong> - Sistema de Gestão de Contratos
      </p>
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        Este é um email automático. Por favor, não responda.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    let emailsEnviados = 0;
    const erros: string[] = [];

    for (const email of destinatarios) {
      try {
        const { error: sendError } = await resend.emails.send({
          from: "LexFlow <onboarding@resend.dev>",
          to: [email],
          subject: `${config.emoji} ${config.titulo} - ${contrato.numero_contrato}`,
          html,
        });

        if (sendError) {
          console.error(`Erro ao enviar para ${email}:`, sendError);
          erros.push(`${email}: ${sendError.message}`);
        } else {
          emailsEnviados++;
          console.log(`Email enviado com sucesso para ${email}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Erro ao enviar para ${email}:`, err);
        erros.push(`${email}: ${errorMessage}`);
      }
    }

    // Registrar uso do sistema
    await supabase.from("uso_sistema").insert({
      tipo: "email",
      recurso: "resend",
      quantidade: emailsEnviados,
      custo_unitario: 0.001,
      custo_total: emailsEnviados * 0.001,
      user_id: user.id,
      contrato_id: contratoId,
      metadata: { tipo_email: `valores_${tipo}`, destinatarios: destinatarios.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailsEnviados,
        totalDestinatarios: destinatarios.length,
        erros: erros.length > 0 ? erros : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na função enviar-valores-contrato:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
