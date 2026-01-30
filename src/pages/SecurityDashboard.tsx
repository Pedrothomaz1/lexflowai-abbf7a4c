import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { format, subHours, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityAlertsList } from "@/components/security/SecurityAlertsList";
import { PIIMaskingDemo } from "@/components/security/PIIMaskingDemo";
import {
  Shield,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  Lock,
  Eye,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityStats {
  criticalAlerts: number;
  highAlerts: number;
  failedLogins24h: number;
  highRiskOps: number;
  activeUsers: number;
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
      const [alertsResult, loginsResult, highRiskResult, usersResult] = await Promise.all([
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
        description="Monitoramento de alertas e atividades de segurança"
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
          title="Ops Alto Risco (24h)"
          value={stats.highRiskOps}
          icon={Activity}
          variant={stats.highRiskOps > 5 ? "warning" : "primary"}
        />
      </StatCardGrid>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Alertas de Segurança
          </TabsTrigger>
          <TabsTrigger value="masking">
            <Eye className="h-4 w-4 mr-2" />
            Mascaramento PII
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <SecurityAlertsList onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="masking">
          <PIIMaskingDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
