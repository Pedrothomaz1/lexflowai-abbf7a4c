import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subHours, differenceInMinutes } from "date-fns";

interface MetricData {
  name: string;
  value: number;
  unit: string;
  target: number;
  alert: number;
  status: "ok" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
}

const THRESHOLDS = {
  failed_logins: { target: 10, alert: 50, unit: "/dia" },
  rate_limit_hits: { target: 5, alert: 20, unit: "/user/dia" },
  critical_alerts: { target: 0, alert: 1, unit: "" },
  mttd: { target: 5, alert: 15, unit: "min" },
  mttr: { target: 30, alert: 120, unit: "min" },
  mfa_adoption: { target: 100, alert: 90, unit: "%" },
  high_risk_ops: { target: 5, alert: 20, unit: "/dia" },
  active_sessions: { target: 50, alert: 100, unit: "" },
  audit_log_lag: { target: 1, alert: 5, unit: "min" },
  rls_violations: { target: 0, alert: 1, unit: "" },
};

export function SecurityMetrics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const yesterday = subHours(now, 24);
      const yesterdayStr = yesterday.toISOString();

      const [
        failedLoginsResult,
        criticalAlertsResult,
        resolvedAlertsResult,
        highRiskOpsResult,
        mfaUsersResult,
        criticalRolesResult,
        sessionsResult,
        rateLimitResult,
        latestAuditLogResult,
        rlsViolationsResult,
      ] = await Promise.all([
        // Failed logins in last 24h
        supabase
          .from("login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("success", false)
          .gte("created_at", yesterdayStr),

        // Critical alerts (open)
        supabase
          .from("security_alerts")
          .select("id, created_at, timestamp", { count: "exact" })
          .eq("severity", "critical")
          .eq("status", "open"),

        // Resolved alerts for MTTR calculation
        supabase
          .from("security_alerts")
          .select("created_at, resolved_at")
          .not("resolved_at", "is", null)
          .gte("resolved_at", yesterdayStr)
          .limit(50),

        // High risk operations
        supabase
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .in("risk_level", ["high", "critical"])
          .gte("created_at", yesterdayStr),

        // Users with 2FA enabled
        supabase
          .from("user_2fa_settings")
          .select("user_id", { count: "exact", head: true })
          .eq("is_enabled", true),

        // Users with critical roles
        supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["administrador", "financeiro_senior"]),

        // Active sessions
        supabase
          .from("user_sessions")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gt("expires_at", now.toISOString()),

        // Rate limit hits in last 24h (average per user)
        supabase
          .from("rate_limits")
          .select("user_id, count")
          .gte("window_start", yesterdayStr),

        // Latest audit log for lag calculation
        supabase
          .from("audit_logs")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1),

        // RLS violations (security alerts with rule_id containing 'rls')
        supabase
          .from("security_alerts")
          .select("id", { count: "exact", head: true })
          .ilike("rule_id", "%rls%")
          .gte("created_at", yesterdayStr),
      ]);

      // Calculate MTTD (using timestamp from event vs created_at of alert)
      const criticalAlerts = criticalAlertsResult.data || [];
      let mttdValue = 0;
      if (criticalAlerts.length > 0) {
        const detectionTimes = criticalAlerts
          .filter((a) => a.timestamp && a.created_at)
          .map((a) =>
            Math.abs(
              differenceInMinutes(new Date(a.created_at), new Date(a.timestamp))
            )
          );
        if (detectionTimes.length > 0) {
          mttdValue =
            detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;
        }
      }

      // Calculate MTTR
      const resolvedAlerts = resolvedAlertsResult.data || [];
      let mttrValue = 0;
      if (resolvedAlerts.length > 0) {
        const responseTimes = resolvedAlerts
          .filter((a) => a.resolved_at && a.created_at)
          .map((a) =>
            Math.abs(
              differenceInMinutes(
                new Date(a.resolved_at),
                new Date(a.created_at)
              )
            )
          );
        if (responseTimes.length > 0) {
          mttrValue =
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
      }

      // Calculate MFA adoption for critical roles
      const criticalRoleUsers = criticalRolesResult.data || [];
      const criticalUserIds = [...new Set(criticalRoleUsers.map((r) => r.user_id))];
      const mfaCount = mfaUsersResult.count || 0;
      const mfaAdoption =
        criticalUserIds.length > 0
          ? Math.round((mfaCount / criticalUserIds.length) * 100)
          : 100;

      const failedLogins = failedLoginsResult.count || 0;
      const criticalCount = criticalAlertsResult.count || 0;
      const highRiskOps = highRiskOpsResult.count || 0;
      const activeSessions = sessionsResult.count || 0;
      const rlsViolations = rlsViolationsResult.count || 0;

      // Calculate rate limit hits average per user
      const rateLimitData = rateLimitResult.data || [];
      const uniqueUsers = new Set(rateLimitData.map((r) => r.user_id).filter(Boolean));
      const totalHits = rateLimitData.reduce((sum, r) => sum + (r.count || 0), 0);
      const rateLimitAvg = uniqueUsers.size > 0 ? Math.round(totalHits / uniqueUsers.size) : 0;

      // Calculate audit log lag (time since last log)
      const latestLog = latestAuditLogResult.data?.[0];
      let auditLogLag = 0;
      if (latestLog?.created_at) {
        auditLogLag = Math.round(
          differenceInMinutes(now, new Date(latestLog.created_at))
        );
      }

      const metricsData: MetricData[] = [
        {
          name: "Falhas de Login (24h)",
          value: failedLogins,
          ...THRESHOLDS.failed_logins,
          status: getStatus(failedLogins, THRESHOLDS.failed_logins),
        },
        {
          name: "Rate Limit Hits (avg/user)",
          value: rateLimitAvg,
          ...THRESHOLDS.rate_limit_hits,
          status: getStatus(rateLimitAvg, THRESHOLDS.rate_limit_hits),
        },
        {
          name: "Alertas Críticos",
          value: criticalCount,
          ...THRESHOLDS.critical_alerts,
          status: getStatus(criticalCount, THRESHOLDS.critical_alerts),
        },
        {
          name: "MTTD (Tempo Detecção)",
          value: Math.round(mttdValue),
          ...THRESHOLDS.mttd,
          status: getStatus(mttdValue, THRESHOLDS.mttd),
        },
        {
          name: "MTTR (Tempo Resposta)",
          value: Math.round(mttrValue),
          ...THRESHOLDS.mttr,
          status: getStatus(mttrValue, THRESHOLDS.mttr),
        },
        {
          name: "Adoção MFA (Críticos)",
          value: mfaAdoption,
          ...THRESHOLDS.mfa_adoption,
          status: getMfaStatus(mfaAdoption),
        },
        {
          name: "Audit Log Lag",
          value: auditLogLag,
          ...THRESHOLDS.audit_log_lag,
          status: getStatus(auditLogLag, THRESHOLDS.audit_log_lag),
        },
        {
          name: "Violações RLS (24h)",
          value: rlsViolations,
          ...THRESHOLDS.rls_violations,
          status: getStatus(rlsViolations, THRESHOLDS.rls_violations),
        },
        {
          name: "Ops Alto Risco (24h)",
          value: highRiskOps,
          ...THRESHOLDS.high_risk_ops,
          status: getStatus(highRiskOps, THRESHOLDS.high_risk_ops),
        },
        {
          name: "Sessões Ativas",
          value: activeSessions,
          ...THRESHOLDS.active_sessions,
          status: getStatus(activeSessions, THRESHOLDS.active_sessions),
        },
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching security metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (
    value: number,
    threshold: { target: number; alert: number }
  ): "ok" | "warning" | "critical" => {
    if (value >= threshold.alert) return "critical";
    if (value > threshold.target) return "warning";
    return "ok";
  };

  const getMfaStatus = (value: number): "ok" | "warning" | "critical" => {
    if (value >= 100) return "ok";
    if (value >= 90) return "warning";
    return "critical";
  };

  const getStatusIcon = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "ok":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-destructive";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Métricas de Segurança</h3>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.name} className="relative overflow-hidden">
            <div
              className={cn(
                "absolute top-0 left-0 w-1 h-full",
                getStatusColor(metric.status)
              )}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.name}
                </CardTitle>
                {getStatusIcon(metric.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{metric.value}</span>
                <span className="text-sm text-muted-foreground">
                  {metric.unit}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Target: {metric.target}</span>
                  <span className="text-muted-foreground">
                    Alerta: {metric.alert}
                  </span>
                </div>
                <Progress
                  value={Math.min((metric.value / metric.alert) * 100, 100)}
                  className={cn(
                    "h-1.5",
                    metric.status === "ok" && "[&>div]:bg-green-500",
                    metric.status === "warning" && "[&>div]:bg-yellow-500",
                    metric.status === "critical" && "[&>div]:bg-destructive"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Thresholds do PRD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>Failed Logins</span>
              <Badge variant="outline">&lt;10/dia</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>Rate Limit Hits</span>
              <Badge variant="outline">&lt;5/user/dia</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>MTTD</span>
              <Badge variant="outline">&lt;5 min</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>MTTR</span>
              <Badge variant="outline">&lt;30 min</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>MFA Críticos</span>
              <Badge variant="outline">100%</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>Audit Log Lag</span>
              <Badge variant="outline">&lt;1 min</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>RLS Violations</span>
              <Badge variant="outline">0</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>Critical Alerts</span>
              <Badge variant="outline">0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
