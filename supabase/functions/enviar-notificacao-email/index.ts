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
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

interface EmailRequest {
  alertaId: string;
  contratoId: string;
  tipo: 'vencimento' | 'renovacao' | 'obrigacao' | 'pagamento';
  titulo: string;
  mensagem: string;
  diasAntecedencia: number;
  numeroContrato: string;
  dataVencimento: string;
}

const getEmailTemplate = (data: EmailRequest, appUrl: string) => {
  const colorMap = {
    vencimento: { bg: '#DC2626', emoji: '⚠️', label: 'VENCIMENTO' },
    renovacao: { bg: '#2563EB', emoji: '🔄', label: 'RENOVAÇÃO' },
    obrigacao: { bg: '#D97706', emoji: '📋', label: 'OBRIGAÇÃO' },
    pagamento: { bg: '#059669', emoji: '💰', label: 'PAGAMENTO' },
  };

  const config = colorMap[data.tipo] || colorMap.vencimento;
  const urgencyText = data.diasAntecedencia <= 7 ? 'URGENTE - ' : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: ${config.bg}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ${config.emoji} ${urgencyText}Alerta de ${config.label}
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
        ${data.titulo}
      </h2>
      
      <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${data.mensagem}
      </p>
      
      <!-- Info Box -->
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Contrato:</td>
            <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${data.numeroContrato}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Data de Vencimento:</td>
            <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${data.dataVencimento}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Dias Restantes:</td>
            <td style="padding: 8px 0; color: ${config.bg}; font-size: 14px; font-weight: 700; text-align: right;">${data.diasAntecedencia} dias</td>
          </tr>
        </table>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${appUrl}/contratos/${data.contratoId}" 
           style="display: inline-block; background-color: ${config.bg}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
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
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração de email incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to send notifications
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const canSendNotifications = ['consultoria_juridica', 'administrador'].includes(userRole?.role || '');
    if (!canSendNotifications) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EmailRequest = await req.json();
    console.log("Enviando email para alerta:", body.alertaId);

    // Buscar usuários com email habilitado
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        email_enabled,
        frequency,
        alert_types,
        profiles!inner (
          email,
          full_name
        )
      `)
      .eq("email_enabled", true);

    if (prefError) {
      console.error("Erro ao buscar preferências:", prefError);
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao processar notificação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se não há preferências, buscar todos os usuários com roles apropriados
    let usersToNotify: Array<{ email: string; name: string }> = [];

    if (!preferences || preferences.length === 0) {
      console.log("Nenhuma preferência encontrada, buscando usuários padrão...");
      
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles!inner (
            email,
            full_name
          )
        `)
        .in("role", ["consultoria_juridica", "administrador"]);

      if (userRoles) {
        usersToNotify = userRoles.map((ur: any) => ({
          email: ur.profiles.email,
          name: ur.profiles.full_name || "Usuário",
        }));
      }
    } else {
      // Filtrar por tipo de alerta
      const filteredPrefs = preferences.filter((p: any) => 
        p.alert_types.includes(body.tipo)
      );

      usersToNotify = filteredPrefs.map((p: any) => ({
        email: p.profiles.email,
        name: p.profiles.full_name || "Usuário",
      }));
    }

    // Remover duplicatas
    const uniqueEmails = [...new Map(usersToNotify.map(u => [u.email, u])).values()];

    if (uniqueEmails.length === 0) {
      console.log("Nenhum usuário para notificar");
      return new Response(
        JSON.stringify({ success: true, emailsEnviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar URL do app
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app").replace("https://", "https://");

    let emailsEnviados = 0;
    const erros: string[] = [];

    for (const user of uniqueEmails) {
      try {
        const html = getEmailTemplate(body, appUrl);

        const { error: sendError } = await resend.emails.send({
          // TODO: Alterar para "LexFlow <alertas@veridianaquirino.com.br>" quando o domínio estiver verificado no Resend
          from: "LexFlow <onboarding@resend.dev>",
          to: [user.email],
          subject: `${body.diasAntecedencia <= 7 ? '⚠️ URGENTE: ' : ''}${body.titulo}`,
          html,
        });

        if (sendError) {
          console.error(`Erro ao enviar para ${user.email}:`, sendError);
          erros.push(`${user.email}: ${sendError.message}`);
        } else {
          emailsEnviados++;
          console.log(`Email enviado com sucesso para ${user.email}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Erro ao enviar para ${user.email}:`, err);
        erros.push(`${user.email}: ${errorMessage}`);
      }
    }

    // Atualizar status do alerta
    if (emailsEnviados > 0) {
      await supabase
        .from("contract_alerts")
        .update({
          email_enviado: true,
          email_enviado_em: new Date().toISOString(),
        })
        .eq("id", body.alertaId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsEnviados,
        totalDestinatarios: uniqueEmails.length,
        erros: erros.length > 0 ? erros : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na função enviar-notificacao-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Falha ao enviar notificação por email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
