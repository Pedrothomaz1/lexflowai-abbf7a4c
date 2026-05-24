import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Row {
  user_id: string;
  email: string;
  full_name: string | null;
  org_nome: string;
  org_status: string;
  role_in_org: string;
  joined_at: string;
}

export default function UsuariosTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      // Fetch all org members + join with profiles + organizations
      const { data: members } = await supabase
        .from("organization_members")
        .select(`
          user_id, role_in_org, joined_at, is_active,
          organizations:organization_id ( nome, status ),
          profiles:user_id ( full_name, email )
        `)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (members) {
        setRows(
          (members as any[]).map((m) => ({
            user_id: m.user_id,
            email: m.profiles?.email || "—",
            full_name: m.profiles?.full_name || null,
            org_nome: m.organizations?.nome || "—",
            org_status: m.organizations?.status || "—",
            role_in_org: m.role_in_org || "member",
            joined_at: m.joined_at,
          })),
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.email.toLowerCase().includes(s) ||
      r.full_name?.toLowerCase().includes(s) ||
      r.org_nome.toLowerCase().includes(s)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuários globais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status empresa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Ingressou em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((r) => (
                  <TableRow key={r.user_id + r.org_nome}>
                    <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell>{r.org_nome}</TableCell>
                    <TableCell>
                      <Badge variant={r.org_status === "ativa" ? "default" : "secondary"}>
                        {r.org_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{r.role_in_org}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.joined_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
