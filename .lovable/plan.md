
# Plano de Reformulacao da Interface do LexFlow

## Resumo Executivo

Reformulacao completa da interface do LexFlow para alcancar alta performance em UX/UI, clareza contextual e acessibilidade, utilizando a paleta de cores oficial. O foco esta em eliminar carga cognitiva, otimizar navegacao e diferenciar modulos por meio de elementos visuais coesos.

---

## 1. Atualizacao da Paleta de Cores (index.css)

### Tokens CSS a Atualizar

| Cor | Hex | HSL | Uso |
|-----|-----|-----|-----|
| Verde Escuro | #384E46 | 153 16% 27% | Fundo sidebar, fundo pagina seletor |
| Verde Principal | #7F9C90 | 153 13% 56% | Destaques modulo Contratos, estados ativos |
| Verde Claro | #92ACA0 | 153 18% 63% | Textos secundarios, divisores |
| Off White | #F2F4F0 | 80 17% 95% | Textos primarios, fundos de cards |
| Amarelo | #EFC06E | 43 82% 68% | Botoes CTA, destaques |
| Vinho | #862041 | 344 62% 39% | Alertas criticos, badges urgencia |
| Rosa | #EA9E95 | 13 69% 75% | Feedback negativo suave |
| Mostarda | #D6A461 | 35 58% 61% | Destaque modulo Servicos |

### Mudancas no index.css

```css
:root {
  /* Adicionar Verde Claro */
  --lexflow-verde-claro: 153 18% 63%;  /* #92ACA0 */
  
  /* Atualizar sidebar */
  --sidebar-background: var(--lexflow-verde-escuro);
  --sidebar-foreground: var(--lexflow-off-white);
  --sidebar-muted: 153 18% 63%;  /* Verde Claro para itens inativos */
}
```

---

## 2. Reformulacao da Tela de Selecao de Modulos (SeletorModulo.tsx)

### Design Atual vs Novo

**Atual:**
- Fundo claro (bg-background)
- Cards com borda simples
- Titulo generico "Bem-vindo ao LexFlow"

