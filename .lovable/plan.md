

# Gestão de Usuários e Permissões — Padrão Vektor Flow

## Contexto

O LexFlow já possui as tabelas `permissions`, `role_permissions`, `user_roles` e as funções `has_role()`, `has_any_role()`, `has_permission()`. O que falta é a **interface administrativa** para gerenciar isso de forma visual, seguindo o padrão do [Vektor Flow](/projects/10073adf-cd1b-4e22-bfae-a55a500b3a29).

## O que será implementado

### 1. Página de Matriz de Permissões (admin)

Criar `src/pages/PermissoesAdmin.tsx` — uma tabela interativa onde cada linha é uma permissão e cada coluna é um role (`administrador`, `consultoria_juridica`, `analista_juridico`). Cada célula tem um **Switch** para ativar/desativar a permissão para aquele role.

- Agrupa permissões por categoria (Contratos, Fornecedores, Financeiro, Usuários, Auditoria, Serviços, Sistema)
- Toggle insere/remove registro na tabela `role_permissions`
- Usa `react-query` para cache e invalidação automática
- Acesso restrito a administradores

### 2. Refatorar página de Usuários

Atualizar `src/pages/Usuarios.tsx` para seguir o padrão Vektor Flow:
- Adicionar busca por nome/email
- Mostrar badges de roles clicáveis (clique remove o role)
- Botão "Add Role" abre dialog com select do role
- Usar `react-query` em vez de `useState` + `useEffect` manual
- Link para detalhes do usuário

### 3. Refatorar hook `usePermissions`

Atualizar `src/hooks/usePermissions.ts` para usar `react-query` com cache de 5 minutos (igual Vektor Flow), simplificando o código e melhorando performance.

### 4. Criar hook `useRoles`

Criar `src/hooks/useRoles.ts` — hook dedicado para consultar roles de um usuário específico, com `hasRole()` e `isAdmin` helpers. Padrão idêntico ao Vektor Flow.

### 5. Adicionar rota e menu

- Registrar rota `/admin/permissoes` no `App.tsx` com proteção de role admin
- Adicionar item no `AppSidebar.tsx` na seção de administração

## Detalhes técnicos

- **Sem migrações**: as tabelas `permissions`, `role_permissions`, `user_roles` e funções já existem
- **RLS**: as políticas de `role_permissions` já permitem SELECT para autenticados e ALL para admins
- **Padrão de UI**: Switch toggles (igual Vektor Flow `PermissionsPage`), agrupado por módulo/categoria
- **Cache**: `react-query` com `staleTime: 5 * 60 * 1000` para permissões
- **Arquivos alterados**: ~5 arquivos (2 criados, 3 editados)

