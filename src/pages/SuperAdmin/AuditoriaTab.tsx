import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Log {
  id: string;
  super_admin_id: string;
  target_user_email: string;
  target_organization_nome: string | null;
  motivo: string;
  ip: string | null;
  started_at: string;
}

export default function AuditoriaTab() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("impersonation_logs" as any)
      .select("id, super_admin_id, target_user_email, target_organization_nome, motivo, ip, started_at")
      .order("started_at", { ascending: false })
      .limit(200);
    const rows = (data as any as Log[]) || [];
    setLogs(rows);
    const ids = Array.from(new Set(rows.map((r) => r.super_admin_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p.email));
      setAdminEmails(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Auditoria — Acessos "Acessar como"
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Super Admin</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Usuário acessado</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum acesso registrado ainda</TableCell></TableRow>
              )}
              {!loading && logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(l.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">{adminEmails[l.super_admin_id] || l.super_admin_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm font-medium">{l.target_organization_nome || "—"}</TableCell>
                  <TableCell className="text-sm">{l.target_user_email}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={l.motivo}>{l.motivo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.ip || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