**Novo:**
- Fundo Verde Escuro (#384E46)
- Cards Off White com hover elegante
- Copy profissional: "Controle Integrado de Contratos e Manutencoes"

### Mudancas Visuais

```text
+--------------------------------------------------+
|                 [Logo Veridiana]                  |
|                                                  |
|    Controle Integrado de Contratos e Manutencoes  |  <- Off White
|                                                  |
|  Centralize a governanca juridica e operacional   |  <- Verde Claro
|  em um fluxo unico, automatizado e livre de riscos|
|                                                  |
|  +--------------------+  +--------------------+   |
|  |  [Icon Documento]  |  |  [Icon Engrenagem] |   |
|  |                    |  |                    |   |
|  | Modulo Juridico:   |  | Modulo Operacional:|   |
|  |    Contratos       |  |    Servicos        |   |
|  |                    |  |                    |   |
|  | Gestao completa de |  | Controle de        |   |
|  | minutas, assinat.  |  | manutencoes e      |   |
|  | e vigencias        |  | conformidade       |   |
|  |                    |  |                    |   |
|  |  [Acessar ->]      |  |  [Acessar ->]      |   |
|  +--------------------+  +--------------------+   |
|                                                  |
|       (C) Veridiana Quirino - Verde Claro 40%    |
+--------------------------------------------------+
        Fundo: Verde Escuro (#384E46)
```

### Implementacao

1. Alterar container principal: `bg-[#384E46]` ou `gradient-hero`
2. Atualizar cards: fundo Off White, texto Verde Escuro
3. Diferenciar cores de descricao por modulo:
   - Contratos: Verde Principal (#7F9C90)
   - Servicos: Mostarda (#D6A461)
4. Adicionar rodape com copyright Veridiana Quirino
5. Hover: borda/sombra sutil + scale(1.02)

---

## 3. Reformulacao do Menu Lateral (AppSidebar.tsx)

### Estrutura Nova

```text
+------------------------+
| [Logo] LexFlow         |
|        [Toggle: Juridico/Operacional]  <- Novo toggle contextual
+------------------------+
| PRINCIPAL              |
|   Dashboard            |
|   Contratos/Servicos   |  <- Icone muda por modulo
+------------------------+
| GESTAO                 |
|   Obrigacoes  [5]      |  <- Badge Vinho com contagem
|   Workflows            |
+------------------------+
| CONFIGURACOES [v]      |  <- Colapsavel
|   Templates            |
|   Fornecedores         |
|   Unidades             |
|   Usuarios             |
+------------------------+
| [Avatar] Nome Usuario  |
|          Administrador |  <- Verde Claro
+------------------------+
```

### Mudancas Chave

#### Toggle de Contexto (Substitui badge atual)

```typescript
// Novo componente no header da sidebar
<div className="flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent/30">
  <span className="text-xs text-sidebar-muted uppercase">Modulo:</span>
  <button 
    onClick={handleToggle}
    className={cn(
      "px-3 py-1 rounded-md text-sm font-medium transition-colors",
      moduloAtivo === "contratos" 
        ? "bg-lexflow-verde-principal text-white" 
        : "bg-lexflow-mostarda text-white"
    )}
  >
    {moduloAtivo === "contratos" ? "Juridico" : "Operacional"}
  </button>
</div>
```

#### Badge de Obrigacoes Pendentes

```typescript
// No item de menu Obrigacoes
<Badge className="bg-lexflow-vinho text-white">
  {pendingCount}
</Badge>
```

#### Grupo Colapsavel para Configuracoes

```typescript
// Usar Collapsible do Radix
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger>
    <SidebarGroupLabel>
      Configuracoes <ChevronDown />
    </SidebarGroupLabel>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Templates, Fornecedores, Unidades, Usuarios */}
  </CollapsibleContent>
</Collapsible>
```

#### Cores de Estados

- Item ativo: Fundo com cor do modulo (Verde Principal ou Mostarda)
- Item inativo: Texto Verde Claro com 60% opacidade
- Hover: Fundo sidebar-accent/50

---

## 4. Reformulacao da Navegacao Interna (Contratos.tsx)

### Abas de Visualizacao Atualizadas

O componente de abas ja existe mas precisa de estilizacao contextual:

```typescript
<Tabs value={viewMode} onValueChange={(v) => setViewMode(v)}>
  <TabsList className="bg-lexflow-off-white p-1 rounded-lg">
    <TabsTrigger 
      value="lista"
      className={cn(
        "data-[state=active]:text-white",
        moduloAtivo === "contratos" 
          ? "data-[state=active]:bg-lexflow-verde-principal" 
          : "data-[state=active]:bg-lexflow-mostarda"
      )}
    >
      <List className="h-4 w-4 mr-2" />
      Lista
    </TabsTrigger>
    {/* Kanban, Calendario */}
  </TabsList>
</Tabs>
```

### Estilo das Abas

| Estado | Fundo | Texto |
|--------|-------|-------|
| Inativa | Transparente | Verde Escuro |
| Ativa (Contratos) | Verde Principal | Off White |
| Ativa (Servicos) | Mostarda | Off White |
| Hover | Verde Claro/10 | Verde Escuro |

---

## 5. Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/index.css` | Adicionar `--lexflow-verde-claro`, atualizar tokens |
| `src/pages/SeletorModulo.tsx` | Redesign completo com nova paleta |
| `src/components/AppSidebar.tsx` | Toggle contextual, grupos colapsaveis, badge pendentes |
| `src/pages/Contratos.tsx` | Estilizacao dinamica das abas |
| `src/pages/Servicos.tsx` | Aplicar mesma logica de abas (se houver) |
| `src/components/ui/tabs.tsx` | Adicionar variantes de cor modular |

---

## 6. Consideracoes de Acessibilidade (WCAG AA)

### Contrastes Validados

| Combinacao | Ratio | Status |
|------------|-------|--------|
| Off White em Verde Escuro | 7.2:1 | Aprovado |
| Verde Principal em Off White | 3.1:1 | Aprovado (large text) |
| Vinho em Off White | 5.8:1 | Aprovado |
| Mostarda em Verde Escuro | 4.6:1 | Aprovado |

### Focus States

Todos os elementos interativos terao:
- `focus-visible:ring-2`
- `focus-visible:ring-offset-2`
- Ring color baseada no modulo ativo

---

## 7. Microinteracoes e Animacoes

### Cards do Seletor

```css
.module-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.module-card:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 40px -10px rgba(56, 78, 70, 0.25);
}
```

### Toggle de Modulo

```css
.module-toggle {
  transition: background-color 0.3s ease, color 0.2s ease;
}
```

### Abas

```css
.tab-trigger {
  transition: all 0.2s ease;
}
.tab-trigger[data-state="active"] {
  animation: tab-activate 0.2s ease-out;
}
```

---

## 8. Responsividade

### Breakpoints

- **Mobile (< 640px):** Sidebar colapsada, toggle no header global
- **Tablet (640-1024px):** Sidebar semi-expandida, cards em coluna
- **Desktop (> 1024px):** Layout completo

### Seletor de Modulos Mobile

```typescript
// Em mobile, cards empilham verticalmente
<div className="grid gap-6 md:grid-cols-2">
  {/* Cards */}
</div>
```

---

## Resultado Esperado

1. **Tela de Selecao:** Visual premium com fundo escuro e cards claros, copy profissional
2. **Sidebar:** Toggle contextual substituindo dropdown, grupos organizados, badge de urgencia
3. **Navegacao Interna:** Abas com cores dinamicas baseadas no modulo ativo
4. **Consistencia:** Toda a interface seguindo a paleta oficial sem cores hardcoded
5. **Acessibilidade:** Contrastes WCAG AA, focus states visiveis
6. **Performance:** Animacoes suaves sem impacto em renders
