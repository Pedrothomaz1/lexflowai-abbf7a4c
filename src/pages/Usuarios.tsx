import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Plus, Search, X, Loader2, KeyRound, UserPlus, Trash2, Send } from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type UserRole = {
  id: string;
  role: string;
  modulo_padrao: string;
};

type UserWithRoles = Profile & {
  roles: UserRole[];
  modulo_padrao: string;
};

const ROLE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  analista_juridico: { label: "Analista Jurídico", variant: "secondary" },
  consultoria_juridica: { label: "Consultoria Jurídica", variant: "default" },
  administrador: { label: "Administrador", variant: "outline" },
};

const MODULO_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  contratos: { label: "Contratos", variant: "secondary" },
  servicos: { label: "Serviços", variant: "default" },
  ambos: { label: "Ambos", variant: "outline" },
};

const Usuarios = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canManageUsers, loading: roleLoading } = useUserRole();
  const { organization } = useOrganization();
  const [search, setSearch] = useState("");
  const [addRoleUserId, setAddRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analista_juridico");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios_admin"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;

      const usersWithRoles = await Promise.all(
        (profiles as Profile[]).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("id, role, modulo_padrao")
            .eq("user_id", profile.id);

          const roles = (roleData || []) as UserRole[];
          return {
            ...profile,
            roles,
            modulo_padrao: roles[0]?.modulo_padrao || "contratos",
          };
        })
      );
      return usersWithRoles;
    },
    staleTime: 60_000,
    enabled: !roleLoading && canManageUsers,
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_admin"] });
      toast({ title: "Perfil removido com sucesso!" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: handleDbError(err).message });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!organization?.id) throw new Error("Organização não encontrada");
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role, organization_id: organization.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_admin"] });
      toast({ title: "Perfil adicionado com sucesso!" });
      setAddRoleUserId(null);
      setNewRole("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: handleDbError(err).message });
    },
  });

  const updateModuloMutation = useMutation({
    mutationFn: async ({ userId, modulo }: { userId: string; modulo: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ modulo_padrao: modulo })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_admin"] });
      toast({ title: "Módulo atualizado!" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: handleDbError(err).message });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("Organização não encontrada");
      const { data, error } = await supabase.functions.invoke("enviar-convite-organizacao", {
        body: {
          email: inviteEmail.toLowerCase().trim(),
          organization_id: organization.id,
          role_in_org: "member",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_admin"] });
      toast({ title: "Convite enviado!", description: `Um email foi enviado para ${inviteEmail}.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("analista_juridico");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao convidar", description: err.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove user roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (roleError) throw roleError;

      // Remove from organization members
      const { error: memberError } = await supabase
        .from("organization_members")
        .delete()
        .eq("user_id", userId);
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_admin"] });
      toast({ title: "Usuário removido com sucesso!" });
      setDeleteUserId(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao remover", description: handleDbError(err).message });
    },
  });

  const filtered = usuarios.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageUsers) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Configure perfis de acesso, convide e gerencie usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/permissoes")}>
            <KeyRound className="h-4 w-4 mr-2" />
            Matriz de Permissões
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Usuários e Permissões
              </CardTitle>
              <CardDescription>{filtered.length} usuário(s)</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfis</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((usuario) => {
                  const isCurrentUser = currentUser?.id === usuario.id;
                  return (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {usuario.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {usuario.roles.map((r) => {
                            const cfg = ROLE_CONFIG[r.role] || { label: r.role, variant: "outline" as const };
                            return (
                              <Badge
                                key={r.id}
                                variant={cfg.variant}
                                className="cursor-pointer group gap-1"
                                onClick={() => {
                                  if (usuario.roles.length > 1) {
                                    removeRoleMutation.mutate(r.id);
                                  } else {
                                    toast({
                                      variant: "destructive",
                                      title: "Não é possível remover",
                                      description: "O usuário precisa ter pelo menos um perfil.",
                                    });
                                  }
                                }}
                              >
                                {cfg.label}
                                {usuario.roles.length > 1 && (
                                  <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </Badge>
                            );
                          })}
                          {usuario.roles.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Sem perfil</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={usuario.modulo_padrao}
                          onValueChange={(v) =>
                            updateModuloMutation.mutate({ userId: usuario.id, modulo: v })
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contratos">Contratos</SelectItem>
                            <SelectItem value="servicos">Serviços</SelectItem>
                            <SelectItem value="ambos">Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={addRoleUserId === usuario.id}
                            onOpenChange={(open) => {
                              if (!open) setAddRoleUserId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Adicionar perfil"
                                onClick={() => setAddRoleUserId(usuario.id)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[350px]">
                              <DialogHeader>
                                <DialogTitle>Adicionar Perfil</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-2">
                                <Select value={newRole} onValueChange={setNewRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um perfil" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROLE_CONFIG)
                                      .filter(
                                        ([key]) =>
                                          !usuario.roles.some((r) => r.role === key)
                                      )
                                      .map(([key, cfg]) => (
                                        <SelectItem key={key} value={key}>
                                          {cfg.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  className="w-full"
                                  disabled={!newRole || addRoleMutation.isPending}
                                  onClick={() =>
                                    addRoleMutation.mutate({
                                      userId: usuario.id,
                                      role: newRole,
                                    })
                                  }
                                >
                                  Adicionar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {!isCurrentUser && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Remover usuário"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setDeleteUserId(usuario.id);
                                setDeleteUserName(usuario.full_name || usuario.email);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Perfil inicial</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => inviteUserMutation.mutate()}
              disabled={!inviteEmail || inviteUserMutation.isPending}
            >
              {inviteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convidando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Convidar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteUserName}</strong> da organização?
              Todos os perfis e permissões serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
            >
              {deleteUserMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle>Sobre os Perfis e Módulos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Perfis de Acesso</h4>
            <div className="space-y-2">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <div key={key}>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {key === "analista_juridico" &&
                      "Pode cadastrar fornecedores e contratos. Pode editar apenas contratos em rascunho criados por ele."}
                    {key === "consultoria_juridica" &&
                      "Pode aprovar contratos, cadastrar fornecedores e editar qualquer contrato."}
                    {key === "administrador" &&
                      "Possui todas as permissões do sistema, incluindo gerenciar usuários e seus perfis."}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Módulos do Sistema</h4>
            <div className="space-y-2">
              {Object.entries(MODULO_CONFIG).map(([key, cfg]) => (
                <div key={key}>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {key === "contratos" &&
                      "Acesso ao módulo de gestão de contratos, fornecedores e aprovações."}
                    {key === "servicos" &&
                      "Acesso ao módulo de serviços periódicos, unidades e manutenções."}
                    {key === "ambos" &&
                      "Acesso completo a ambos os módulos. O usuário poderá alternar entre eles na sidebar."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
