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
  check: (supabase: any, organizationId: string) => Promise<any[]>;
}

const RULES: AnomalyRule[] = [
  {
    id: 'AFTER_HOURS_FINANCIAL',
    name: 'Operações financeiras fora do horário',
    severity: 'HIGH',
    check: async (supabase, organizationId) => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .in('event_category', ['financial'])
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
      
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
    check: async (supabase, organizationId) => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('user_id, count')
        .eq('organization_id', organizationId)
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
    check: async (supabase, organizationId) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
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
    check: async (supabase, organizationId) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
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
    check: async (supabase, organizationId) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
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
    check: async (supabase, organizationId) => {
      // Login attempts are not org-scoped, but we can filter by org members
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (!orgMembers || orgMembers.length === 0) return [];
      
      const memberIds = orgMembers.map((m: any) => m.user_id);
      
      // Get profiles with emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .in('id', memberIds);
      
      if (!profiles || profiles.length === 0) return [];
      
      const emails = profiles.map((p: any) => p.email).filter(Boolean);
      
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('login_attempts')
        .select('email, ip_address, count')
        .eq('success', false)
        .in('email', emails)
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
    check: async (supabase, organizationId) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
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

    console.log('[anomaly-detector] Starting anomaly detection scan (multi-tenant)...');

    // =========================================================
    // MULTI-TENANT: Fetch all active organizations
    // =========================================================
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, nome')
      .eq('is_active', true);

    if (orgError) {
      console.error('[anomaly-detector] Error fetching organizations:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organizations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!organizations || organizations.length === 0) {
      console.log('[anomaly-detector] No active organizations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active organizations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[anomaly-detector] Processing ${organizations.length} organizations`);

    const allAlertsCreated: any[] = [];

    // =========================================================
    // PROCESS EACH ORGANIZATION SEPARATELY
    // =========================================================
    for (const org of organizations) {
      console.log(`[anomaly-detector] Processing organization: ${org.nome} (${org.id})`);
      const orgAlerts: any[] = [];

      for (const rule of RULES) {
        try {
          console.log(`[anomaly-detector] [${org.nome}] Checking rule: ${rule.id}`);
          const anomalies = await rule.check(supabase, org.id);
          
          if (anomalies.length > 0) {
            console.log(`[anomaly-detector] [${org.nome}] Found ${anomalies.length} anomalies for ${rule.id}`);
            
            for (const anomaly of anomalies) {
              // Check if similar alert already exists - SCOPED BY ORGANIZATION
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
              const { data: existingAlert } = await supabase
                .from('security_alerts')
                .select('id')
                .eq('organization_id', org.id)
                .eq('rule_id', rule.id)
                .eq('user_id', anomaly.user_id || null)
                .gte('created_at', oneHourAgo)
                .eq('status', 'open')
                .limit(1);
              
              if (existingAlert && existingAlert.length > 0) {
                console.log(`[anomaly-detector] [${org.nome}] Similar alert already exists for ${rule.id}`);
                continue;
              }
              
              // Create security alert - SCOPED BY ORGANIZATION
              const { data: alert, error } = await supabase
                .from('security_alerts')
                .insert({
                  organization_id: org.id,
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
                console.error(`[anomaly-detector] [${org.nome}] Error creating alert:`, error);
              } else {
                orgAlerts.push(alert);
                allAlertsCreated.push(alert);
                console.log(`[anomaly-detector] [${org.nome}] Created alert: ${alert.id}`);
              }
            }
          }
        } catch (ruleError) {
          console.error(`[anomaly-detector] [${org.nome}] Error checking rule ${rule.id}:`, ruleError);
        }
      }

      if (orgAlerts.length > 0) {
        console.log(`[anomaly-detector] [${org.nome}] Created ${orgAlerts.length} alerts`);
      }
    }

    console.log(`[anomaly-detector] Scan complete. Created ${allAlertsCreated.length} total alerts across ${organizations.length} organizations.`);

    return new Response(
      JSON.stringify({
        success: true,
        organizations_processed: organizations.length,
        alerts_created: allAlertsCreated.length,
        alerts: allAlertsCreated
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
