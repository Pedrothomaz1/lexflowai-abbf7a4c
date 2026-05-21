# Home LexFlow — Dashboard executivo + operacional

Substituir `src/pages/Dashboard.tsx` (688 linhas, hoje misturando KPIs de franquias/CNPJ/SLA) por uma home unificada com seções condicionais por role, KPIs ao vivo, filtros globais persistentes, realtime de aprovações/alertas e saved views.

## Decisões de arquitetura

**Visão por perfil:** Dashboard único. Blocos exibidos via `<Can permission=...>` + `<RoleGate>`. Executivos (`administrador`) veem KPI row + riscos + gráficos macro. Jurídico/operação (`consultoria_juridica`, `analista_juridico`) veem adicionalmente pipeline, aprovações pendentes, obrigações vencidas. Sem rotas duplicadas, sem toggle manual.

**Agregação de KPIs (best practice escolhida):** RPC functions dedicadas por KPI/seção, com `SECURITY DEFINER` + filtro `organization_id = current_user_org()`. Vantagens: drill-down flexível, params de filtro (período/área/tipo/status/responsável/fornecedor), cache no frontend via React Query, sem cron nem stale data. Views materializadas ficam para fase 2 quando o volume justificar.

**Filtros persistentes (best practice escolhida):** URL params (`?periodo=30d&area=...`) como fonte primária — compartilháveis, deep-linkable, navegação browser funciona. Saved views ficam em nova tabela `dashboard_saved_views` (per-user, opcionalmente compartilháveis no tenant). `localStorage` guarda só "última view aberta" para restaurar ao voltar.

**Realtime:** canal Supabase Realtime em `contract_approvals`, `contract_alerts`, `contract_obligations` filtrado por `organization_id`. Invalida React Query keys correspondentes.

**Telemetria:** tabela `product_events` (event_name, user_id, organization_id, properties jsonb) registrando `dashboard_view`, `kpi_drill_down`, `filter_applied`, `saved_view_loaded`.

## Backend (migration)

### Novas tabelas
- `dashboard_saved_views` — `id`, `organization_id`, `user_id`, `nome`, `filtros jsonb`, `is_shared bool`, `created_at`. RLS: select próprio OU shared do tenant; CRUD só do dono.
- `product_events` — `id`, `organization_id`, `user_id`, `event_name`, `properties jsonb`, `created_at`. RLS: insert tenant-bound, select admin only.

### RPC functions (todas `SECURITY DEFINER`, `SET search_path = public`, com check `organization_id = current_user_org()`)
Aceitam params: `p_periodo_inicio date`, `p_periodo_fim date`, `p_area text[]`, `p_tipo contract_type[]`, `p_status text[]`, `p_responsavel uuid[]`, `p_fornecedor uuid[]`. Todos retornam `{ valor, delta_pct, serie jsonb }` quando aplicável.

- `dash_kpi_contratos_ativos(filtros)` — count `contratos` status='ativo'
- `dash_kpi_requisicoes_abertas(filtros)` — count `contract_requests` status in (pendente,em_analise)
- `dash_kpi_aprovacoes_pendentes(filtros)` — count `contract_approvals` status='pendente'
- `dash_kpi_obrigacoes_atraso(filtros)` — count `contract_obligations` data_vencimento < now() AND status != 'concluido'
- `dash_kpi_renovacoes_30d(filtros)` — count `contratos` data_fim between now() and now()+30d
- `dash_kpi_tempo_medio_assinatura(filtros)` — avg(data_assinatura - created_at) em `contratos`
- `dash_pipeline_contratual(filtros)` — agrupado por status para gráfico de barras
- `dash_prazos_criticos(filtros)` — lista contratos/obrigações próximas vencimento, ordenado por urgência
- `dash_contratos_risco(filtros)` — join `contratos` + `contract_analysis` ordenado por score_risco desc
- `dash_demandas_por_area(filtros)` — agrupamento por `departamento` em `contract_requests`
- `dash_aprovacoes_acao(filtros)` — `contract_approvals` pendentes do usuário atual
- `dash_obrigacoes_vencidas(filtros)` — `contract_obligations` vencidas + próximas 7d
- `dash_evolucao_temporal(filtros, p_metrica)` — série temporal mensal para gráfico de linha

