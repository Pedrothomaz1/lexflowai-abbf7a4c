import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  alertaId: string;
  contratoId: string;
  organizationId?: string; // For CRON calls - resolved from contract/alert
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

const getPlainTextVersion = (data: EmailRequest): string => {
  const urgencyText = data.diasAntecedencia <= 7 ? 'URGENTE - ' : '';
  return `${urgencyText}Alerta de ${data.tipo.toUpperCase()}

${data.titulo}

${data.mensagem}

---
Contrato: ${data.numeroContrato}
Data de Vencimento: ${data.dataVencimento}
Dias Restantes: ${data.diasAntecedencia} dias
---

LexFlow - Sistema de Gestão de Contratos
Este é um email automático. Por favor, não responda.`;
};

serve(async (req) => {
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

    // Create user client to get user's organization
    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const body: EmailRequest = await req.json();
    console.log("Enviando email para alerta:", body.alertaId);

    // Check if this is a test request (IDs starting with 'test-' or UUID zeros)
    const isTestRequest = body.alertaId?.startsWith('test-') || 
                          body.contratoId === '00000000-0000-0000-0000-000000000000';

    // =========================================================
    // MULTI-TENANT: Resolve organization from alert/contract OR user
    // =========================================================
    let organizationId: string | null = null;

    if (!isTestRequest) {
      // First, try to get organization from the alert
      if (body.alertaId) {
        const { data: alert } = await supabase
          .from('contract_alerts')
          .select('organization_id')
          .eq('id', body.alertaId)
          .single();
        
        if (alert?.organization_id) {
          organizationId = alert.organization_id;
        }
      }

      // If not found, try from the contract
      if (!organizationId && body.contratoId) {
        const { data: contract } = await supabase
          .from('contratos')
          .select('organization_id')
          .eq('id', body.contratoId)
          .single();
        
        if (contract?.organization_id) {
          organizationId = contract.organization_id;
        }
      }
    }

    // For test requests or if organization not found, get from user's membership
    if (!organizationId) {
      const { data: { user } } = await supabaseUser.auth.getUser();
      
      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        
        if (membership?.organization_id) {
          organizationId = membership.organization_id;
          console.log(`Usando organização do usuário: ${organizationId}`);
        }
      }
    }

    if (!organizationId) {
      console.error("Não foi possível determinar a organização para o alerta");
      return new Response(
        JSON.stringify({ success: false, error: "Organização não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processando email para organização: ${organizationId}`);

    // =========================================================
    // Buscar usuários com email habilitado - SCOPED BY ORGANIZATION
    // =========================================================
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
      .eq("organization_id", organizationId)
      .eq("email_enabled", true);

    if (prefError) {
      console.error("Erro ao buscar preferências:", prefError);
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao processar notificação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se não há preferências, buscar todos os usuários com roles apropriados - SCOPED BY ORGANIZATION
    let usersToNotify: Array<{ email: string; name: string }> = [];

    if (!preferences || preferences.length === 0) {
      console.log("Nenhuma preferência encontrada, buscando usuários padrão...");
      
      // Get organization members first
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (orgMembers && orgMembers.length > 0) {
        const memberUserIds = orgMembers.map(m => m.user_id);

        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["consultoria_juridica", "administrador"])
          .in("user_id", memberUserIds);

        console.log(`Usuários com roles apropriados: ${userRoles?.length || 0}`, rolesError);

        if (userRoles && userRoles.length > 0) {
          const userIds = userRoles.map(ur => ur.user_id);
          
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);

          if (profiles) {
            usersToNotify = profiles.map((p: any) => ({
              email: p.email,
              name: p.full_name || "Usuário",
            }));
            console.log(`Usuários encontrados para notificar: ${usersToNotify.length}`, usersToNotify);
          }
        }
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

    // Preparar conteúdo do email
    const subject = `${body.diasAntecedencia <= 7 ? '⚠️ URGENTE: ' : ''}${body.titulo}`;
    const html = getEmailTemplate(body, appUrl);
    const text = getPlainTextVersion(body);

    // Usar batch.send() para enviar todos os emails de uma vez
    console.log(`Enviando emails em batch para ${uniqueEmails.length} destinatários (org: ${organizationId})`);

    const emailPayloads = uniqueEmails.map(user => ({
      from: "LexFlow <pedro@porveri.com.br>",
      to: [user.email],
      subject,
      html,
      text,
      replyTo: "suporte@porveri.com.br",
      headers: {
        "X-Alert-Id": body.alertaId,
        "X-Contract-Id": body.contratoId,
        "X-Organization-Id": organizationId,
        "X-Idempotency-Key": `alert-${body.alertaId}-${organizationId}`,
      },
    }));

    let emailsEnviados = 0;
    const erros: string[] = [];

    try {
      const { data: batchResult, error: batchError } = await resend.batch.send(emailPayloads);

      if (batchError) {
        console.error("Erro no batch send:", batchError);
        
        if (batchError.name === 'rate_limit_exceeded') {
          console.log("Rate limit atingido, aguardando 1s para retry...");
          await new Promise(r => setTimeout(r, 1000));
          
          const { data: retryResult, error: retryError } = await resend.batch.send(emailPayloads);
          
          if (retryError) {
            erros.push(`Retry falhou: ${retryError.message}`);
          } else if (retryResult) {
            emailsEnviados = retryResult.data?.length || 0;
          }
        } else {
          erros.push(batchError.message);
        }
      } else if (batchResult) {
        emailsEnviados = batchResult.data?.length || uniqueEmails.length;
        console.log(`Batch send concluído: ${emailsEnviados} emails enviados para org ${organizationId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Erro ao enviar batch:", err);
      erros.push(errorMessage);
    }

    // Atualizar status do alerta - SCOPED BY ORGANIZATION
    if (emailsEnviados > 0) {
      await supabase
        .from("contract_alerts")
        .update({
          email_enviado: true,
          email_enviado_em: new Date().toISOString(),
        })
        .eq("id", body.alertaId)
        .eq("organization_id", organizationId);
    }

    // Log audit - SCOPED BY ORGANIZATION
    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      acao: 'EMAIL_NOTIFICATION_SENT',
      entidade: 'contract_alerts',
      entidade_id: body.alertaId,
      metadata: {
        emails_sent: emailsEnviados,
        recipients: uniqueEmails.length,
        tipo: body.tipo,
      },
      event_category: 'notification',
      risk_level: 'low',
    });

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
