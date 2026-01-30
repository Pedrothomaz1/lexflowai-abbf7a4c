

# Plano: Tooltips Contextuais de Ajuda

## Objetivo
Adicionar ícones de ajuda (?) ao lado de funcionalidades importantes que mostram explicações ao passar o mouse, ajudando usuários a entender o sistema sem necessidade de documentação externa.

---

## Abordagem

Criar um componente reutilizável `HelpTooltip` que pode ser facilmente adicionado ao lado de qualquer elemento do sistema. O componente exibirá um ícone de interrogação que, ao hover, mostra uma explicação contextual.

---

## Arquivos a Criar

| Arquivo | Descrição | Linhas |
|---------|-----------|--------|
| `src/components/ui/help-tooltip.tsx` | Componente reutilizável de tooltip de ajuda | ~50 |
| `src/lib/help-texts.ts` | Centralizador de todos os textos de ajuda (fácil manutenção) | ~200 |

---

## Arquivos a Modificar

| Arquivo | Alteração | Linhas afetadas |
|---------|-----------|-----------------|
| `src/components/ui/stat-card.tsx` | Adicionar prop `helpText` opcional | ~10 |
| `src/pages/Dashboard.tsx` | Adicionar tooltips nos KPIs | ~20 |
| `src/pages/Contratos.tsx` | Adicionar tooltips nos filtros e ações | ~15 |
| `src/components/ui/page-header.tsx` | Adicionar prop `helpText` opcional | ~10 |

---

## Componente HelpTooltip

```text
+------------------------------------------+
|  Contratos Ativos (?)                    |
|         |                                |
|         v                                |
|  +--------------------------------+      |
|  | Total de contratos com status |      |
|  | "vigente" no sistema.         |      |
|  +--------------------------------+      |
+------------------------------------------+
```

**Características:**
- Ícone `HelpCircle` do Lucide
- Cor sutil (muted-foreground)
- Tamanho pequeno (14px)
- Tooltip aparece ao hover
- Posicionamento automático (cima/baixo/lados)
- Atraso de 200ms para não atrapalhar

---

## Textos de Ajuda Centralizados

Todos os textos ficam em um único arquivo para fácil manutenção:

```text
src/lib/help-texts.ts

├── dashboard
│   ├── contratosAtivos: "Total de contratos vigentes..."
│   ├── valorTotal: "Soma dos valores de todos os contratos..."
│   ├── vencendo30Dias: "Contratos que vencem nos próximos 30 dias..."
│   └── riscosAltos: "Contratos com score de risco >= 7..."
│
├── contratos
│   ├── filtroStatus: "Filtre por status: Vigente, Encerrado..."
│   ├── filtroTipo: "Tipo de contrato: Prestação de serviços..."
│   ├── importar: "Importe contratos via planilha XLSX..."
│   └── kanban: "Visualize contratos organizados por status..."
│
├── fornecedores
│   ├── cnpj: "CNPJ é obrigatório para pessoas jurídicas..."
│   └── categorias: "Categorize fornecedores por tipo de serviço..."
│
├── workflows
│   ├── niveis: "Defina até 3 níveis de aprovação..."
│   └── aprovadores: "Usuários que podem aprovar contratos..."
│
└── seguranca
    ├── 2fa: "Autenticação em dois fatores aumenta a segurança..."
    └── auditoria: "Registro de todas as ações no sistema..."
```

---

## Exemplo de Uso

**Antes (sem ajuda):**
```tsx
<StatCard
  title="Contratos Ativos"
  value={stats.contratosAtivos}
  icon={FileText}
/>
```

**Depois (com tooltip de ajuda):**
```tsx
<StatCard
  title="Contratos Ativos"
  value={stats.contratosAtivos}
  icon={FileText}
  helpText={helpTexts.dashboard.contratosAtivos}
/>
```

---

## Cobertura de Tooltips

### Dashboard
- Todos os KPIs (8 cards)
- Gráficos (evolução, tipos, riscos)
- Indicadores de SLA

### Contratos
- Filtros avançados
- Modos de visualização (Lista/Kanban/Calendário)
- Ações (Novo/Importar/Exportar)

### Fornecedores
- Campos de cadastro (CNPJ/CPF)
- Categorias de serviço

### Workflows
- Níveis de aprovação
- Status de aprovação

### Configurações
- 2FA
- Notificações
- Assinatura eletrônica

---

## Benefícios

1. **Zero manutenção de screenshots** - Apenas texto
2. **Ajuda contextual** - Aparece onde o usuário precisa
3. **Não intrusivo** - Só aparece no hover
4. **Fácil atualização** - Textos centralizados
5. **Consistente** - Mesmo componente em todo o sistema

---

## Estimativa

- **Arquivos novos**: 2
- **Arquivos modificados**: 4
- **Mensagens estimadas**: 2-3 créditos

