import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Loader2, ArrowLeft, Shield, Crown, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Member {
  id: string;
  user_id: string;
  role_in_org: string;
  is_active: boolean;
  joined_at: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const roleIcons: Record<string, typeof User> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const OrganizationMembers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization, isOwner, isOrgAdmin } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isOrgAdmin) {
      navigate("/dashboard");
    }
  }, [isOrgAdmin, navigate]);

  const fetchMembers = async () => {
    if (!organization) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          role_in_org,
          is_active,
          joined_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("organization_id", organization.id)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      setMembers(
        (data || []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profiles) 
            ? (m.profiles[0] as { full_name: string; email: string } | undefined) || null
            : m.profiles as { full_name: string; email: string } | null,
        }))
      );
    } catch (err) {
      console.error("Error fetching members:", err);
      toast({
        variant: "destructive",
        title: "Erro ao carregar membros",
        description: "Não foi possível carregar a lista de membros.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchMembers();
    }
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;

    try {
      setInviting(true);

      // Look up user by email from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          variant: "destructive",
          title: "Usuário não encontrado",
          description: "Nenhum usuário cadastrado com este e-mail.",
        });
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        toast({
          variant: "destructive",
          title: "Membro existente",
          description: "Este usuário já faz parte da organização.",
        });
        return;
      }

      // Add member
      const { error: insertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: profile.id,
          role_in_org: inviteRole,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast({
        title: "Membro adicionado",
        description: "O usuário foi adicionado à organização.",
      });

      setInviteEmail("");
      setInviteRole("member");
      setDialogOpen(false);
      fetchMembers();
    } catch (err) {
      console.error("Error inviting member:", err);
      toast({
        variant: "destructive",
        title: "Erro ao convidar",
        description: "Não foi possível adicionar o membro.",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role_in_org: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Papel atualizado",
        description: "O papel do membro foi alterado.",
      });

      fetchMembers();
    } catch (err) {
      console.error("Error updating role:", err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o papel.",
      });
    }
  };

  const handleToggleActive = async (memberId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ is_active: !currentActive })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: currentActive ? "Membro desativado" : "Membro ativado",
        description: `O acesso do membro foi ${currentActive ? "revogado" : "restaurado"}.`,
      });

      fetchMembers();
    } catch (err) {
      console.error("Error toggling member:", err);
      toast({
        variant: "destructive",
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status do membro.",
      });
    }
  };

  if (!organization) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membros da Organização"
        description="Gerencie os membros e suas permissões"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Membro</DialogTitle>
                  <DialogDescription>
                    Adicione um usuário existente à organização
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail do usuário</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Papel na organização</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        {isOwner && <SelectItem value="owner">Proprietário</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleInvite} disabled={inviting}>
                    {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros ({members.length})
          </CardTitle>
          <CardDescription>
            Lista de todos os membros da organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                  {isOrgAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role_in_org] || User;
                  const isCurrentOwner = member.role_in_org === "owner";

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {member.profile?.full_name || "Usuário"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4" />
                          {isOrgAdmin && !isCurrentOwner ? (
                            <Select
                              value={member.role_in_org}
                              onValueChange={(value) => handleRoleChange(member.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Membro</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                                {isOwner && <SelectItem value="owner">Proprietário</SelectItem>}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span>{roleLabels[member.role_in_org] || member.role_in_org}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.joined_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      {isOrgAdmin && (
                        <TableCell className="text-right">
                          {!isCurrentOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(member.id, member.is_active)}
                            >
                              {member.is_active ? "Desativar" : "Ativar"}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum membro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationMembers;
