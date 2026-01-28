import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { alert_id, action } = await req.json();

    if (!alert_id) {
      return new Response(
        JSON.stringify({ error: 'alert_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the alert
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

    console.log(`[security-alert-handler] Processing alert ${alert_id} with severity ${alert.severity}`);

    const actions = RESPONSE_MATRIX[alert.severity] || RESPONSE_MATRIX['LOW'];
    const executedActions: string[] = [];
    const errors: string[] = [];

    // If specific action requested, execute only that
    if (action) {
      const result = await executeAction(supabase, alert, action);
      if (result.success) {
        executedActions.push(action);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    } else {
      // Execute all automated actions for this severity
      for (const responseAction of actions.filter(a => a.automated)) {
        try {
          const result = await executeAction(supabase, alert, responseAction.action);
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

    // Update alert status
    const newStatus = action === 'resolve' ? 'resolved' : 
                      action === 'dismiss' ? 'false_positive' : 
                      'investigating';

    await supabase
      .from('security_alerts')
      .update({ 
        status: newStatus,
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
      })
      .eq('id', alert_id);

    // Log to audit
    await supabase.from('audit_logs').insert({
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
  action: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[security-alert-handler] Executing action: ${action} for alert ${alert.id}`);
  
  switch (action) {
    case 'block_user':
      if (!alert.user_id) {
        return { success: false, error: 'No user_id in alert' };
      }
      // In a real implementation, this would disable the user account
      console.log(`[security-alert-handler] Would block user: ${alert.user_id}`);
      return { success: true };

    case 'revoke_sessions':
      if (!alert.user_id) {
        return { success: false, error: 'No user_id in alert' };
      }
      // In a real implementation, this would revoke all user sessions
      console.log(`[security-alert-handler] Would revoke sessions for: ${alert.user_id}`);
      return { success: true };

    case 'notify_admin':
      // Get admin users
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['administrador', 'system_admin']);
      
      if (admins && admins.length > 0) {
        console.log(`[security-alert-handler] Would notify ${admins.length} admins about alert ${alert.id}`);
        // In production, send email/push notification
      }
      return { success: true };

    case 'flag_for_review':
      await supabase
        .from('security_alerts')
        .update({ requires_review: true })
        .eq('id', alert.id);
      return { success: true };

    case 'create_ticket':
      // In production, integrate with ticketing system
      console.log(`[security-alert-handler] Would create ticket for: ${alert.rule_name}`);
      return { success: true };

    case 'log_event':
      // Already logged via audit_logs
      return { success: true };

    case 'resolve':
      await supabase
        .from('security_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alert.id);
      return { success: true };

    case 'dismiss':
      await supabase
        .from('security_alerts')
        .update({ status: 'false_positive' })
        .eq('id', alert.id);
      return { success: true };

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}
