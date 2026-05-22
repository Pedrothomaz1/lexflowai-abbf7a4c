## Remover papel `consultoria_juridica`

O papel `consultoria_juridica` existe no enum `app_role` mas não tem permissões atribuídas e gera confusão na matriz de permissões e nos convites. Vou removê-lo do sistema.

### Migração (banco)

1. Reatribuir qualquer usuário existente em `user_roles` com `role = 'consultoria_juridica'` para `analista_juridico` (mantém acesso de leitura sem quebrar login).
2. Remover linhas de `role_permissions` com `role = 'consultoria_juridica'`.
3. Remover linhas de `mfa_requirements` com `role = 'consultoria_juridica'`.
4. Reatribuir convites pendentes em `organization_invites` com `role_in_org = 'consultoria'` para `membro`.
5. Recriar o enum `app_role` sem o valor `consultoria_juridica` (Postgres não permite `DROP VALUE`):
   - criar `app_role_new` com `administrador`, `analista_juridico`
   - alterar colunas que usam `app_role` para o novo tipo
   - dropar o antigo e renomear
6. Atualizar `accept_organization_invite` para não mapear mais para `consultoria_juridica` (cair em `analista_juridico`).

### Frontend

1. `src/hooks/useRoles.ts` — remover `consultoria_juridica` do tipo `AppRole` e o flag `isConsultor`.
2. `src/hooks/useUserRole.tsx` — remover `consultoria_juridica` do tipo, remover `isConsultor` e ajustar `canApprove` (passa a ser só `isAdmin`).
3. `src/pages/PermissoesAdmin.tsx` — remover `consultoria_juridica` de `ROLES` e `ROLE_LABELS`.
4. Buscar e ajustar outros usos (`grep` por `consultoria_juridica` / `isConsultor` / `'consultoria'` em telas de convite, badges, filtros).

### Documentação

- `DOCUMENTACAO_TECNICA.md` seção 4 (RBAC) — remover o papel da lista.
- `docs/prd/overview.md` seção Usuários — remover linha de Consultoria Jurídica.

### Testes / validação

- Rodar `security-regression-runner` para garantir que nada quebrou em RLS.
- Marcar o item "Decidir consultoria_juridica" como resolvido em `pre_launch_test_runs` (nota: papel removido).

### Riscos

- Se houver usuários reais em produção como `consultoria_juridica`, eles viram `analista_juridico` (perda de qualquer permissão exclusiva — hoje **não há nenhuma**, então sem impacto prático).
- Convites pendentes "consultoria" viram "membro" — quem aceitar entra como analista.
