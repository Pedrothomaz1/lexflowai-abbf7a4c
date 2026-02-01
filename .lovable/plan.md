
# Plano: LexFlow Final Product & UX Strategy

## Visao Geral

Este plano implementa a estrategia completa de UX e posicionamento do LexFlow como "SaaS de Gestao Preventiva de Contratos", focado em gestores (nao juristas). As mudancas abrangem navegacao, landing page, dashboard, onboarding e microcopy, mantendo a arquitetura tecnica existente.

---

## 1. Reestruturacao da Navegacao (Sidebar)

### Objetivo
Reorganizar o menu lateral seguindo a logica "gestor-first", agrupando por objetivo ao inves de funcionalidade tecnica.

### Estrutura Proposta

| Grupo | Objetivo | Itens |
|-------|----------|-------|
| **Principal** | Mostrar o que exige atencao agora | Visao Geral (Dashboard), Contratos, Alertas e Prazos, Requisicoes |
| **Base** | Organizar dados fundamentais | Fornecedores, Unidades, Modelos de Contrato |
| **Automacao** | Evitar trabalho manual | Fluxos de Aprovacao |
| **Governanca** | Seguranca e controle avancado | Relatorios, Historico de Acoes, Seguranca, Protecao de Dados |
| **Configuracoes** | Controle do sistema | Usuarios e Permissoes, Notificacoes, Preferencias do Sistema |

### Mudancas Especificas

**Arquivo: `src/components/AppSidebar.tsx`**

```text
Antes                          ->  Depois
----------------------------------------------------------
Principal                      ->  Principal
  - Dashboard                      - Visao Geral
                                   - Contratos
Organizacao                       - Alertas e Prazos
  - Membros                        - Requisicoes
  - Configuracoes              
                               ->  Base
Gestao                             - Fornecedores
  - Contratos                      - Unidades
  - Franquias                      - Modelos de Contrato
  - Requisicoes                
                               ->  Automacao
Sistema                            - Fluxos de Aprovacao
  - Relatorios                 
  - Seguranca                  ->  Governanca
  - Compliance LGPD                - Relatorios
  - Trilha de Auditoria            - Historico de Acoes
  - Cadastro (submenu)             - Seguranca
  - Configuracoes (submenu)        - Protecao de Dados
                               
                               ->  Configuracoes
                                   - Usuarios e Permissoes
                                   - Notificacoes
                                   - Preferencias
```

### Novas Labels (Sem Juridiques)

| Antes | Depois |
|-------|--------|
| Dashboard | Visao Geral |
| Compliance LGPD | Protecao de Dados |
| Trilha de Auditoria | Historico de Acoes |
| Workflows | Fluxos de Aprovacao |
| Templates | Modelos de Contrato |
| Alertas | Alertas e Prazos |

---

## 2. Landing Page (Hero Section)

### Objetivo
Reposicionar a comunicacao para gestores, focando em "nao perder prazos" ao inves de "gestao juridica".

### Novo Conteudo

**Arquivo: `src/pages/Index.tsx`**

```text
ANTES:
Headline: "Gestao de Contratos Inteligente"
Subheadline: "Automatize todo o ciclo contratual em uma unica plataforma."

DEPOIS:
Headline: "Controle seus contratos. Nunca mais perca um prazo."
Subheadline: "Centralize contratos, acompanhe vencimentos e receba alertas antes que vire problema."
```

### Novos Highlights (Destaques)

```text
ANTES:
- Aprovacoes automatizadas
- Assinatura eletronica
- Alertas de vencimento

DEPOIS:
- Alertas antes do vencimento
- Dashboard de riscos em tempo real
- Sem depender do juridico
```

### Novos Features Cards

```text
ANTES:
- Gestao Completa
- Controle de Fornecedores
- Dashboards Executivos
- Seguranca e Compliance

DEPOIS:
- Nunca perca um prazo (alertas automaticos)
- Veja os riscos antes (dashboard preventivo)
- Tudo em um lugar (centralizacao)
- Controle sem juridico (autonomia para gestores)
```

### CTAs

| CTA Primario | CTA Secundario |
|--------------|----------------|
| Comecar agora | Ver como funciona |

---

## 3. Dashboard Orientado a Gestor

### Objetivo
Transformar o dashboard para mostrar "riscos e proximas acoes" em segundos, nao metricas tecnicas.

