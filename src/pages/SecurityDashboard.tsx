import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { subHours } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityAlertsList } from "@/components/security/SecurityAlertsList";
import { PIIMaskingDemo } from "@/components/security/PIIMaskingDemo";
import { IncidentPlaybooks } from "@/components/security/IncidentPlaybooks";
import {
  Shield,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Lock,
  Eye,
  RefreshCw,
  BookOpen,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityStats {
  criticalAlerts: number;
  highAlerts: number;
  failedLogins24h: number;
  highRiskOps: number;
  activeUsers: number;
  activeSessions: number;
}

export default function SecurityDashboard() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SecurityStats>({
    criticalAlerts: 0,
    highAlerts: 0,
    failedLogins24h: 0,
    highRiskOps: 0,
    activeUsers: 0,
    activeSessions: 0,
  });

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchStats();
    }
  }, [isAdmin, roleLoading]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const yesterday = subHours(now, 24);
      const yesterdayStr = yesterday.toISOString();

      // Fetch all stats in parallel
      const [alertsResult, loginsResult, highRiskResult, usersResult, sessionsResult] = await Promise.all([
        // Security alerts by severity
        supabase
          .from("security_alerts")
          .select("severity, status")
          .eq("status", "open"),
        
        // Failed logins in last 24h
        supabase
          .from("login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("success", false)
          .gte("created_at", yesterdayStr),
        
        // High-risk operations in last 24h
        supabase
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .in("risk_level", ["high", "critical"])
          .gte("created_at", yesterdayStr),
        
        // Active users (users with activity in last 24h)
        supabase
          .from("audit_logs")
          .select("user_id")
          .gte("created_at", yesterdayStr),
        
        // Active sessions
        supabase
          .from("user_sessions")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gt("expires_at", now.toISOString()),
      ]);

      const alerts = alertsResult.data || [];
      const criticalCount = alerts.filter(a => a.severity === "critical").length;
      const highCount = alerts.filter(a => a.severity === "high").length;
      
      const uniqueUsers = new Set((usersResult.data || []).map(l => l.user_id).filter(Boolean));

      setStats({
        criticalAlerts: criticalCount,
        highAlerts: highCount,
        failedLogins24h: loginsResult.count || 0,
        highRiskOps: highRiskResult.count || 0,
        activeUsers: uniqueUsers.size,
        activeSessions: sessionsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching security stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Shield}
          title="Acesso Restrito"
          description="Apenas administradores podem acessar o painel de segurança."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Painel de Segurança"
        description="Monitoramento de alertas, sessões e resposta a incidentes"
        actions={
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        }
      />

      {/* KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Alertas Críticos"
          value={stats.criticalAlerts}
          icon={ShieldAlert}
          variant={stats.criticalAlerts > 0 ? "destructive" : "success"}
        />
        <StatCard
          title="Alertas Altos"
          value={stats.highAlerts}
          icon={AlertTriangle}
          variant={stats.highAlerts > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Falhas Login (24h)"
          value={stats.failedLogins24h}
          icon={Lock}
          variant={stats.failedLogins24h > 10 ? "warning" : "primary"}
        />
        <StatCard
          title="Sessões Ativas"
          value={stats.activeSessions}
          icon={Monitor}
          variant="primary"
        />
      </StatCardGrid>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Operações Alto Risco (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className={cn(
                "h-5 w-5",
                stats.highRiskOps > 5 ? "text-warning" : "text-muted-foreground"
              )} />
              <span className="text-2xl font-bold">{stats.highRiskOps}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Ativos (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.activeUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Alertas de Segurança
          </TabsTrigger>
          <TabsTrigger value="playbooks">
            <BookOpen className="h-4 w-4 mr-2" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="masking">
            <Eye className="h-4 w-4 mr-2" />
            Mascaramento PII
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <SecurityAlertsList onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="playbooks">
          <IncidentPlaybooks />
        </TabsContent>

        <TabsContent value="masking">
          <PIIMaskingDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
