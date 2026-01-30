

# Plano: Módulo de Gestão de Franquias

## Contexto

A tabela `Lexflow_-_Tabela_de_Controle_de_Franquias.xlsx` contém dados específicos de franqueadas do Grupo Veri que **NÃO** se encaixam nas tabelas existentes. As franquias têm um workflow único de contratos com campos específicos como:

- Regime Tributário
- Status de Vigência
- Workflow de Renovação (Consultora informada? → Renovação aceita? → Contrato enviado? → Contrato assinado?)
- Controle de NF de renovação

**Tabelas Existentes Relevantes:**
- `contratos` - Contratos gerais (não adequado para franquias)
- `fornecedores` - Fornecedores (franquias são **clientes**, não fornecedores)
- Não existe tabela `franquias`

## Arquitetura Proposta

### Nova Tabela: `franquias`

```text
+------------------------------------------+
|                FRANQUIAS                  |
+------------------------------------------+
| id (uuid, PK)                             |
| nome_completo (text)                      |
| cnpj (text)                               |
| regime_tributario (text)                  |
| status_contrato (text)                    |  -> 'pendente_assinatura', 'assinado', 'vigente', 'vencido', 'encerrado'
| data_assinatura (date)                    |
| data_termino (date)                       |
| status_vigencia (text)                    |  -> 'ativo', 'proximo_vencer', 'vencido', 'renovado'
| consultora_informada (boolean)            |  Workflow step 1
| renovacao_aceita (boolean)                |  Workflow step 2
| novo_contrato_enviado (boolean)           |  Workflow step 3
| contrato_novo_assinado (boolean)          |  Workflow step 4
| data_emissao_nf (date)                    |
| numero_nf (text)                          |
| observacoes (text)                        |
| responsavel_id (uuid -> profiles)         |
| created_by (uuid)                         |
| created_at (timestamp)                    |
| updated_at (timestamp)                    |
+------------------------------------------+
```

### Estrutura de Arquivos

```text
src/pages/
├── Franquias.tsx                # Listagem principal
├── FranquiaDetalhes.tsx         # Detalhes/edição
└── ...

src/components/Franquias/
├── FranquiaForm.tsx             # Formulário de criação/edição
├── FranquiaRenovacaoWorkflow.tsx # Visualização do workflow de renovação
├── FranquiaImport.tsx           # Importação via XLSX
└── index.ts

src/utils/
├── franquiaXlsxParser.ts        # Parser específico para franquias
└── ...
```

## Implementação

### Fase 1: Banco de Dados

**Migration SQL:**

```sql
-- Tabela principal de franquias
CREATE TABLE public.franquias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  cnpj text,
  regime_tributario text,
  status_contrato text NOT NULL DEFAULT 'pendente_assinatura',
  data_assinatura date,
  data_termino date,
  status_vigencia text DEFAULT 'ativo',
  
  -- Workflow de renovação (4 etapas)
  consultora_informada boolean DEFAULT false,
  renovacao_aceita boolean DEFAULT false,
  novo_contrato_enviado boolean DEFAULT false,
  contrato_novo_assinado boolean DEFAULT false,
  
  -- Controle de NF
  data_emissao_nf date,
  numero_nf text,
  
  observacoes text,
  responsavel_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE franquias ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Authenticated users can view franquias"
  ON franquias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage franquias"
  ON franquias FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));
```

### Fase 2: Frontend - Listagem

**Arquivo: `src/pages/Franquias.tsx`**

Componentes principais:
- PageHeader com contador e ações
- Tabs para filtrar por status (Todas | Ativas | Próximas ao Vencimento | Vencidas)
- DataTable com colunas:
  - Nome Completo
  - CNPJ (formatado)
  - Status Vigência (badge colorido)
  - Data Término
  - Workflow Progress (barra de progresso visual)
  - Ações

**Workflow Progress Visual:**
```text
[●●●○] 3/4 etapas concluídas
```

### Fase 3: Frontend - Detalhes e Formulário

**Arquivo: `src/pages/FranquiaDetalhes.tsx`**

