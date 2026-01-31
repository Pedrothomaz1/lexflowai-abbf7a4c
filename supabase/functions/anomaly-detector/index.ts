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

// Anomaly detection rules
interface AnomalyRule {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  check: (supabase: any) => Promise<any[]>;
}

const RULES: AnomalyRule[] = [
  {
    id: 'AFTER_HOURS_FINANCIAL',
    name: 'Operações financeiras fora do horário',
    severity: 'HIGH',
    check: async (supabase) => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .in('event_category', ['financial'])
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .or('created_at.gte.22:00:00,created_at.lt.06:00:00');
      
      // Filter by hour in application logic
      return (data || []).filter((log: any) => {
        const hour = new Date(log.created_at).getHours();
        return hour >= 22 || hour < 6;
      });
    }
  },
  {
    id: 'BULK_DELETE',
    name: 'Exclusões em massa detectadas',
    severity: 'CRITICAL',
    check: async (supabase) => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('user_id, count')
        .eq('acao', 'DELETE')
        .gte('created_at', fiveMinAgo);
      
      // Group by user and check for 5+ deletes
      const userDeletes: Record<string, any[]> = {};
      (data || []).forEach((log: any) => {
        if (!userDeletes[log.user_id]) userDeletes[log.user_id] = [];
        userDeletes[log.user_id].push(log);
      });
      
      return Object.entries(userDeletes)
        .filter(([_, logs]) => logs.length >= 5)
        .map(([userId, logs]) => ({ user_id: userId, delete_count: logs.length, logs }));
    }
  },
  {
    id: 'LARGE_UNAPPROVED_PURCHASE',
    name: 'Compra grande sem aprovação',
    severity: 'HIGH',
    check: async (supabase) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entidade', 'contratos')
        .eq('acao', 'INSERT')
        .gte('created_at', oneHourAgo);
      
      return (data || []).filter((log: any) => {
        const valor = log.dados_novos?.valor_total;
        return valor && valor > 10000;
      });
    }
  },
  {
    id: 'PERMISSION_CHANGE',
    name: 'Alteração de permissões detectada',
    severity: 'CRITICAL',
    check: async (supabase) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entidade', 'user_roles')
        .in('acao', ['INSERT', 'UPDATE', 'DELETE'])
        .gte('created_at', oneHourAgo);
      
      return data || [];
    }
  },
  {
    id: 'MASS_EXPORT',
    name: 'Exportação em massa de dados',
    severity: 'MEDIUM',
    check: async (supabase) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('acao', 'export')
        .gte('created_at', oneHourAgo);
      
      return (data || []).filter((log: any) => {
        const recordCount = log.metadata?.record_count;
        return recordCount && recordCount > 1000;
      });
    }
  },
  {
    id: 'LOGIN_FAILURE_PATTERN',
    name: 'Padrão de falhas de login detectado',
    severity: 'HIGH',
    check: async (supabase) => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('login_attempts')
        .select('email, ip_address, count')
        .eq('success', false)
        .gte('created_at', fiveMinAgo);
      
      // Group by email
      const emailAttempts: Record<string, any[]> = {};
      (data || []).forEach((attempt: any) => {
        if (!emailAttempts[attempt.email]) emailAttempts[attempt.email] = [];
        emailAttempts[attempt.email].push(attempt);
      });
      
      return Object.entries(emailAttempts)
        .filter(([_, attempts]) => attempts.length >= 3)
        .map(([email, attempts]) => ({ email, attempt_count: attempts.length, attempts }));
    }
  },
  {
    id: 'UNUSUAL_ACCESS_TIME',
    name: 'Acesso em horário incomum',
    severity: 'MEDIUM',
    check: async (supabase) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', oneHourAgo);
      
      // Filter weekend or late night access
      return (data || []).filter((log: any) => {
        const date = new Date(log.created_at);
        const day = date.getDay();
        const hour = date.getHours();
        return day === 0 || day === 6 || hour >= 23 || hour < 5;
      });
    }
  }
];

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
    // Validate cron secret for scheduled calls
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow service role access as well
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      if (!authHeader?.includes(supabaseServiceKey)) {
        console.log('[anomaly-detector] Unauthorized access attempt');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[anomaly-detector] Starting anomaly detection scan...');
    const alertsCreated: any[] = [];

    for (const rule of RULES) {
      try {
        console.log(`[anomaly-detector] Checking rule: ${rule.id}`);
        const anomalies = await rule.check(supabase);
        
        if (anomalies.length > 0) {
          console.log(`[anomaly-detector] Found ${anomalies.length} anomalies for ${rule.id}`);
          
          for (const anomaly of anomalies) {
            // Check if similar alert already exists (within last hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: existingAlert } = await supabase
              .from('security_alerts')
              .select('id')
              .eq('rule_id', rule.id)
              .eq('user_id', anomaly.user_id || null)
              .gte('created_at', oneHourAgo)
              .eq('status', 'open')
              .limit(1);
            
            if (existingAlert && existingAlert.length > 0) {
              console.log(`[anomaly-detector] Similar alert already exists for ${rule.id}`);
              continue;
            }
            
            // Create security alert
            const { data: alert, error } = await supabase
              .from('security_alerts')
              .insert({
                rule_id: rule.id,
                rule_name: rule.name,
                severity: rule.severity,
                user_id: anomaly.user_id || null,
                event_id: anomaly.id || null,
                details: anomaly,
                status: 'open'
              })
              .select()
              .single();
            
            if (error) {
              console.error(`[anomaly-detector] Error creating alert:`, error);
            } else {
              alertsCreated.push(alert);
              console.log(`[anomaly-detector] Created alert: ${alert.id}`);
            }
          }
        }
      } catch (ruleError) {
        console.error(`[anomaly-detector] Error checking rule ${rule.id}:`, ruleError);
      }
    }

    console.log(`[anomaly-detector] Scan complete. Created ${alertsCreated.length} alerts.`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alertsCreated.length,
        alerts: alertsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[anomaly-detector] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
