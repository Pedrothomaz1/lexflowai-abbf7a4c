import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Trash2, UserPlus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface SuperAdmin {
  user_id: string;
  email: string | null;
  full_name: string | null;
  granted_at: string;
}

export default function SuperAdminsTab() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_super_admins");
    if (error) {
      toast.error("Erro ao listar super admins: " + error.message);
    } else {
      setAdmins((data as SuperAdmin[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("promote_super_admin_by_email", {
      _email: email.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      toast.error(result.error || "Falha ao promover");
      return;
    }
    toast.success(`${email} promovido a super admin`);
    setEmail("");
    load();
  };

  const handleRevoke = async (targetEmail: string) => {
    if (!confirm(`Remover acesso super admin de ${targetEmail}?`)) return;
    const { data, error } = await supabase.rpc("revoke_super_admin_by_email", {
      _email: targetEmail,
    });
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      toast.error(result.error || "Falha ao revogar");
      return;
    }
    toast.success("Acesso removido");
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Promover super admin
          </CardTitle>
          <CardDescription>
            Conceda acesso completo à plataforma a um e-mail já cadastrado no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePromote} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Promover
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Super admins ativos ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Concedido em</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum super admin
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  admins.map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{a.email || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.granted_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => a.email && handleRevoke(a.email)}
                          disabled={!a.email}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
