## Objetivo

Auditar e refinar a base estrutural do LexFlow (sem reescrever) para entregar o padrão enterprise descrito: sidebar reorganizada por contexto, header com busca global agrupada, gates de permissão por bloco, e estados consistentes (loading/empty/error/forbidden/suspended).

## Diagnóstico do que já existe

- Sidebar (`AppSidebar.tsx`): agrupada por Principal/Base/Automação/Governança, com colapso e role-based filter. Falta: itens "Aprovações", "Obrigações", "Portal Externo" e "Super Admin" no menu principal.
- Header (`GlobalHeader.tsx`): tenant badge, busca (vai para `/contratos?search=`), notificações, 2FA, tema, avatar. Falta: command palette ⌘K com resultados agrupados por entidade e breadcrumbs.
- `ProtectedRoute`: já cobre auth, 2FA, organização ativa/suspensa/aguardando e permissão por rota. Não há wrapper por bloco.
- `usePermissions`: lê backend via `role_permissions`. Pronto para reutilizar em gates por bloco.
- Estados de sistema: `WaitingForInvite`, `AguardandoAprovacao`, `ContaSuspensa` existem. Falta banner persistente quando tenant for suspenso no meio da sessão e empty/error states padronizados.
- Skeletons: `PageSkeleton` existe em `skeleton-loaders`. Padronizar uso.

## Escopo da entrega (refino, sem reescrita)

### 1. Sidebar — reorganizar conforme lista solicitada

Manter `AppSidebar.tsx` e apenas reestruturar `contratosMenuSections`:

```
Principal
  Dashboard, Requisições, Contratos, Franquias, Aprovações (novo →/workflows), Obrigações (/obrigacoes)
Base
  Fornecedores, Unidades, Templates
Automação
  Workflows
Relatórios & Governança
  Relatórios, Alertas, Calendário, Histórico de Ações, Segurança, Proteção de Dados
Portal Externo (novo grupo, admin)
  Link Público de Requisição (/requisicao)
Administração (apenas super admin / org admin)
  Usuários, Permissões, Configurações da Organização, Super Admin (/super-admin, gate por `is_super_admin`)
```

Itens novos só são exibidos por role/permission; nada de novo schema.

### 2. Command Palette ⌘K — busca global agrupada

Novo componente `src/components/CommandPalette.tsx` (usa `cmdk` via shadcn `Command`, já no projeto via `@/components/ui/command`). Aciona-se pelo botão "Buscar" do header e atalho ⌘K (já existe handler — apenas substituir o redirect atual).

- Query única ao Supabase paralela em: `contratos`, `fornecedores`, `obrigacoes_contratuais`, `contract_requests`, `templates_contrato` (limit 5 cada, filtra por `current_user_org()` via RLS).
- Resultados agrupados por entidade com ícone, título e subtítulo. Navegação por teclado nativa do cmdk.
- Atalhos rápidos: "Novo contrato", "Nova requisição", "Ir para Aprovações".
- Estado vazio: "Nenhum resultado para …".
- Skeleton enquanto carrega.

`GlobalHeader.tsx`: substituir o input atual pelo botão que abre o palette (mantém o `kbd ⌘K`).

### 3. Permission gates por bloco — `<Can>` wrapper

Novo `src/components/auth/Can.tsx`:

```tsx
<Can permission="contract:approve" fallback={null}>
  <Button>Aprovar</Button>
</Can>
```

- Props: `permission` (string) | `anyOf` (string[]) | `allOf` (string[]), `fallback?`, `loadingFallback?`.
- Reusa `usePermissions` (já lê do backend). Não revalida — confia no cache.
- Variante `<RoleGate roles={["administrador"]}>` usando `useUserRole`.

Aplicar em 2–3 lugares-piloto para servir de exemplo (sem refatorar tudo): botões de aprovação em `ContratoDetalhes`, ação "Novo contrato", item "Super Admin" na sidebar.

### 4. Estados padronizados — componentes reutilizáveis

Criar em `src/components/states/`:

- `EmptyState.tsx` — ícone, título, descrição, CTA opcional.
- `ErrorState.tsx` — mensagem + botão "Tentar novamente".
- `ForbiddenState.tsx` — para blocos sem permissão dentro de páginas permitidas.
- `SuspendedBanner.tsx` — banner sticky no topo quando `organization.status !== 'ativa'` durante a sessão (renderiza em `DashboardLayout`, antes do header).

Tudo via design tokens existentes (`--lexflow-*`, `--destructive`, `--muted`).

### 5. Breadcrumbs

Novo `src/components/Breadcrumbs.tsx` baseado em rota:
- Mapa de labels (reaproveita `routeTitles` de `GlobalHeader`) + parsing de `:id` (ex.: "Contratos / CT-2025-0001").
- Renderiza dentro do `<main>` do `DashboardLayout`, acima do conteúdo.

### 6. Toasts e badges de status

- Manter `sonner`. Padronizar 4 helpers em `src/lib/toast.ts`: `toastSuccess`, `toastError`, `toastWarning`, `toastInfo` com mensagens curtas e ações ("Desfazer", "Tentar novamente").
- `Badge` de status já existe — adicionar variantes semânticas (`risk`, `late`, `pending`, `success`) em `badge.tsx` se faltarem (verificar antes de editar).

### 7. Mensagens de sistema (microcopy)

Centralizar em `src/lib/system-messages.ts`:
```
ORG_SUSPENDED, FORBIDDEN_MODULE, EMPTY_CONTEXT, ACCESS_UPDATED
```
Usado por `SuspendedBanner`, `ForbiddenState`, `EmptyState` e `ProtectedRoute`.

## Detalhes técnicos

- Sem migração de schema. RLS e multi-tenant já garantem isolamento.
- `CommandPalette` consulta apenas tabelas já filtradas por RLS (`current_user_org()`); não vaza dados entre tenants.
- `<Can>` é UX, não segurança — segurança real continua nas RLS policies e edge functions.
- Lazy-load do `CommandPalette` para não pesar o bundle inicial.
- Sem novas dependências: `cmdk`, `lucide-react`, `sonner`, shadcn já instalados.

## Arquivos afetados

```
edit  src/components/AppSidebar.tsx          (reorganizar seções + 3 itens novos)
edit  src/components/GlobalHeader.tsx        (trocar input por trigger do palette)
edit  src/components/DashboardLayout.tsx     (montar SuspendedBanner + Breadcrumbs)
new   src/components/CommandPalette.tsx
new   src/components/auth/Can.tsx
new   src/components/Breadcrumbs.tsx
new   src/components/states/EmptyState.tsx
new   src/components/states/ErrorState.tsx
new   src/components/states/ForbiddenState.tsx
new   src/components/states/SuspendedBanner.tsx
new   src/lib/system-messages.ts
new   src/lib/toast.ts
edit  src/pages/ContratoDetalhes.tsx         (1 exemplo de <Can>)
```

## Fora de escopo (próximas tasks)

- Refatorar todas as páginas para usar `<EmptyState>`/`<ErrorState>` — só piloto agora.
- Notificações em tempo real (já existe parcialmente via `NotificationContext`; melhorias separadas).
- Novo módulo de "Aprovações" como página dedicada (hoje vive em `/workflows`).
