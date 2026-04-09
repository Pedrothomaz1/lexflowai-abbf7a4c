import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2 } from "lucide-react";
import { handleDbError } from "@/utils/dbErrorHandler";

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type RolePermission = {
  id: string;
  role: string;
  permission_id: string;
};

const ROLES = ["administrador", "consultoria_juridica", "analista_juridico"] as const;

const ROLE_LABELS: Record<string, string> = {
  administrador: "Administrador",
  consultoria_juridica: "Consultoria Jurídica",
  analista_juridico: "Analista Jurídico",
};

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contratos",
  suppliers: "Fornecedores",
  financial: "Financeiro",
  users: "Usuários",
  audit: "Auditoria",
  services: "Serviços",
  system: "Sistema",
};

const PermissoesAdmin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, name, description, category")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as Permission[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !roleLoading && isAdmin,
  });

  const { data: rolePermissions = [], isLoading: loadingRP } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("id, role, permission_id");
      if (error) throw error;
      return data as RolePermission[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !roleLoading && isAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      role,
      permissionId,
      enabled,
      existingId,
    }: {
      role: string;
      permissionId: string;
      enabled: boolean;
      existingId?: string;
    }) => {
      if (enabled) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role, permission_id: permissionId });
        if (error) throw error;
      } else if (existingId) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("id", existingId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar permissão",
        description: handleDbError(error).message,
      });
    },
  });

  const isEnabled = (role: string, permissionId: string) =>
    rolePermissions.some((rp) => rp.role === role && rp.permission_id === permissionId);

  const findRP = (role: string, permissionId: string) =>
    rolePermissions.find((rp) => rp.role === role && rp.permission_id === permissionId);

  const handleToggle = (role: string, permissionId: string) => {
    const existing = findRP(role, permissionId);
    toggleMutation.mutate({
      role,
      permissionId,
      enabled: !existing,
      existingId: existing?.id,
    });
  };

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const loading = loadingPerms || loadingRP;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Matriz de Permissões</h1>
        <p className="text-muted-foreground mt-1">
          Configure quais permissões cada perfil possui no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões por Perfil
          </CardTitle>
          <CardDescription>
            {permissions.length} permissões em {Object.keys(grouped).length} categorias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Permissão</TableHead>
                    {ROLES.map((role) => (
                      <TableHead key={role} className="text-center min-w-[140px]">
                        {ROLE_LABELS[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(grouped).map(([category, perms]) => (
                    <>
                      <TableRow key={`cat-${category}`} className="bg-muted/50">
                        <TableCell colSpan={ROLES.length + 1}>
                          <Badge variant="outline" className="font-semibold">
                            {CATEGORY_LABELS[category] || category}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {perms.map((perm) => (
                        <TableRow key={perm.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{perm.description}</span>
                              <span className="block text-xs text-muted-foreground font-mono">
                                {perm.name}
                              </span>
                            </div>
                          </TableCell>
                          {ROLES.map((role) => (
                            <TableCell key={role} className="text-center">
                              <Switch
                                checked={isEnabled(role, perm.id)}
                                onCheckedChange={() => handleToggle(role, perm.id)}
                                disabled={toggleMutation.isPending}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissoesAdmin;
