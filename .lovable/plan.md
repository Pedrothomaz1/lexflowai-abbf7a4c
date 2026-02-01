
# Plano: Reorganização de Contratos, Franquias e Menu Principal

## Contexto

O sistema gerencia dois tipos de registros distintos:
1. **Contratos de Serviços** - Contratos com terceiros/fornecedores externos
2. **Franquias** - Contratos internos de franqueados do grupo

Atualmente há problemas de UX que confundem o usuário.

---

## Problemas Identificados

### 1. Franquias como Submenu de Contratos
O link para "Franquias" está escondido dentro do menu "Contratos", sugerindo erroneamente que franquias são um tipo de contrato.

### 2. Ordem do Menu não Reflete Fluxo de Trabalho
"Alertas e Prazos" aparece antes de "Requisições", mas Requisições são ações ativas enquanto Alertas são monitoramento passivo.

### 3. Dashboard sem Visão de Franquias
A Visão Geral mostra apenas métricas de contratos de terceiros, ignorando as franquias.

### 4. Nomenclatura Genérica
"Contratos" pode confundir (contrato de serviço vs franquia).

---

## Solução Proposta

### Fase 1: Reorganização do Menu Lateral

**Antes:**
```
Principal
├─ Visão Geral
├─ Contratos
│  ├─ Novo Contrato
│  └─ Franquias         ← Escondido
├─ Alertas e Prazos
└─ Requisições
```

**Depois:**
```
Principal
├─ Visão Geral
├─ Contratos de Serviço  ← Renomeado
├─ Franquias             ← Promovido
├─ Requisições           ← Subiu (ação ativa)
└─ Alertas e Prazos      ← Desceu (monitoramento)
```

**Arquivo:** `src/components/AppSidebar.tsx`

**Alterações:**
- Renomear "Contratos" para "Contratos de Serviço"
- Remover "Franquias" do submenu de Contratos
- Adicionar "Franquias" como item principal (ícone Building2)
- Inverter ordem de "Requisições" e "Alertas e Prazos"

---

### Fase 2: Dashboard com Seção de Franquias

Adicionar nova seção de KPIs de Franquias no Dashboard:

```
┌─────────────────────────────────────────────────────────┐
│ CONTRATOS DE SERVIÇO                                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Total   │ │ Ativos  │ │ A Vencer│ │ Valor   │        │
│ │   45    │ │   38    │ │    5    │ │ R$ 2.3M │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────┤
│ FRANQUIAS                           [cor mostarda]      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │ Ativas  │ │ A Vencer│ │Renovação│                    │
│ │   12    │ │    2    │ │    1    │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**Arquivo:** `src/pages/Dashboard.tsx`

**Alterações:**
- Adicionar query para buscar franquias
- Criar seção visual com cor mostarda
- Exibir KPIs: Total ativas, Próximas ao vencimento, Em renovação

---

### Fase 3: Distinção Visual

| Elemento | Contratos de Serviço | Franquias |
|----------|---------------------|-----------|
| Cor de destaque | Verde Principal | Mostarda |
| Ícone | FileText | Building2 |
| Badge | "Serviço" | "Franquia" |
| Botão CTA | "Novo Contrato de Serviço" | "Nova Franquia" |

---

### Fase 4: Página de Contratos - Clareza

**Arquivo:** `src/pages/Contratos.tsx`

**Alterações:**
- Título: "Contratos de Serviço" (não apenas "Contratos")
- Descrição: "Gestão de contratos com fornecedores e terceiros"
- Botão: "Novo Contrato de Serviço"

---

### Fase 5: Página de Franquias - Quick Stats

**Arquivo:** `src/pages/Franquias.tsx`

**Alterações:**
- Adicionar quick stats no header (igual estilo do dashboard)
- Cards: Ativas | A Vencer em 90 dias | Em Renovação

---

## Estrutura de Menu Final

```text
┌─────────────────────────────────────┐
│ PRINCIPAL                           │
├─────────────────────────────────────┤
│ ● Visão Geral                       │
│ ● Contratos de Serviço              │
│ ● Franquias                         │
│ ● Requisições                       │
│ ● Alertas e Prazos                  │
├─────────────────────────────────────┤
│ BASE                                │
├─────────────────────────────────────┤
│ ● Fornecedores                      │
│ ● Unidades                          │
│ ● Modelos de Contrato               │
└─────────────────────────────────────┘
```

---

## Resumo Técnico

| Arquivo | Alterações |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Promover Franquias, renomear Contratos, inverter Requisições/Alertas |
| `src/pages/Dashboard.tsx` | Adicionar seção de KPIs de Franquias com cor mostarda |
| `src/pages/Contratos.tsx` | Atualizar título/descrição para "Contratos de Serviço" |
| `src/pages/Franquias.tsx` | Adicionar quick stats no header |

---

## Benefícios

1. **Clareza imediata**: Usuário sabe exatamente onde está e o que gerencia
2. **Fluxo lógico**: Requisições próximas de Contratos (ação), Alertas ao final (monitoramento)
3. **Visão completa**: Dashboard mostra ambos os universos (Serviços + Franquias)
4. **Consistência visual**: Cores e ícones distintos em todo o sistema
