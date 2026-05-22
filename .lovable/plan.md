## Skill Cards no Dashboard IA

Adiciona uma nova seção no `DashboardIA.tsx` com 4 cards, um por skill jurídica, abaixo dos KPIs e acima do bloco "Top contratos por risco".

### Cards (um por skill)

1. **Revisão Cláusula-a-Cláusula** (`contract-review`)
   - Métrica: nº de contratos analisados com esta skill
   - Mini-stats: cláusulas verdes / amarelas / vermelhas (somatório)
2. **Triagem de NDA** (`nda-triage`)
   - Métrica: nº de NDAs triados
   - Mini-stats: distribuição Aprovar / Revisar / Rejeitar
3. **Mapa de Riscos** (`risk-assessment`)
   - Métrica: nº de contratos com risco mapeado
   - Mini-stats: riscos críticos + exposição total estimada (R$)
4. **Compliance** (`compliance`)
   - Métrica: nº de contratos com avaliação de compliance
   - Mini-stats: frameworks com gaps abertos (top 2)

### Comportamento

- Cada card tem botão "Ver contratos" → navega para `/contratos?skill=<slug>` (filtro de skill já será respeitado pela página de lista; se ainda não existir, basta query string sem efeito por enquanto — não escopo desta etapa).
- Card vazio (sem dados) mostra mensagem amigável "Nenhum contrato analisado com esta skill ainda".
- Loading com `Skeleton`.

### Dados

Nova query única a `contract_analysis` agrupando por `skill_aplicada` e extraindo `payload_estruturado`:

```ts
supabase.from("contract_analysis")
  .select("contrato_id, skill_aplicada, payload_estruturado, created_at")
  .not("skill_aplicada", "is", null)
  .order("created_at", { ascending: false })
  .limit(1000);
```

Agregação client-side por skill (último registro por contrato+skill), reaproveitando o padrão do `ultimosResumos`.

### Visual

- Grid `md:grid-cols-2 lg:grid-cols-4`
- Header com ícone próprio por skill (FileSearch, ShieldAlert, TrendingUp, ScrollText)
- Cor de destaque sutil por skill (usando tokens semânticos existentes — sem cores hardcoded)
- Mini-stats em linha com `Badge` pequenos

### Fora de escopo

- Filtro real por skill na página `/contratos` (apenas a query string fica preparada)
- Drill-down com modal
- Edição de DashboardIA além desta seção
