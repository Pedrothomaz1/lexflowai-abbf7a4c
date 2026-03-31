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
import { handleDbError } from "@/utils/dbErrorHandler";

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type UserWithRole = Profile & {
  role: string;
  modulo_padrao: string;
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
          .select("role, modulo_padrao")
          .eq("user_id", profile.id)
          .single();

        return {
          ...profile,
          role: roleData?.role || "analista_juridico",
          modulo_padrao: roleData?.modulo_padrao || "contratos",
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
        description: handleDbError(error).message,
      });
    } else {
      toast({
        title: "Perfil atualizado com sucesso!",
      });
      fetchUsuarios();
    }
  };

  const handleModuloChange = async (userId: string, novoModulo: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ modulo_padrao: novoModulo })
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar módulo",
        description: handleDbError(error).message,
      });
    } else {
      toast({
        title: "Módulo atualizado com sucesso!",
      });
      fetchUsuarios();
    }
  };

  const getModuloBadge = (modulo: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      contratos: { label: "Contratos", variant: "secondary" },
      servicos: { label: "Serviços", variant: "default" },
      ambos: { label: "Ambos", variant: "outline" },
    };

    const { label, variant } = config[modulo] || { label: modulo, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
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
                  <TableHead>Módulo</TableHead>
                  <TableHead>Alterar Perfil</TableHead>
                  <TableHead>Alterar Módulo</TableHead>
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
                    <TableCell>{getModuloBadge(usuario.modulo_padrao)}</TableCell>
                    <TableCell>
                      <Select
                        value={usuario.role}
                        onValueChange={(value) =>
                          handleRoleChange(usuario.id, value)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
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
                    <TableCell>
                      <Select
                        value={usuario.modulo_padrao}
                        onValueChange={(value) =>
                          handleModuloChange(usuario.id, value)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contratos">Contratos</SelectItem>
                          <SelectItem value="servicos">Serviços</SelectItem>
                          <SelectItem value="ambos">Ambos</SelectItem>
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
          <CardTitle>Sobre os Perfis e Módulos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Perfis de Acesso</h4>
            <div className="space-y-2">
              <div>
                <Badge variant="secondary">Analista Jurídico</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Pode cadastrar fornecedores e contratos. Pode editar apenas contratos em rascunho criados por ele.
                </p>
              </div>
              <div>
                <Badge variant="default">Consultoria Jurídica</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Pode aprovar contratos, cadastrar fornecedores e editar qualquer contrato.
                </p>
              </div>
              <div>
                <Badge variant="outline">Administrador</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Possui todas as permissões do sistema, incluindo gerenciar usuários e seus perfis.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Módulos do Sistema</h4>
            <div className="space-y-2">
              <div>
                <Badge variant="secondary">Contratos</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Acesso ao módulo de gestão de contratos, fornecedores e aprovações.
                </p>
              </div>
              <div>
                <Badge variant="default">Serviços</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Acesso ao módulo de serviços periódicos, unidades e manutenções.
                </p>
              </div>
              <div>
                <Badge variant="outline">Ambos</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Acesso completo a ambos os módulos. O usuário poderá alternar entre eles na sidebar.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