### Novos KPIs Primarios

| KPI Atual | KPI Novo | Significado para Gestor |
|-----------|----------|-------------------------|
| Contratos Ativos | Contratos a vencer | Quantos vencem em 30/60/90 dias |
| Valor Total | Valor em risco | Impacto financeiro de contratos em alerta |
| Riscos Altos | Servicos em alerta | Servicos que exigem acao imediata |
| - | Proxima acao recomendada | O que resolver agora |

### Componente: ProximaAcaoCard

Novo card que mostra a acao mais urgente:

```text
+------------------------------------------+
|  PROXIMA ACAO RECOMENDADA                |
|                                          |
|  [!] 3 contratos vencem em 7 dias        |
|      Revise e decida sobre renovacao     |
|                                          |
|  [Botao: Ver contratos]                  |
+------------------------------------------+
```

### Arquivo: `src/pages/Dashboard.tsx`

**Mudancas:**
1. Trocar `PageHeader.title` de "Dashboard Executivo" para "Visao Geral"
2. Adicionar card "Proxima Acao Recomendada"
3. Reorganizar KPIs primarios para focar em vencimentos
4. Adicionar badge de urgencia visual (vermelho/amarelo)

---

## 4. Onboarding Atualizado

### Objetivo
Alinhar mensagens do tour com a nova proposta de valor.

### Novas Mensagens

| Step | Foco | Mensagem Atual | Mensagem Nova |
|------|------|----------------|---------------|
| 1 | Dashboard | "Bem-vindo ao LexFlow! Aqui voce acompanha todos os indicadores..." | "Aqui voce ve todos os prazos e alertas importantes." |
| 2 | Criar | "Crie novos contratos ou servicos com poucos cliques..." | "Cadastre contratos para ativar alertas automaticos." |
| 3 | Alertas | "Receba alertas automaticos sobre vencimentos..." | "O sistema avisa antes que um prazo vire problema." |

### Mensagem Final

```text
"Pronto. Agora seus contratos estao sob controle."
```

### Arquivo: `src/hooks/useOnboardingTour.ts`

Atualizar `tourSteps` com novas mensagens.

---

## 5. Microcopy Orientado a Decisao

### Objetivo
Todos os textos devem indicar impacto e sugerir proxima acao, evitando jargao juridico.

### Arquivo: `src/lib/help-texts.ts`

**Regras Aplicadas:**
- Sempre indicar impacto
- Sempre sugerir proxima acao
- Evitar termos juridicos complexos
- Usar frases curtas

### Exemplos de Mudanca

| Campo | Antes | Depois |
|-------|-------|--------|
| contratosAtivos | "Contratos em vigor que geram obrigacoes e custos." | "Contratos que precisam de acompanhamento. Veja quais exigem acao." |
| vencendo30Dias | "Contratos proximos do vencimento." | "Vencem em breve. Revise e decida: renovar, renegociar ou encerrar." |
| riscosAltos | "Contratos com clausulas de alto risco identificadas por IA." | "Requerem atencao. Revise antes que virem problema." |

---

