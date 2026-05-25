import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  Deno.env.get('ALLOWED_ORIGIN') || '',
].filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  if (!isAllowedOrigin && origin) return null;
  const allowedOrigin = isAllowedOrigin ? origin : (ALLOWED_ORIGINS[0] || 'http://localhost:8080');
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
  organizationId?: string;
  tipo: 'vencimento' | 'renovacao' | 'obrigacao' | 'pagamento';
  titulo: string;
  mensagem: string;
  diasAntecedencia: number;
  numeroContrato: string;
  dataVencimento: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const body: EmailRequest = await req.json();
    console.log("Enviando email para alerta:", body.alertaId);

    const isTestRequest = body.alertaId?.startsWith('test-') ||
                          body.contratoId === '00000000-0000-0000-0000-000000000000';

    // MULTI-TENANT: Resolve organization
    let organizationId: string | null = null;
    if (!isTestRequest) {
      if (body.alertaId) {
        const { data: alert } = await supabase.from('contract_alerts')
          .select('organization_id').eq('id', body.alertaId).single();
        if (alert?.organization_id) organizationId = alert.organization_id;
      }
      if (!organizationId && body.contratoId) {
        const { data: contract } = await supabase.from('contratos')
          .select('organization_id').eq('id', body.contratoId).single();
        if (contract?.organization_id) organizationId = contract.organization_id;
      }
    }
    if (!organizationId) {
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) {
        const { data: membership } = await supabase.from('organization_members')
          .select('organization_id').eq('user_id', user.id).eq('is_active', true).limit(1).single();
        if (membership?.organization_id) organizationId = membership.organization_id;
      }
    }
    if (!organizationId) {
      return new Response(JSON.stringify({ success: false, error: "Organização não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get recipients
    const { data: preferences } = await supabase.from("notification_preferences")
      .select(`user_id, email_enabled, frequency, alert_types, profiles!inner (email, full_name)`)
      .eq("organization_id", organizationId).eq("email_enabled", true);

    let usersToNotify: Array<{ email: string; name: string }> = [];
    if (!preferences || preferences.length === 0) {
      const { data: orgMembers } = await supabase.from('organization_members')
        .select('user_id').eq('organization_id', organizationId).eq('is_active', true);
      if (orgMembers && orgMembers.length > 0) {
        const memberUserIds = orgMembers.map(m => m.user_id);
        const { data: userRoles } = await supabase.from("user_roles")
          .select("user_id, role").in("role", ["consultoria_juridica", "administrador"])
          .in("user_id", memberUserIds);
        if (userRoles && userRoles.length > 0) {
          const userIds = userRoles.map(ur => ur.user_id);
          const { data: profiles } = await supabase.from("profiles")
            .select("id, email, full_name").in("id", userIds);
          if (profiles) {
            usersToNotify = profiles.map((p: any) => ({
              email: p.email, name: p.full_name || "Usuário",
            }));
          }
        }
      }
    } else {
      const filteredPrefs = preferences.filter((p: any) => p.alert_types.includes(body.tipo));
      usersToNotify = filteredPrefs.map((p: any) => ({
        email: p.profiles.email, name: p.profiles.full_name || "Usuário",
      }));
    }

    const uniqueEmails = [...new Map(usersToNotify.map(u => [u.email, u])).values()];
    if (uniqueEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, emailsEnviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const appUrl = "https://lexflowai.com.br";
    const contractUrl = `${appUrl}/contratos/${body.contratoId}`;

    // Enqueue one transactional email per recipient via Lovable Emails
    let emailsEnviados = 0;
    const erros: string[] = [];

    for (const user of uniqueEmails) {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contract-expiry-alert',
          recipientEmail: user.email,
          idempotencyKey: `alert-${body.alertaId}-${user.email}`,
          templateData: {
            recipientName: user.name,
            contractTitle: body.titulo,
            counterpartyName: body.numeroContrato,
            expiryDate: body.dataVencimento,
            daysRemaining: body.diasAntecedencia,
            contractUrl,
          },
        },
      });
      if (error) {
        erros.push(`${user.email}: ${error.message ?? String(error)}`);
      } else {
        emailsEnviados++;
      }
    }

    if (emailsEnviados > 0) {
      await supabase.from("contract_alerts").update({
        email_enviado: true,
        email_enviado_em: new Date().toISOString(),
      }).eq("id", body.alertaId).eq("organization_id", organizationId);
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      acao: 'EMAIL_NOTIFICATION_SENT',
      entidade: 'contract_alerts',
      entidade_id: body.alertaId,
      metadata: {
        emails_sent: emailsEnviados,
        recipients: uniqueEmails.length,
        tipo: body.tipo,
        provider: 'lovable_emails',
      },
      event_category: 'notification',
      risk_level: 'low',
    });

    return new Response(JSON.stringify({
      success: true,
      emailsEnviados,
      totalDestinatarios: uniqueEmails.length,
      erros: erros.length > 0 ? erros : undefined,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Erro na função enviar-notificacao-email:", error);
    return new Response(JSON.stringify({ success: false, error: "Falha ao enviar notificação por email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
