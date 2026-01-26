
# Plano: Adicionar Navegação Interativa aos Cards do Dashboard

## Objetivo

Tornar os cards de estatísticas do Dashboard clicáveis, permitindo que o usuário navegue diretamente para a página relevante com os dados filtrados mencionados em cada card.

---

## Mapeamento de Navegação

| Card | Destino | Filtro/Query Param |
|------|---------|-------------------|
| Contratos Ativos | `/contratos` | `?status=vigente` |
| Valor Total | `/contratos` | - (todos os contratos) |
| Vencendo em 30 dias | `/alertas` | - (mostra vencimentos) |
| Riscos Altos | `/contratos` | - (futuramente filtro de risco) |
| Fornecedores | `/fornecedores` | - |
| Valor Médio | `/contratos` | - |
| Aprovações Pendentes | `/workflows` | - |
| Tempo Médio Aprovação | `/workflows` | - |

---

## Modificações no Arquivo

### `src/pages/Dashboard.tsx`

Adicionar a prop `onClick` a cada `StatCard` para navegar para a página apropriada usando o hook `useNavigate` que já está disponível:

**Cards Principais (linhas 402-429):**

```typescript
<StatCardGrid columns={4}>
  <StatCard
    title="Contratos Ativos"
    value={stats.contratosAtivos}
    icon={FileText}
    variant="primary"
    trend={{ value: 12, label: "vs mês anterior" }}
    onClick={() => navigate("/contratos?status=vigente")}
  />
  <StatCard
    title="Valor Total"
    value={formatCompactCurrency(stats.valorTotal)}
    icon={DollarSign}
    variant="success"
    trend={{ value: 8, label: "vs mês anterior" }}
    onClick={() => navigate("/contratos")}
  />
  <StatCard
    title="Vencendo em 30 dias"
    value={stats.vencendo30Dias}
    icon={Clock}
    variant="critical"
    onClick={() => navigate("/alertas")}
  />
  <StatCard
    title="Riscos Altos"
    value={stats.riscosAltos}
    icon={AlertTriangle}
    variant="critical"
    onClick={() => navigate("/contratos")}
  />
</StatCardGrid>
```

**Cards Secundários (linhas 432-457):**

```typescript
<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
  <StatCard
    title="Fornecedores"
    value={stats.fornecedores}
    icon={Users}
    subtitle="Cadastrados"
    onClick={() => navigate("/fornecedores")}
  />
  <StatCard
    title="Valor Médio"
    value={formatCompactCurrency(stats.valorMedio)}
    icon={Activity}
    subtitle="Por contrato"
    onClick={() => navigate("/contratos")}
  />
  <StatCard
    title="Aprovações Pendentes"
    value={stats.aprovacoesPendentes}
    icon={Timer}
    subtitle="Aguardando ação"
    onClick={() => navigate("/workflows")}
  />
  <StatCard
    title="Tempo Médio Aprovação"
    value={`${stats.tempoMedioAprovacao.toFixed(1)}d`}
    icon={Target}
    subtitle={stats.tempoMedioAprovacao <= 5 ? "✓ Dentro da meta" : "⚠ Acima da meta"}
    onClick={() => navigate("/workflows")}
  />
</div>
```

---

## Comportamento Visual

O componente `StatCard` já possui estilos para estado clicável (linha 73):

```typescript
onClick && "cursor-pointer hover:border-primary/30 transition-all duration-200"
```

Isso significa que:
- O cursor mudará para `pointer` ao passar sobre o card
- Haverá uma borda sutil ao hover
- Animação de `whileHover` já existe via Framer Motion (linha 68)

---

## Consideração de Filtros

A página `/contratos` já suporta query params através do hook `useSearchParams`:

```typescript
const [searchParams] = useSearchParams();
const [filtros, setFiltros] = useState<FiltrosAvancados>({
  busca: searchParams.get("search") || "",
});
```

Para que o filtro `status=vigente` funcione corretamente, será necessário uma pequena atualização na página `Contratos.tsx` para ler o parâmetro `status` da URL:

```typescript
const [filtros, setFiltros] = useState<FiltrosAvancados>({
  busca: searchParams.get("search") || "",
  status: searchParams.get("status") || "",
});
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Adicionar `onClick` a todos os 8 StatCards |
| `src/pages/Contratos.tsx` | Ler `status` do `searchParams` para filtro automático |

---

## Resultado Esperado

- Todos os cards do Dashboard serão interativos
- Ao clicar em um card, o usuário será redirecionado para a página relevante
- Cards como "Contratos Ativos" filtrarão automaticamente por status "vigente"
- Cards como "Vencendo em 30 dias" abrirão a página de Alertas
- Cards de Fornecedores navegarão para `/fornecedores`
- Cards de Aprovações/Workflow navegarão para `/workflows`