## 6. Implementacao Tecnica

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Reestruturar menu sections, renomear labels |
| `src/pages/Index.tsx` | Novo headline, subheadline, features e CTAs |
| `src/pages/Dashboard.tsx` | Trocar titulo, adicionar ProximaAcaoCard, reorganizar KPIs |
| `src/hooks/useOnboardingTour.ts` | Atualizar mensagens do tour |
| `src/lib/help-texts.ts` | Refinar microcopy de todos os campos |

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/Dashboard/ProximaAcaoCard.tsx` | Card de acao recomendada |
| `src/components/Dashboard/GestorKPIGrid.tsx` | Grid de KPIs focado em gestor |

---

## 7. Detalhes da Navegacao por Grupo

### Grupo: Principal

```javascript
{
  id: "principal",
  title: "Principal",
  icon: LayoutDashboard,
  defaultOpen: true,
  items: [
    { title: "Visao Geral", url: "/dashboard", icon: LayoutDashboard },
    { title: "Contratos", url: "/contratos", icon: FileText },
    { title: "Alertas e Prazos", url: "/alertas", icon: Bell },
    { title: "Requisicoes", url: "/requisicoes", icon: FileInput },
  ],
}
```

### Grupo: Base

```javascript
{
  id: "base",
  title: "Base",
  icon: Database,
  defaultOpen: false,
  items: [
    { title: "Fornecedores", url: "/fornecedores", icon: Users },
    { title: "Unidades", url: "/unidades", icon: Building2 },
    { title: "Modelos de Contrato", url: "/templates", icon: FileStack },
  ],
}
```

### Grupo: Automacao

```javascript
{
  id: "automacao",
  title: "Automacao",
  icon: Workflow,
  defaultOpen: false,
  items: [
    { title: "Fluxos de Aprovacao", url: "/workflows", icon: GitBranch },
  ],
}
```

### Grupo: Governanca

```javascript
{
  id: "governanca",
  title: "Governanca",
  icon: Shield,
  defaultOpen: false,
  visibility: "advanced", // Colapsar por padrao
  items: [
    { title: "Relatorios", url: "/relatorios", icon: BarChart3 },
    { title: "Historico de Acoes", url: "/audit-logs", icon: Activity },
    { title: "Seguranca", url: "/security", icon: Shield },
    { title: "Protecao de Dados", url: "/compliance", icon: ShieldCheck },
  ],
}
```

### Grupo: Configuracoes

```javascript
{
  id: "configuracoes",
  title: "Configuracoes",
  icon: Settings,
  defaultOpen: false,
  items: [
    { title: "Usuarios e Permissoes", url: "/usuarios", icon: UserCog },
    { title: "Notificacoes", url: "/notification-settings", icon: Bell },
    { title: "Preferencias", url: "/settings", icon: Settings },
  ],
}
```

---

## 8. Ordem de Execucao

1. **Fase 1: Navegacao**
   - Reestruturar AppSidebar.tsx com nova hierarquia
   - Renomear labels para linguagem de gestor
   - Mover "Franquias" para dentro de "Contratos" como submenu

2. **Fase 2: Landing Page**
   - Atualizar Index.tsx com novo headline e features
   - Trocar CTAs e highlights

3. **Fase 3: Dashboard**
   - Criar ProximaAcaoCard.tsx
   - Reorganizar KPIs primarios
   - Trocar titulo para "Visao Geral"

4. **Fase 4: Onboarding**
   - Atualizar mensagens em useOnboardingTour.ts

5. **Fase 5: Microcopy**
   - Refinar todos os textos em help-texts.ts

---

## 9. Consideracoes de UX

- **Gestor-first**: Toda decisao prioriza a experiencia do gestor
- **Orientado a acao**: Cada elemento mostra "o que fazer agora"
- **Sem juridiques**: Evitar termos como "clausulas", "obrigacoes contratuais"
- **Clareza antes de profundidade**: Informacao essencial primeiro
- **Problema + proxima acao**: Sempre mostrar o problema e o caminho

---

## 10. Metricas de Sucesso

| Metrica | Definicao |
|---------|-----------|
| Ativacao | Primeiro contrato cadastrado |
| Engajamento | Alertas ativos |
| Retencao | Uso semanal do dashboard |
| Valor realizado | Zero contratos vencidos sem aviso |

---

## 11. Componente: ProximaAcaoCard

```text
+--------------------------------------------------+
|  [!] PROXIMA ACAO                     [Vermelho] |
+--------------------------------------------------+
|                                                   |
|  "3 contratos vencem em menos de 7 dias"         |
|                                                   |
|  Revise e decida: renovar, renegociar ou         |
|  encerrar antes do prazo.                        |
|                                                   |
|  [Botao: Ver contratos urgentes]                 |
|                                                   |
+--------------------------------------------------+
```

### Logica de Priorizacao

1. Contratos vencendo em < 7 dias (critico)
2. Contratos vencendo em < 30 dias (alerta)
3. Aprovacoes pendentes > 5 dias (atencao)
4. Riscos altos sem revisao (informativo)
5. "Tudo sob controle" (quando nao ha acoes urgentes)

---

## 12. Resumo de Impacto

| Area | Antes | Depois |
|------|-------|--------|
| Posicionamento | Gestao juridica | Gestao preventiva |
| Publico | Juridico | Gestores administrativos |
| Linguagem | Termos juridicos | Linguagem de negocios |
| Navegacao | Por funcionalidade | Por objetivo |
| Dashboard | Metricas tecnicas | Acoes e riscos |
| Onboarding | Apresentacao de features | Valor e resultado |
