
# Plano: Reestruturação do Menu Sidebar

## Objetivo
Reorganizar o menu lateral para seguir um padrão uniforme de listas suspensas (colapsáveis) em todas as seções, conforme nova estrutura definida.

## Nova Estrutura do Menu

### 1. Principal (simples)
- Dashboard

### 2. Gestao (colapsavel com submenus)
- Contratos
  - Novo Contrato (submenu)

### 3. Cadastro (colapsavel com submenus)
- Templates
- Fornecedores
- Workflows (movido de Gestao)
- Usuarios (apenas administrador)

### 4. Sistema (simples)
- Configuracoes

## Alteracoes Tecnicas

### Arquivo: `src/components/AppSidebar.tsx`

1. **Atualizar estrutura de dados do menu**
   - Modificar `contratosMenuItems` para nova organizacao
   - Adicionar suporte a submenus aninhados
   - Mover Workflows para cadastro
   - Remover Obrigacoes

2. **Criar nova interface para menus com submenus**
   ```text
   interface MenuItemWithSubmenu {
     title: string;
     url: string;
     icon: LucideIcon;
     roles: string[];
     subItems?: { title: string; url: string; icon: LucideIcon }[];
   }
   ```

3. **Implementar componente CollapsibleMenuItem**
   - Criar novo componente para itens com submenus
   - Usar Collapsible do Radix UI (ja instalado)
   - Manter icones de seta (ChevronDown/ChevronRight)

4. **Transformar Gestao em menu colapsavel**
   - Aplicar mesmo padrao do Cadastro atual
   - Contratos como item principal com submenu
   - "Novo Contrato" como subitem

5. **Atualizar logica de estado**
   - Adicionar `gestaoOpen` state para controlar colapso
   - Manter `configOpen` existente para Cadastro

## Detalhamento Visual

### Antes (atual):
```text
PRINCIPAL
  - Dashboard
  - Contratos

GESTAO
  - Obrigacoes
  - Workflows

CADASTRO (colapsavel)
  - Templates
  - Fornecedores
  - Usuarios
```

### Depois (novo):
```text
PRINCIPAL
  - Dashboard

GESTAO (colapsavel)
  - Contratos
    - Novo Contrato

CADASTRO (colapsavel)
  - Templates
  - Fornecedores
  - Workflows
  - Usuarios
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Reestruturar menus, adicionar submenus, remover Obrigacoes |

## Testes a Realizar

1. Verificar navegacao para todas as rotas
2. Confirmar que menus colapsam/expandem corretamente
3. Testar comportamento quando sidebar esta colapsada (modo icone)
4. Validar que "Novo Contrato" abre modal ou navega corretamente
5. Confirmar filtro de roles (Usuarios apenas para administrador)