Layout com cards:
1. **Dados da Franquia** - Nome, CNPJ, Regime Tributário
2. **Contrato** - Status, Datas, Vigência
3. **Workflow de Renovação** - Checklist visual interativo
4. **Nota Fiscal** - Número, Data de Emissão
5. **Observações** - Campo de texto
6. **Timeline** - Histórico de alterações (via audit_logs)

### Fase 4: Importação XLSX

**Arquivo: `src/utils/franquiaXlsxParser.ts`**

Mapeamento de colunas:
| Coluna Excel | Campo Banco |
|--------------|-------------|
| ID | (ignora, gera novo) |
| Nome Completo | nome_completo |
| CNPJ | cnpj |
| Regime Tributário | regime_tributario |
| Status assinatura do contrato | status_contrato |
| Data de assinatura do contrato | data_assinatura |
| Data Término | data_termino |
| STATUS DE VIGÊNCIA | status_vigencia |
| Consultora informada... | consultora_informada (Sim/Não → boolean) |
| Renovação aceita? | renovacao_aceita |
| Novo contrato enviado? | novo_contrato_enviado |
| Contrato NOVO assinado? | contrato_novo_assinado |
| Emissão da NF | (boolean para indicar se emitiu) |
| N° da NF | numero_nf |
| Data da Emissão | data_emissao_nf |
| Observação | observacoes |

### Fase 5: Navegação

**Adicionar ao Sidebar (`AppSidebar.tsx`):**
- Novo item "Franquias" no menu do módulo Contratos
- Ícone: `Building` ou `Store`

**Adicionar rota em `App.tsx`:**
```tsx
<Route path="/franquias" element={<ProtectedRoute><DashboardLayout><Franquias /></DashboardLayout></ProtectedRoute>} />
<Route path="/franquias/:id" element={<ProtectedRoute><DashboardLayout><FranquiaDetalhes /></DashboardLayout></ProtectedRoute>} />
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration SQL | Criar | Tabela franquias + RLS |
| `src/pages/Franquias.tsx` | Criar | Página de listagem |
| `src/pages/FranquiaDetalhes.tsx` | Criar | Página de detalhes |
| `src/components/Franquias/FranquiaForm.tsx` | Criar | Formulário de cadastro |
| `src/components/Franquias/FranquiaRenovacaoWorkflow.tsx` | Criar | Widget visual do workflow |
| `src/components/Franquias/FranquiaImport.tsx` | Criar | Componente de importação |
| `src/utils/franquiaXlsxParser.ts` | Criar | Parser de XLSX |
| `src/components/AppSidebar.tsx` | Modificar | Adicionar item de menu |
| `src/App.tsx` | Modificar | Adicionar rotas |

## Funcionalidades

1. **CRUD Completo** de franquias
2. **Importação via XLSX** com validação e preview
3. **Workflow Visual** de renovação com 4 etapas
4. **Alertas Automáticos** para contratos próximos ao vencimento
5. **Dashboard KPIs** (total franquias, em renovação, vencidas)
6. **Auditoria** via audit_logs existente
7. **Permissões** via sistema RBAC existente

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│  Franquias                                     [Importar] [+Nova]│
│  18 franquias cadastradas                                       │
├─────────────────────────────────────────────────────────────────┤
│  [Todas] [Ativas ●12] [Próx. Vencer ●4] [Vencidas ●2]          │
├─────────────────────────────────────────────────────────────────┤
│  Nome           │ CNPJ        │ Vigência  │ Término   │ Workflow│
│  ─────────────────────────────────────────────────────────────  │
│  Franquia A     │ 12.345/0001 │ 🟢 Ativa  │ 15/12/25  │ ●●●○    │
│  Franquia B     │ 98.765/0001 │ 🟡 Próximo│ 28/02/26  │ ●●○○    │
│  Franquia C     │ 45.678/0001 │ 🔴 Vencida│ 01/01/26  │ ●○○○    │
└─────────────────────────────────────────────────────────────────┘
```

