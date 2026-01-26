

## Plano Consolidado: Seletor de Módulo no Header + Remoção de "Pagamentos Pendentes"

---

## Parte 1: Seletor de Módulo no Header da Sidebar

### Objetivo

Permitir que usuários com acesso a ambos os módulos possam trocar diretamente clicando no Badge do módulo atual no header, sem precisar usar o componente separado abaixo.

---

### Mudanças na Interface

**Antes:**
```text
[Logo] LexFlow
       Contratos ← badge estático

[Bloco separado de Module Switcher]
```

**Depois:**
```text
[Logo] LexFlow
       Contratos ▼ ← badge clicável com chevron (abre dropdown)
       
[Dropdown]
● Contratos
○ Serviços

(Bloco separado removido)
```

---

### Comportamento por Tipo de Usuário

| Usuário | Comportamento |
|---------|--------------|
| Acesso a 1 módulo | Badge estático (sem interação) |
| Acesso a ambos | Badge clicável com chevron, abre dropdown |

---

### Implementação Técnica (AppSidebar.tsx)

#### 1. Adicionar import `Check` ao lucide-react

```typescript
import { ..., Check, ChevronDown } from "lucide-react";
```

#### 2. Transformar Badge em DropdownMenu no SidebarHeader (linhas 182-196)

```typescript
{!collapsed && (
  <div className="flex flex-col">
    <span className="text-sm font-semibold text-sidebar-foreground">LexFlow</span>
    
    {moduloPadrao === "ambos" ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 mt-0.5 group focus:outline-none">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-2xs cursor-pointer transition-colors",
                moduloAtivo === "contratos" 
                  ? "bg-[hsl(153_13%_56%/0.2)] text-[hsl(153_13%_70%)]" 
                  : "bg-[hsl(35_58%_61%/0.2)] text-[hsl(35_58%_75%)]"
              )}
            >
              {moduloLabels[moduloAtivo]}
              <ChevronDown className="h-3 w-3 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem 
            onClick={() => handleModuloChange("contratos")}
            className="flex items-center justify-between"
          >
            <span>Contratos</span>
            {moduloAtivo === "contratos" && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleModuloChange("servicos")}
            className="flex items-center justify-between"
          >
            <span>Serviços</span>
            {moduloAtivo === "servicos" && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Badge 
        variant="secondary" 
        className={cn(
          "text-2xs w-fit mt-0.5",
          moduloAtivo === "contratos" 
            ? "bg-[hsl(153_13%_56%/0.2)] text-[hsl(153_13%_70%)]" 
            : "bg-[hsl(35_58%_61%/0.2)] text-[hsl(35_58%_75%)]"
        )}
      >
        {moduloLabels[moduloAtivo]}
      </Badge>
    )}
  </div>
)}
```

#### 3. Criar função handleModuloChange

```typescript
const handleModuloChange = (novoModulo: ModuloAtivo) => {
  if (novoModulo === moduloAtivo) return;
  setModuloAtivo(novoModulo);
  navigate(novoModulo === "contratos" ? "/dashboard" : "/servicos");
};
```

#### 4. Remover Module Switcher redundante

Remover o bloco separado (linhas 202-227):
```typescript
// REMOVER este bloco inteiro
{moduloPadrao === "ambos" && !collapsed && (
  <div className="mx-3 mb-4 p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
    ...
  </div>
)}
```

---

## Parte 2: Remoção de "Pagamentos Pendentes"

### Contexto

O fluxo LexFlow termina quando um email é enviado ao financeiro. O sistema não controla pagamentos - isso é feito no ERP/sistema financeiro da empresa.

---

### Mudanças na Página Obrigacoes.tsx

#### 1. Substituir Card "Pagamentos Pendentes" por "Por Tipo"

**Antes (linhas 433-446):**
```typescript
<AnimatedCard>
  <AnimatedCardContent className="p-6">
    <h3>Pagamentos Pendentes</h3>
    <DollarSign />
    <span>{formatCurrency(stats.valorTotal)}</span>
    <p>Total em pagamentos a realizar</p>
  </AnimatedCardContent>
</AnimatedCard>
```

**Depois:**
```typescript
<AnimatedCard>
  <AnimatedCardContent className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold">Distribuição por Tipo</h3>
      <Filter className="h-5 w-5 text-primary" />
    </div>
    <div className="flex flex-wrap gap-2">
      {Object.entries(tipoConfig).map(([tipo, config]) => {
        const count = obligations.filter(o => o.tipo === tipo && o.status !== "concluido").length;
        if (count === 0) return null;
        const Icon = config.icon;
        return (
          <Badge key={tipo} variant="outline" className="gap-1.5">
            <Icon className={`h-3 w-3 ${config.color}`} />
            {config.label}: {count}
          </Badge>
        );
      })}
    </div>
  </AnimatedCardContent>
</AnimatedCard>
```

#### 2. Atualizar tipoConfig - Renomear "pagamento" para "comunicacao"

**Antes (linhas 67-73):**
```typescript
const tipoConfig = {
  pagamento: { label: "Pagamento", icon: DollarSign, color: "text-emerald-600" },
  ...
};
```

**Depois:**
```typescript
const tipoConfig = {
  comunicacao: { label: "Comunicação", icon: Send, color: "text-emerald-600" },
  entrega: { label: "Entrega", icon: FileCheck, color: "text-blue-600" },
  relatorio: { label: "Relatório", icon: FileText, color: "text-purple-600" },
  renovacao: { label: "Renovação", icon: RefreshCw, color: "text-amber-600" },
  notificacao: { label: "Notificação", icon: Bell, color: "text-rose-600" },
  // Retrocompatibilidade: mapear "pagamento" antigo
  pagamento: { label: "Comunicação", icon: Send, color: "text-emerald-600" },
};
```

#### 3. Remover cálculo de valorTotal dos stats

**Remover (linhas 242-244):**
```typescript
valorTotal: obligations
  .filter(o => o.status !== "concluido" && o.tipo === "pagamento")
  .reduce((sum, o) => sum + (o.valor || 0), 0),
```

#### 4. Atualizar filtro de tipos (linhas 470-476)

**Antes:**
```typescript
<SelectItem value="pagamento">Pagamento</SelectItem>
```

**Depois:**
```typescript
<SelectItem value="comunicacao">Comunicação</SelectItem>
```

#### 5. Manter coluna "Valor" como referência (opcional)

A coluna "Valor" pode continuar existindo para exibir valores de referência quando houver, sem a métrica de "Pagamentos Pendentes".

---

## Resumo de Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/AppSidebar.tsx` | Badge clicável com dropdown, remover Module Switcher separado |
| `src/pages/Obrigacoes.tsx` | Card "Por Tipo", atualizar tipoConfig, remover valorTotal |

---

## Resultado Esperado

### Sidebar
- Badge do módulo no header é clicável para usuários com acesso a ambos
- Dropdown mostra opções com indicador visual do módulo ativo
- Interface mais limpa sem componente duplicado

### Obrigações
- Sem métricas de "Pagamentos Pendentes" que não fazem sentido no contexto
- Card mostra distribuição por tipo de obrigação
- Tipo "Comunicação" substitui "Pagamento" (retrocompatível)
- Foco no fluxo real: gestão de contratos, não controle financeiro

