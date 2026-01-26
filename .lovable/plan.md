
## Plano: Master Blueprint LexFlow - Redesign UX/UI

### Visão Geral

Transformar a interface do LexFlow em um "cockpit de alta produtividade" com diferenciação visual clara entre os módulos **Contratos** (tema Verde) e **Serviços** (tema Mostarda), seguindo a Lei de Hick para reduzir atrito cognitivo.

---

## Fase 1: Sistema de Temas Dinâmicos por Módulo

### 1.1 Novas Variáveis CSS (index.css)

Adicionar variáveis de cor específicas para cada módulo:

```css
:root {
  /* Paleta Master Blueprint */
  --lexflow-verde-escuro: 153 16% 27%;      /* #384E46 - Sidebar */
  --lexflow-verde-principal: 153 13% 56%;   /* #7F9C90 - Destaque Contratos */
  --lexflow-off-white: 80 17% 95%;          /* #F2F4F0 - Textos */
  --lexflow-mostarda: 35 58% 61%;           /* #D6A461 - Destaque Serviços */
  --lexflow-amarelo: 43 82% 68%;            /* #EFC06E - CTAs */
  --lexflow-vinho: 344 62% 39%;             /* #862041 - Alertas Críticos */
  --lexflow-rosa: 13 69% 75%;               /* #EA9E95 - Erros */
  
  /* Módulo Ativo (padrão: contratos) */
  --modulo-accent: var(--lexflow-verde-principal);
  --modulo-accent-foreground: 0 0% 100%;
}

/* Classe para módulo Serviços */
.modulo-servicos {
  --modulo-accent: var(--lexflow-mostarda);
  --sidebar-primary: var(--lexflow-mostarda);
}
```

### 1.2 Aplicação Dinâmica no Layout

Modificar `DashboardLayout.tsx` para aplicar classe CSS baseada no módulo ativo:

```typescript
const { moduloAtivo } = useModulo();

<div className={cn(
  "min-h-screen flex w-full bg-background",
  moduloAtivo === "servicos" && "modulo-servicos"
)}>
```

---

## Fase 2: Reestruturação do Menu Lateral

### 2.1 Nova Hierarquia de Menu (AppSidebar.tsx)

Reorganizar seguindo o checklist do Blueprint:

| Grupo | Contratos | Serviços |
|-------|-----------|----------|
| **Operação** | Dashboard, Contratos | Dashboard, Serviços |
| **Controle** | Obrigações, Workflows | - |
| **Admin Central** | Usuários, Fornecedores, Templates | Usuários, Fornecedores, Unidades, Especificações |

**Itens a remover do menu lateral:**
- Alertas → Mover para Header como ícone
- Calendário → Mover para Header como ícone
- Kanban → Integrar dentro da página Contratos como visualização

### 2.2 Switch de Módulo no Topo

Redesenhar o seletor de módulo como componente destacado:

```typescript
<div className="mx-3 mb-4 p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-2 h-2 rounded-full",
        moduloAtivo === "contratos" ? "bg-[#7F9C90]" : "bg-[#D6A461]"
      )} />
      <span className="text-sm font-medium text-sidebar-foreground">
        {moduloAtivo === "contratos" ? "Contratos" : "Serviços"}
      </span>
    </div>
    <Button variant="ghost" size="sm" onClick={handleSwitchModulo}>
      <ArrowLeftRight className="h-4 w-4" />
    </Button>
  </div>
</div>
```

---

## Fase 3: Novo Header com Utilidades

### 3.1 Adicionar Ícones de Alertas e Calendário (GlobalHeader.tsx)

```typescript
// Novo layout do header
<header className="...">
  <SidebarTrigger />
  <PageTitle />
  
  <div className="flex-1" />
  
  {/* Utilities Zone */}
  <Button variant="ghost" onClick={() => navigate("/calendario")}>
    <Calendar className="h-4 w-4" />
  </Button>
  
  <Button variant="ghost" className="relative" onClick={() => navigate("/alertas")}>
    <Bell className="h-4 w-4" />
    {pendingAlerts > 0 && (
      <Badge className="absolute -right-1 -top-1 bg-[#862041] text-white">
        {pendingAlerts}
      </Badge>
    )}
  </Button>
  
  <Search />
  <ThemeToggle />
</header>
```

---

## Fase 4: Visualizações Unificadas (Lista/Kanban/Calendário)

### 4.1 Criar Componente de Tabs dentro de Contratos.tsx

