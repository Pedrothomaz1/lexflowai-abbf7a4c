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

// Incident response actions by severity
interface ResponseAction {
  action: string;
  automated: boolean;
  sla_minutes: number;
}

const RESPONSE_MATRIX: Record<string, ResponseAction[]> = {
  'CRITICAL': [
    { action: 'block_user', automated: true, sla_minutes: 15 },
    { action: 'revoke_sessions', automated: true, sla_minutes: 15 },
    { action: 'notify_admin', automated: true, sla_minutes: 15 },
    { action: 'create_ticket', automated: true, sla_minutes: 15 }
  ],
  'HIGH': [
    { action: 'flag_for_review', automated: true, sla_minutes: 120 },
    { action: 'notify_admin', automated: true, sla_minutes: 120 }
  ],
  'MEDIUM': [
    { action: 'log_event', automated: true, sla_minutes: 1440 },
    { action: 'notify_admin', automated: false, sla_minutes: 1440 }
  ],
  'LOW': [
    { action: 'log_event', automated: true, sla_minutes: 10080 }
  ]
};

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
    // SECURITY: require Bearer token + admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller has admin role
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .in('role', ['administrador', 'system_admin'])
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: requer privilégio de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { alert_id, action } = await req.json();

    if (!alert_id) {
      return new Response(
        JSON.stringify({ error: 'alert_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // MULTI-TENANT: Fetch the alert with organization_id
    // The organization is resolved from the alert itself
    // =========================================================
    const { data: alert, error: fetchError } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (fetchError || !alert) {
      return new Response(
        JSON.stringify({ error: 'Alerta não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = alert.organization_id;
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Alerta sem organização associada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[security-alert-handler] Processing alert ${alert_id} with severity ${alert.severity} for org ${organizationId}`);

    const actions = RESPONSE_MATRIX[alert.severity] || RESPONSE_MATRIX['LOW'];
    const executedActions: string[] = [];
    const errors: string[] = [];

    // If specific action requested, execute only that
    if (action) {
      const result = await executeAction(supabase, alert, action, organizationId);
      if (result.success) {
        executedActions.push(action);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    } else {
      // Execute all automated actions for this severity
      for (const responseAction of actions.filter(a => a.automated)) {
        try {
          const result = await executeAction(supabase, alert, responseAction.action, organizationId);
          if (result.success) {
            executedActions.push(responseAction.action);
          } else {
            errors.push(`${responseAction.action}: ${result.error}`);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[security-alert-handler] Error executing ${responseAction.action}:`, err);
          errors.push(`${responseAction.action}: ${errorMessage}`);
        }
      }
    }

    // Update alert status - SCOPED BY ORGANIZATION
    const newStatus = action === 'resolve' ? 'resolved' : 
                      action === 'dismiss' ? 'false_positive' : 
                      'investigating';

    await supabase
      .from('security_alerts')
      .update({ 
        status: newStatus,
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
      })
      .eq('id', alert_id)
      .eq('organization_id', organizationId);

    // Log to audit - SCOPED BY ORGANIZATION
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      acao: 'SECURITY_RESPONSE',
      entidade: 'security_alerts',
      entidade_id: alert_id,
      metadata: {
        severity: alert.severity,
        actions_executed: executedActions,
        errors: errors.length > 0 ? errors : undefined
      },
      risk_level: alert.severity === 'CRITICAL' ? 'critical' : 
                  alert.severity === 'HIGH' ? 'high' : 'medium',
      event_category: 'security'
    });

    return new Response(
      JSON.stringify({
        success: true,
        alert_id,
        organization_id: organizationId,
        new_status: newStatus,
        actions_executed: executedActions,
        errors: errors.length > 0 ? errors : undefined,
        sla_minutes: actions[0]?.sla_minutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[security-alert-handler] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeAction(
  supabase: any, 
  alert: any, 
  action: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[security-alert-handler] Executing action: ${action} for alert ${alert.id} in org ${organizationId}`);
  
  switch (action) {
    case 'block_user':
      if (!alert.user_id) {
        return { success: false, error: 'No user_id in alert' };
      }
      // Verify user belongs to same organization
      const { data: userMembership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', alert.user_id)
        .eq('organization_id', organizationId)
        .single();
      
      if (!userMembership) {
        return { success: false, error: 'User not in organization' };
      }
      console.log(`[security-alert-handler] Would block user: ${alert.user_id} in org ${organizationId}`);
      return { success: true };

    case 'revoke_sessions':
      if (!alert.user_id) {
        return { success: false, error: 'No user_id in alert' };
      }
      console.log(`[security-alert-handler] Would revoke sessions for: ${alert.user_id} in org ${organizationId}`);
      return { success: true };

    case 'notify_admin':
      // Get admin users - SCOPED BY ORGANIZATION
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (orgMembers && orgMembers.length > 0) {
        const memberIds = orgMembers.map((m: any) => m.user_id);
        
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['administrador', 'system_admin'])
          .in('user_id', memberIds);
        
        if (admins && admins.length > 0) {
          console.log(`[security-alert-handler] Would notify ${admins.length} admins in org ${organizationId} about alert ${alert.id}`);
        }
      }
      return { success: true };

    case 'flag_for_review':
      await supabase
        .from('security_alerts')
        .update({ requires_review: true })
        .eq('id', alert.id)
        .eq('organization_id', organizationId);
      return { success: true };

    case 'create_ticket':
      console.log(`[security-alert-handler] Would create ticket for: ${alert.rule_name} in org ${organizationId}`);
      return { success: true };

    case 'log_event':
      return { success: true };

    case 'resolve':
      await supabase
        .from('security_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alert.id)
        .eq('organization_id', organizationId);
      return { success: true };

    case 'dismiss':
      await supabase
        .from('security_alerts')
        .update({ status: 'false_positive' })
        .eq('id', alert.id)
        .eq('organization_id', organizationId);
      return { success: true };

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}