## Frontend

### Estrutura
```
src/pages/Dashboard.tsx               (rewrite, ~200 linhas, orquestrador)
src/components/Dashboard/
  DashboardHeader.tsx                 (contexto tenant + saved view ativa)
  DashboardFilters.tsx                (chips + dropdowns, sincroniza URL)
  SavedViewsMenu.tsx                  (CRUD de saved views)
  KPIRow.tsx                          (grid responsivo dos 6 KPIs)
  KPICard.tsx                         (ícone, valor, delta, drill-down link)
  sections/
    PipelineContratualSection.tsx     (Recharts BarChart)
    PrazosCriticosSection.tsx         (tabela)
    ContratosRiscoSection.tsx         (tabela com badges)
    DemandasPorAreaSection.tsx        (gráfico + breakdown)
    AprovacoesAcaoSection.tsx         (cards acionáveis, realtime)
    ObrigacoesVencidasSection.tsx     (lista com badges, realtime)
    EvolucaoTemporalSection.tsx       (Recharts LineChart)
  EmptyOnboardingState.tsx            (quando tenant sem dados)
```

### Hooks
- `src/hooks/useDashboardFilters.ts` — sincroniza URL ↔ estado, gerencia chips, restaura última view do localStorage.
- `src/hooks/useDashboardKPIs.ts` — React Query, chama RPCs em paralelo, retorna `{ data, isLoading, error }` por KPI.
- `src/hooks/useSavedViews.ts` — CRUD em `dashboard_saved_views`.
- `src/hooks/useDashboardRealtime.ts` — subscribe nas 3 tabelas, invalida queries.
- `src/lib/analytics.ts` — helper `trackEvent(name, props)` insere em `product_events`.

### Regras de exibição (via `<Can>` / `<RoleGate>`)
- KPIs Contratos Ativos, Renovações 30d, Tempo Médio Assinatura, Evolução Temporal: todos os perfis autenticados do tenant.
- KPIs Requisições Abertas, Aprovações Pendentes, Obrigações em Atraso + seções Pipeline, Prazos Críticos, Aprovações que Exigem Ação, Obrigações Vencidas: `analista_juridico`, `consultoria_juridica`, `administrador`.
- Seção Contratos com Maior Risco + Demandas por Área: `consultoria_juridica`, `administrador` (executivo).
- CTAs "Ver todos em risco" e "Abrir fila de aprovações": só quando seção visível.

### Estados
- Loading: `<Skeleton>` por card/seção (não tela inteira).
- Erro: `<ErrorState>` por seção, sem derrubar dashboard.
- Vazio sem dados no tenant: `<EmptyOnboardingState>` com CTAs (Criar primeiro contrato, Importar planilha, Convidar equipe).
- Tenant suspenso: `<SuspendedBanner>` já existe no layout.

### Filtros
Chips inline + popovers: Período (presets 7d/30d/90d/YTD/custom), Área (multi), Tipo (multi enum), Status (multi), Responsável (multi user picker), Fornecedor (multi async search). Botão "Salvar como saved view" + dropdown de views salvas. Reset clears URL params.

### Drill-down
Cada KPI/linha de tabela navega para rota correspondente com filtros propagados via URL params: `/contratos?status=ativo&periodo=30d`, `/aprovacoes?status=pendente`, `/obrigacoes?vencidas=true`, etc.

## Arquivos afetados

**Novos (15):** 1 migration, 2 hooks (filters, kpis, savedviews, realtime), 1 lib (analytics), 11 componentes (header, filters, savedviewsmenu, kpirow, kpicard, 7 sections, empty state).

**Editados (2):** `src/pages/Dashboard.tsx` (rewrite completo), `src/App.tsx` (nenhuma rota nova — `/dashboard` já existe).

**Preservados:** componentes legados de `src/components/Dashboard/` (FranquiasKPIGrid, GestorKPIGrid, etc.) ficam disponíveis para reuso em `/franquias` se já forem referenciados lá — verificarei na implementação e removerei só os que não tiverem outras referências.

## Fora de escopo (fase 2)
- Views materializadas com refresh cron
- Saved views compartilhadas com permissão granular
- Export PDF do dashboard
- Comparação entre períodos no mesmo gráfico