```typescript
const [viewMode, setViewMode] = useState<"lista" | "kanban" | "calendario">("lista");

<Tabs value={viewMode} onValueChange={setViewMode}>
  <TabsList>
    <TabsTrigger value="lista">
      <List className="h-4 w-4 mr-2" />
      Lista
    </TabsTrigger>
    <TabsTrigger value="kanban">
      <Kanban className="h-4 w-4 mr-2" />
      Kanban
    </TabsTrigger>
    <TabsTrigger value="calendario">
      <Calendar className="h-4 w-4 mr-2" />
      Calendário
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="lista">
    <DataTable ... />
  </TabsContent>
  <TabsContent value="kanban">
    <KanbanBoard ... />
  </TabsContent>
  <TabsContent value="calendario">
    <CalendarView ... />
  </TabsContent>
</Tabs>
```

### 4.2 Mover Componentes Existentes

- Extrair lógica de `Kanban.tsx` para componente reutilizável `KanbanBoard.tsx`
- Extrair lógica de `Calendario.tsx` para componente reutilizável `CalendarView.tsx`

---

## Fase 5: Hierarquia Visual de Cards (Dashboard)

### 5.1 Adicionar Variante Vinho para Cards Críticos

```css
.stat-card-critical {
  @apply stat-card;
  background: linear-gradient(135deg, hsl(344 62% 39% / 0.12), hsl(344 62% 39% / 0.05));
  border-color: hsl(344 62% 39% / 0.3);
}

.badge-critical {
  @apply bg-[#862041]/10 text-[#862041] border-[#862041]/20;
}
```

### 5.2 Atualizar Dashboard.tsx

Cards de "Vencendo em 30 dias" e "Riscos Altos" usarão a variante critical:

```typescript
<StatCard
  title="Vencendo em 30 dias"
  value={stats.vencendo30Dias}
  icon={Clock}
  variant="critical"  // Nova variante
/>
```

---

## Fase 6: Contraste de Tipografia

### 6.1 Atualizar Cores do Sidebar (index.css)

Substituir cinza atual por Off White para legibilidade:

```css
:root {
  --sidebar-background: 153 16% 27%;        /* #384E46 - Verde Escuro */
  --sidebar-foreground: 80 17% 95%;         /* #F2F4F0 - Off White */
  --sidebar-muted: 80 10% 75%;              /* Mais claro que antes */
}
```

---

## Fase 7: Botão "Novo Contrato" Destacado

### 7.1 Aplicar Cor Amarelo Ouro ao CTA Principal

```typescript
<Button 
  size="sm"
  className="bg-[#EFC06E] hover:bg-[#D6A461] text-[#384E46] font-semibold"
>
  <Plus className="h-4 w-4 mr-1.5" />
  Novo Contrato
</Button>
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/index.css` | Adicionar variáveis da paleta, temas por módulo, variantes de cards |
| `src/components/DashboardLayout.tsx` | Aplicar classe CSS dinâmica baseada no módulo |
| `src/components/AppSidebar.tsx` | Nova estrutura de menu, remover Alertas/Calendário, redesenhar switch |
| `src/components/GlobalHeader.tsx` | Adicionar ícones de Calendário e Alertas |
| `src/pages/Contratos.tsx` | Integrar tabs Lista/Kanban/Calendário |
| `src/pages/Servicos.tsx` | Integrar tabs Lista/Calendário |
| `src/components/ui/stat-card.tsx` | Adicionar variante "critical" |
| `src/pages/Dashboard.tsx` | Usar nova variante critical para cards de risco |
| `src/pages/Kanban.tsx` | Refatorar para componente reutilizável |
| `src/pages/Calendario.tsx` | Refatorar para componente reutilizável |
| `tailwind.config.ts` | Adicionar cores da paleta oficial |

---

## Arquivos Novos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/contracts/KanbanBoard.tsx` | Componente Kanban reutilizável |
| `src/components/contracts/CalendarView.tsx` | Componente Calendário reutilizável |
| `src/components/contracts/ViewToggle.tsx` | Seletor de visualização (Lista/Kanban/Calendário) |

---

## Resultado Visual Esperado

**Módulo Contratos:**
- Sidebar: Verde Escuro (#384E46)
- Destaque ativo: Verde Principal (#7F9C90)
- Textos: Off White (#F2F4F0)
- CTA principal: Amarelo (#EFC06E)

**Módulo Serviços:**
- Sidebar: Verde Escuro (#384E46)
- Destaque ativo: Mostarda (#D6A461)
- Textos: Off White (#F2F4F0)
- CTA principal: Amarelo (#EFC06E)

**Alertas Críticos:**
- Badges e bordas: Vinho (#862041)
- Erros de validação: Rosa (#EA9E95)

---

## Checklist de Validação

- [ ] Switch de módulo altera cor de destaque instantaneamente
- [ ] Alertas e Calendário removidos do menu lateral
- [ ] Ícones de Alertas e Calendário visíveis no header
- [ ] Contratos.tsx possui tabs Lista/Kanban/Calendário
- [ ] Cards críticos usam bordas/fundos em Vinho
- [ ] Tipografia do sidebar usa Off White
- [ ] Botão "Novo Contrato" em Amarelo destacado
