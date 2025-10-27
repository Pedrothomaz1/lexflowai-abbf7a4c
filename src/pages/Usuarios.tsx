import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type UserWithRole = Profile & {
  role: string;
};

const Usuarios = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canManageUsers, loading: roleLoading } = useUserRole();
  const [usuarios, setUsuarios] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !canManageUsers) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página",
      });
      navigate("/dashboard");
      return;
    }

    if (!roleLoading && canManageUsers) {
      fetchUsuarios();
    }
  }, [roleLoading, canManageUsers]);

  const fetchUsuarios = async () => {
    setLoading(true);

    // Buscar profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    if (profilesError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: profilesError.message,
      });
      setLoading(false);
      return;
    }

    // Buscar roles de cada usuário
    const usuariosComRoles = await Promise.all(
      profiles.map(async (profile) => {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .single();

        return {
          ...profile,
          role: roleData?.role || "analista_juridico",
        };
      })
    );

    setUsuarios(usuariosComRoles);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: error.message,
      });
    } else {
      toast({
        title: "Perfil atualizado com sucesso!",
      });
      fetchUsuarios();
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      analista_juridico: { label: "Analista Jurídico", variant: "secondary" },
      consultoria_juridica: { label: "Consultoria Jurídica", variant: "default" },
      administrador: { label: "Administrador", variant: "outline" },
    };

    const { label, variant } = config[role] || { label: role, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  if (!canManageUsers) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Configure os perfis de acesso dos usuários
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Usuários e Permissões
          </CardTitle>
          <CardDescription>
            {usuarios.length} usuário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil Atual</TableHead>
                  <TableHead>Alterar Perfil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {usuario.full_name}
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                    <TableCell>
                      <Select
                        value={usuario.role}
                        onValueChange={(value) =>
                          handleRoleChange(usuario.id, value)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="analista_juridico">
                            Analista Jurídico
                          </SelectItem>
                          <SelectItem value="consultoria_juridica">
                            Consultoria Jurídica
                          </SelectItem>
                          <SelectItem value="administrador">
                            Administrador
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle>Sobre os Perfis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">Analista Jurídico</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Pode cadastrar fornecedores e contratos. Pode editar apenas contratos em rascunho criados por ele.
            </p>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="default">Consultoria Jurídica</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Pode aprovar contratos, cadastrar fornecedores e editar qualquer contrato.
            </p>
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Badge variant="outline">Administrador</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Possui todas as permissões do sistema, incluindo gerenciar usuários e seus perfis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
