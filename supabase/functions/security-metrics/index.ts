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

interface MetricResult {
  metric_type: string;
  value: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // SECURITY: Require CRON_SECRET for scheduled/internal calls
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader || authHeader.replace('Bearer ', '') !== cronSecret) {
      console.error('Unauthorized access attempt to security-metrics');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const periodStart = yesterday.toISOString();
    const periodEnd = now.toISOString();

    console.log(`Calculating security metrics from ${periodStart} to ${periodEnd}`);

    const metrics: MetricResult[] = [];

    // 1. Failed Logins (24h)
    const { count: failedLogins } = await supabase
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("success", false)
      .gte("created_at", periodStart);

    metrics.push({
      metric_type: "failed_logins",
      value: failedLogins || 0,
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 10,
        threshold_alert: 50,
        status: (failedLogins || 0) > 50 ? "critical" : (failedLogins || 0) > 10 ? "warning" : "ok",
      },
    });
    console.log(`Failed logins: ${failedLogins}`);

    // 2. Critical Alerts
    const { count: criticalAlerts } = await supabase
      .from("security_alerts")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .eq("status", "open");

    metrics.push({
      metric_type: "critical_alerts",
      value: criticalAlerts || 0,
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 0,
        threshold_alert: 1,
        status: (criticalAlerts || 0) > 0 ? "critical" : "ok",
      },
    });
    console.log(`Critical alerts: ${criticalAlerts}`);

    // 3. MTTD (Mean Time to Detect) - from resolved alerts
    const { data: alertsForMttd } = await supabase
      .from("security_alerts")
      .select("timestamp, created_at")
      .not("timestamp", "is", null)
      .gte("created_at", periodStart)
      .limit(100);

    let mttdMinutes = 0;
    if (alertsForMttd && alertsForMttd.length > 0) {
      const detectionTimes = alertsForMttd
        .filter((a) => a.timestamp && a.created_at)
        .map((a) => {
          const eventTime = new Date(a.timestamp).getTime();
          const detectTime = new Date(a.created_at).getTime();
          return Math.abs(detectTime - eventTime) / (1000 * 60);
        });
      
      if (detectionTimes.length > 0) {
        mttdMinutes = detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;
      }
    }

    metrics.push({
      metric_type: "mttd",
      value: Math.round(mttdMinutes),
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 5,
        threshold_alert: 15,
        status: mttdMinutes > 15 ? "critical" : mttdMinutes > 5 ? "warning" : "ok",
        sample_size: alertsForMttd?.length || 0,
      },
    });
    console.log(`MTTD: ${Math.round(mttdMinutes)} minutes`);

    // 4. MTTR (Mean Time to Respond)
    const { data: resolvedAlerts } = await supabase
      .from("security_alerts")
      .select("created_at, resolved_at")
      .not("resolved_at", "is", null)
      .gte("resolved_at", periodStart)
      .limit(100);

    let mttrMinutes = 0;
    if (resolvedAlerts && resolvedAlerts.length > 0) {
      const responseTimes = resolvedAlerts
        .filter((a) => a.resolved_at && a.created_at)
        .map((a) => {
          const createTime = new Date(a.created_at).getTime();
          const resolveTime = new Date(a.resolved_at).getTime();
          return Math.abs(resolveTime - createTime) / (1000 * 60);
        });
      
      if (responseTimes.length > 0) {
        mttrMinutes = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    metrics.push({
      metric_type: "mttr",
      value: Math.round(mttrMinutes),
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 30,
        threshold_alert: 120,
        status: mttrMinutes > 120 ? "critical" : mttrMinutes > 30 ? "warning" : "ok",
        sample_size: resolvedAlerts?.length || 0,
      },
    });
    console.log(`MTTR: ${Math.round(mttrMinutes)} minutes`);

    // 5. High Risk Operations (24h)
    const { count: highRiskOps } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .in("risk_level", ["high", "critical"])
      .gte("created_at", periodStart);

    metrics.push({
      metric_type: "high_risk_ops",
      value: highRiskOps || 0,
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 5,
        threshold_alert: 20,
        status: (highRiskOps || 0) > 20 ? "critical" : (highRiskOps || 0) > 5 ? "warning" : "ok",
      },
    });
    console.log(`High risk ops: ${highRiskOps}`);

    // 6. Active Sessions
    const { count: activeSessions } = await supabase
      .from("user_sessions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("expires_at", periodEnd);

    metrics.push({
      metric_type: "active_sessions",
      value: activeSessions || 0,
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 50,
        threshold_alert: 100,
        status: (activeSessions || 0) > 100 ? "warning" : "ok",
      },
    });
    console.log(`Active sessions: ${activeSessions}`);

    // 7. MFA Adoption for Critical Roles
    const { data: criticalRoleUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["administrador", "financeiro_senior"]);

    const criticalUserIds = [...new Set((criticalRoleUsers || []).map((r) => r.user_id))];
    
    let mfaAdoption = 100;
    if (criticalUserIds.length > 0) {
      const { count: mfaEnabledCount } = await supabase
        .from("user_2fa_settings")
        .select("id", { count: "exact", head: true })
        .in("user_id", criticalUserIds)
        .eq("is_enabled", true);
      
      mfaAdoption = Math.round(((mfaEnabledCount || 0) / criticalUserIds.length) * 100);
    }

    metrics.push({
      metric_type: "mfa_adoption",
      value: mfaAdoption,
      period_start: periodStart,
      period_end: periodEnd,
      metadata: {
        threshold_target: 100,
        threshold_alert: 90,
        status: mfaAdoption < 90 ? "critical" : mfaAdoption < 100 ? "warning" : "ok",
        critical_users_count: criticalUserIds.length,
      },
    });
    console.log(`MFA adoption: ${mfaAdoption}%`);

    // Store metrics
    const { error: insertError } = await supabase
      .from("security_metrics")
      .insert(metrics);

    if (insertError) {
      console.error("Error storing metrics:", insertError);
      throw insertError;
    }

    console.log(`Successfully stored ${metrics.length} metrics`);

    return new Response(
      JSON.stringify({
        success: true,
        metrics_count: metrics.length,
        metrics: metrics.map((m) => ({
          type: m.metric_type,
          value: m.value,
          status: m.metadata.status,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error calculating security metrics:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
