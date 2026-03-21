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
import { Users, UserPlus, Loader2, ArrowLeft, Shield, Crown, User, Mail, RefreshCw, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Member {
  id: string;
  user_id: string;
  role_in_org: string;
  is_active: boolean;
  joined_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role_in_org: string;
  expires_at: string;
  created_at: string;
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
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
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

      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("id, user_id, role_in_org, is_active, joined_at")
        .eq("organization_id", organization.id)
        .order("joined_at", { ascending: true });

      if (membersError) throw membersError;

      const userIds = [...new Set((membersData || []).map((member) => member.user_id).filter(Boolean))];
      const profilesById = new Map<string, { full_name: string | null; email: string | null }>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles_safe")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        for (const profile of profilesData || []) {
          profilesById.set(profile.id, {
            full_name: profile.full_name,
            email: profile.email,
          });
        }
      }

      setMembers(
        (membersData || []).map((member) => ({
          ...member,
          profile: profilesById.get(member.user_id) || null,
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

  const fetchPendingInvites = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("id, email, role_in_org, expires_at, created_at")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPendingInvites(data || []);
    } catch (err) {
      console.error("Error fetching invites:", err);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchMembers();
      fetchPendingInvites();
    }
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;

    try {
      setInviting(true);

      const emailLower = inviteEmail.trim().toLowerCase();

      // Check if already a member
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", emailLower)
        .maybeSingle();

      if (profile) {
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
      }

      // Check if there's already a pending invite
      const existingInvite = pendingInvites.find(
        (inv) => inv.email.toLowerCase() === emailLower
      );

      if (existingInvite) {
        toast({
          variant: "destructive",
          title: "Convite pendente",
          description: "Já existe um convite pendente para este email.",
        });
        return;
      }

      // Call edge function to send invite email
      const { data, error } = await supabase.functions.invoke("enviar-convite-organizacao", {
        body: {
          email: emailLower,
          organization_id: organization.id,
          role_in_org: inviteRole,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao enviar convite");
      }

      toast({
        title: "Convite enviado!",
        description: `Um email de convite foi enviado para ${emailLower}`,
      });

      setInviteEmail("");
      setInviteRole("member");
      setDialogOpen(false);
      fetchPendingInvites();
    } catch (err: any) {
      console.error("Error inviting member:", err);
      toast({
        variant: "destructive",
        title: "Erro ao convidar",
        description: err.message || "Não foi possível enviar o convite.",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (invite: PendingInvite) => {
    if (!organization) return;

    try {
      const { data, error } = await supabase.functions.invoke("enviar-convite-organizacao", {
        body: {
          email: invite.email,
          organization_id: organization.id,
          role_in_org: invite.role_in_org,
        },
      });

      if (error) throw error;

      toast({
        title: "Convite reenviado",
        description: `Email reenviado para ${invite.email}`,
      });
    } catch (err) {
      console.error("Error resending invite:", err);
      toast({
        variant: "destructive",
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar o convite.",
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: "Convite cancelado",
        description: "O convite foi removido.",
      });

      fetchPendingInvites();
    } catch (err) {
      console.error("Error canceling invite:", err);
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar o convite.",
      });
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
        description="Gerencie os membros e convites pendentes"
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
                  Convidar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Membro</DialogTitle>
                  <DialogDescription>
                    Envie um convite por email para adicionar um novo membro
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Um email de convite será enviado para este endereço
                    </p>
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
                  <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                    {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Convite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Convites Pendentes ({pendingInvites.length})
            </CardTitle>
            <CardDescription>
              Convites enviados aguardando aceitação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invite.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {roleLabels[invite.role_in_org] || invite.role_in_org}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvite(invite)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
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
