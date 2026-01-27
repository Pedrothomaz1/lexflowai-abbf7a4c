

# Plano: Implementação de 10 Funcionalidades Enterprise CLM

## Visão Geral

Este plano cobre a implementação completa de 10 funcionalidades de nível enterprise para o LexFlow, organizadas em 4 fases sequenciais para garantir estabilidade e permitir testes incrementais.

---

## Funcionalidades a Implementar

| # | Funcionalidade | Prioridade | Fase |
|---|---------------|------------|------|
| 1 | Versionamento de Contratos | Alta | 1 |
| 2 | Trilha de Auditoria (Audit Trail) | Alta | 1 |
| 3 | Redlining / Markup | Alta | 2 |
| 4 | Extração Automática por IA (OCR) | Alta | 2 |
| 5 | Relatórios Customizáveis | Média | 3 |
| 6 | Compliance LGPD/GDPR | Média | 3 |
| 7 | Métricas de Negociação | Média | 3 |
| 8 | Mobile App / PWA | Média | 4 |
| 9 | Multi-idioma (i18n) | Média | 4 |
| 10 | Chatbot Interno | Baixa | 4 |

---

## FASE 1: Rastreabilidade e Histórico

### 1.1 Versionamento de Contratos

**Objetivo**: Registrar todas as versões do contrato com histórico completo e permitir comparação (diff) e restauração.

**Banco de Dados**:
```text
Nova tabela: contract_versions
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| contrato_id      | uuid       | Referência ao contrato                 |
| versao           | integer    | Número da versão (1, 2, 3...)          |
| snapshot         | jsonb      | Snapshot completo dos dados            |
| alteracoes       | jsonb      | Lista detalhada de campos alterados    |
| motivo           | text       | Justificativa da alteração (opcional)  |
| created_by       | uuid       | Usuário que criou a versão             |
| created_at       | timestamptz| Data de criação                        |
+------------------+------------+----------------------------------------+
```

**Novos Componentes**:
| Arquivo | Descrição |
|---------|-----------|
| `src/components/ContractDetails/ContractVersionHistory.tsx` | Timeline visual de versões |
| `src/components/ContractDetails/ContractVersionDiff.tsx` | Comparação lado a lado entre versões |
| `src/components/ContractDetails/ContractVersionRestore.tsx` | Dialog para restaurar versão anterior |

**Lógica**:
- Trigger automático no banco ao atualizar `contratos` → cria nova versão
- Interface mostra timeline com todas as versões
- Diff visual destaca campos alterados (verde/vermelho)
- Restaurar cria nova versão com dados antigos (não sobrescreve)

---

### 1.2 Trilha de Auditoria (Audit Trail)

**Objetivo**: Registrar todas as ações dos usuários no sistema para compliance e rastreabilidade.

**Banco de Dados**:
```text
Nova tabela: audit_logs
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| user_id          | uuid       | Usuário que executou a ação            |
| acao             | text       | Tipo: view, create, update, delete...  |
| entidade         | text       | Tipo: contrato, fornecedor, etc.       |
| entidade_id      | uuid       | ID do registro afetado                 |
| dados_anteriores | jsonb      | Estado antes da ação                   |
| dados_novos      | jsonb      | Estado após a ação                     |
| ip_address       | text       | IP do usuário                          |
| user_agent       | text       | Browser/dispositivo                    |
| metadata         | jsonb      | Contexto adicional                     |
| created_at       | timestamptz| Timestamp da ação                      |
+------------------+------------+----------------------------------------+
```

**Tipos de Ação**:
- `view` - Visualização
- `create` - Criação
- `update` - Atualização
- `delete` - Exclusão
- `approve` - Aprovação
- `reject` - Rejeição
- `download` - Download
- `upload` - Upload
- `sign` - Assinatura
- `export` - Exportação
- `analyze` - Análise IA

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AuditLogs.tsx` | Página de visualização de logs (admin) |
| `src/components/AuditLog/AuditTimeline.tsx` | Timeline visual de atividades |
| `src/components/AuditLog/AuditFilters.tsx` | Filtros por usuário, ação, data, entidade |
| `src/hooks/useAuditLog.ts` | Hook para registrar ações facilmente |

**Integração**:
- Hook `useAuditLog` chamado em todas as páginas principais
- Registro automático de visualizações, downloads, aprovações
- Página `/audit-logs` visível apenas para administradores

---

## FASE 2: Edição Avançada e IA

### 2.1 Redlining / Markup

**Objetivo**: Permitir edição colaborativa de textos contratuais com marcações visíveis (como Track Changes do Word).

**Banco de Dados**:
```text
Nova tabela: contract_redlines
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| contrato_id      | uuid       | Referência ao contrato                 |
| versao           | integer    | Versão do contrato                     |
| conteudo_original| text       | Texto original                         |
| conteudo_marcado | text       | Texto com marcações HTML               |
| alteracoes       | jsonb      | Lista de alterações individuais        |
| status           | text       | draft, pending_review, accepted        |
| created_by       | uuid       | Autor das alterações                   |
| reviewed_by      | uuid       | Revisor (se aplicável)                 |
| created_at       | timestamptz| Data de criação                        |
| reviewed_at      | timestamptz| Data de revisão                        |
+------------------+------------+----------------------------------------+
```

**Novos Componentes**:
| Arquivo | Descrição |
|---------|-----------|
| `src/components/ContractDetails/ContractRedlineEditor.tsx` | Editor com marcações visuais |
| `src/components/ContractDetails/RedlineToolbar.tsx` | Toolbar com ações de markup |
| `src/components/ContractDetails/RedlineComparison.tsx` | Visualização original vs marcado |

**Funcionalidades**:
- Inserções em **verde**
- Exclusões em ~~vermelho riscado~~
- Comentários inline
- Aceitar/Rejeitar alterações individuais
- Aceitar/Rejeitar todas
- Histórico de redlines por versão

---

### 2.2 Extração Automática por IA (OCR)

**Objetivo**: Extrair automaticamente dados de contratos em PDF usando IA para pré-preencher formulários.

**Nova Edge Function**: `supabase/functions/extrair-dados-pdf/index.ts`

**Dados Extraídos**:
- Partes envolvidas (contratante/contratada)
- CNPJ/CPF das partes
- Valor do contrato
- Data de início e término
- Objeto do contrato
- Cláusulas principais

**Fluxo**:
```text
1. Usuário faz upload do PDF
2. Clica em "Extrair dados automaticamente"
3. Edge Function processa com Lovable AI (Gemini)
4. Retorna dados estruturados
5. Formulário é pré-preenchido
6. Usuário revisa e confirma
```

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/extrair-dados-pdf/index.ts` | Edge function com OCR/IA |
| `src/components/ContractImport/PDFExtractor.tsx` | UI para extração e revisão |

---

## FASE 3: Relatórios e Compliance

### 3.1 Relatórios Customizáveis

**Objetivo**: Permitir criação de relatórios sob demanda com filtros personalizados.

**Banco de Dados**:
```text
Nova tabela: saved_reports
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| nome             | text       | Nome do relatório                      |
| descricao        | text       | Descrição                              |
| tipo             | text       | contratos, fornecedores, obrigacoes    |
| filtros          | jsonb      | Configuração de filtros                |
| colunas          | jsonb      | Colunas selecionadas                   |
| ordenacao        | jsonb      | Configuração de ordenação              |
| agrupamento      | text       | Campo de agrupamento                   |
| is_public        | boolean    | Visível para todos?                    |
| created_by       | uuid       | Criador                                |
| created_at       | timestamptz| Data de criação                        |
+------------------+------------+----------------------------------------+
```

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Relatorios.tsx` | Página principal de relatórios |
| `src/components/Reports/ReportBuilder.tsx` | Construtor de relatórios |
| `src/components/Reports/ReportFilters.tsx` | Configurador de filtros |
| `src/components/Reports/ReportPreview.tsx` | Visualização do relatório |
| `src/components/Reports/ReportExport.tsx` | Exportação PDF/Excel |

**Funcionalidades**:
- Selecionar colunas a exibir
- Definir filtros (status, data, valor, fornecedor)
- Agrupar por campo (tipo, status, mês)
- Salvar relatórios favoritos
- Exportar para PDF/Excel
- Agendar envio por email (futuro)

---

### 3.2 Compliance LGPD/GDPR

**Objetivo**: Módulo específico para rastreamento de conformidade com leis de proteção de dados.

**Banco de Dados**:
```text
Nova tabela: compliance_items
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| contrato_id      | uuid       | Referência ao contrato                 |
| tipo             | text       | lgpd, gdpr, lei_geral                  |
| requisito        | text       | Descrição do requisito                 |
| status           | text       | pendente, conforme, nao_conforme       |
| evidencia        | text       | Evidência de conformidade              |
| responsavel_id   | uuid       | Responsável pela verificação           |
| verificado_em    | timestamptz| Data da verificação                    |
| proxima_revisao  | date       | Data da próxima revisão                |
| created_at       | timestamptz| Data de criação                        |
+------------------+------------+----------------------------------------+

Nova tabela: data_processing_records
+------------------+------------+----------------------------------------+
| Coluna           | Tipo       | Descrição                              |
+------------------+------------+----------------------------------------+
| id               | uuid       | Identificador único                    |
| contrato_id      | uuid       | Referência ao contrato                 |
| dados_tratados   | text[]     | Tipos de dados pessoais tratados       |
| base_legal       | text       | Base legal (consentimento, contrato)   |
| finalidade       | text       | Finalidade do tratamento               |
| compartilhamento | text       | Com quem é compartilhado               |
| retencao         | text       | Período de retenção                    |
| created_at       | timestamptz| Data de criação                        |
+------------------+------------+----------------------------------------+
```

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Compliance.tsx` | Dashboard de compliance |
| `src/components/Compliance/ComplianceChecklist.tsx` | Checklist por contrato |
| `src/components/Compliance/ComplianceStatus.tsx` | Status geral |
| `src/components/Compliance/DataProcessingForm.tsx` | Registro de tratamento |

**Funcionalidades**:
- Checklist LGPD/GDPR por contrato
- Dashboard de status de conformidade
- Alertas de revisão periódica
- Registro de atividades de tratamento
- Exportação para DPO/Encarregado

---

### 3.3 Métricas de Negociação

**Objetivo**: Medir performance do processo de negociação de contratos.

**Métricas Calculadas**:
- Tempo médio de negociação (rascunho → assinado)
- Taxa de aprovação na primeira tentativa
- Tempo médio por etapa do workflow
- Quantidade de redlines por contrato
- Taxa de aceitação de termos
- Contratos por tipo/mês/fornecedor

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `src/components/Dashboard/NegotiationMetrics.tsx` | Cards de métricas |
| `src/components/Dashboard/NegotiationCharts.tsx` | Gráficos de evolução |
| `src/components/Dashboard/PerformanceTable.tsx` | Tabela de performance |

**Integração**:
- Adicionar seção no Dashboard principal
- Calcular métricas com base em `contract_history` e timestamps

---

## FASE 4: Mobile, i18n e IA Conversacional

### 4.1 Mobile App / PWA

**Objetivo**: Permitir aprovações e visualização via celular.

**Implementação**:
- Configurar `vite-plugin-pwa`
- Criar manifest.json com ícones
- Adicionar meta tags para mobile
- Criar página `/install` para instalação
- Otimizar layouts para telas pequenas

**Arquivos Modificados/Criados**:
| Arquivo | Alteração |
|---------|-----------|
| `vite.config.ts` | Adicionar plugin PWA |
| `public/manifest.json` | Manifest do PWA |
| `public/icons/` | Ícones em vários tamanhos |
| `index.html` | Meta tags mobile |
| `src/pages/Install.tsx` | Página de instalação |

**Funcionalidades Offline**:
- Cache de dados básicos
- Visualização de contratos
- Fila de aprovações pendentes
- Sincronização quando online

---

### 4.2 Multi-idioma (i18n)

**Objetivo**: Suporte a contratos e interface em múltiplos idiomas.

**Implementação**:
- Instalar `react-i18next`
- Criar arquivos de tradução (pt-BR, en-US, es)
- Componente de seleção de idioma
- Persistir preferência do usuário

**Estrutura de Arquivos**:
```text
src/
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── pt-BR.json
│       ├── en-US.json
│       └── es.json
```

**Áreas Traduzidas**:
- Interface completa (menus, botões, labels)
- Mensagens de erro e sucesso
- Status e tipos de contrato
- Relatórios e exportações

---

### 4.3 Chatbot Interno

**Objetivo**: Permitir perguntas sobre contratos via chat com IA.

**Nova Edge Function**: `supabase/functions/chatbot-contratos/index.ts`

**Funcionalidades**:
- "Qual o valor total dos contratos vigentes?"
- "Quantos contratos vencem este mês?"
- "Mostre contratos do fornecedor X"
- "Qual o status do contrato CT-2024-001?"

**Novos Arquivos**:
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/chatbot-contratos/index.ts` | Edge function com Lovable AI |
| `src/components/Chatbot/ChatbotWidget.tsx` | Widget flutuante |
| `src/components/Chatbot/ChatbotDialog.tsx` | Interface de chat |
| `src/components/Chatbot/ChatMessage.tsx` | Componente de mensagem |

**Implementação**:
- Widget flutuante no canto inferior direito
- Histórico de conversas por sessão
- Integração com Lovable AI (Gemini)
- Sugestões de perguntas frequentes

---

## Arquivos a Criar (Resumo)

### Edge Functions
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/extrair-dados-pdf/index.ts` | OCR/Extração IA |
| `supabase/functions/chatbot-contratos/index.ts` | Chatbot com IA |

### Páginas
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AuditLogs.tsx` | Trilha de auditoria |
| `src/pages/Relatorios.tsx` | Relatórios customizáveis |
| `src/pages/Compliance.tsx` | Compliance LGPD/GDPR |
| `src/pages/Install.tsx` | Instalação PWA |

### Componentes
| Diretório | Componentes |
|-----------|-------------|
| `src/components/ContractDetails/` | VersionHistory, VersionDiff, VersionRestore, RedlineEditor |
| `src/components/AuditLog/` | AuditTimeline, AuditFilters |
| `src/components/Reports/` | ReportBuilder, ReportFilters, ReportPreview, ReportExport |
| `src/components/Compliance/` | ComplianceChecklist, ComplianceStatus, DataProcessingForm |
| `src/components/Dashboard/` | NegotiationMetrics, NegotiationCharts |
| `src/components/Chatbot/` | ChatbotWidget, ChatbotDialog, ChatMessage |

### Hooks
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useAuditLog.ts` | Registro de ações |
| `src/hooks/useVersioning.ts` | Operações de versionamento |

### i18n
| Arquivo | Descrição |
|---------|-----------|
| `src/i18n/index.ts` | Configuração i18next |
| `src/i18n/locales/*.json` | Arquivos de tradução |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rotas: /audit-logs, /relatorios, /compliance, /install |
| `src/components/AppSidebar.tsx` | Adicionar links para novas páginas |
| `src/pages/ContratoDetalhes.tsx` | Integrar versões, redlines, compliance, audit log |
| `src/pages/Contratos.tsx` | Adicionar extração IA no fluxo de criação |
| `src/pages/Dashboard.tsx` | Adicionar métricas de negociação |
| `src/pages/Settings.tsx` | Adicionar configuração de idioma |
| `supabase/config.toml` | Adicionar novas edge functions |
| `vite.config.ts` | Adicionar plugin PWA |
| `index.html` | Adicionar meta tags mobile |

---

## Migrações de Banco de Dados

| Migração | Tabelas/Alterações |
|----------|-------------------|
| 001 | `contract_versions` + RLS + trigger auto-versão |
| 002 | `audit_logs` + RLS + índices |
| 003 | `contract_redlines` + RLS |
| 004 | `saved_reports` + RLS |
| 005 | `compliance_items` + `data_processing_records` + RLS |

---

## Ordem de Implementação

```text
FASE 1 (Semana 1-2)
├── Migração: contract_versions
├── Migração: audit_logs
├── Hook: useAuditLog
├── Hook: useVersioning
├── Componentes: VersionHistory, VersionDiff
├── Página: AuditLogs
└── Integração em ContratoDetalhes

FASE 2 (Semana 3-4)
├── Migração: contract_redlines
├── Edge Function: extrair-dados-pdf
├── Componentes: RedlineEditor, PDFExtractor
└── Integração em fluxo de criação

FASE 3 (Semana 5-6)
├── Migração: saved_reports
├── Migração: compliance_items + data_processing_records
├── Página: Relatorios
├── Página: Compliance
├── Componentes: NegotiationMetrics
└── Integração no Dashboard

FASE 4 (Semana 7-8)
├── Configuração PWA
├── Configuração i18n
├── Edge Function: chatbot-contratos
├── Componentes: Chatbot
└── Página: Install
```

---

## Considerações Técnicas

### Segurança
- Audit logs visíveis apenas para administradores
- Versões seguem mesmas permissões do contrato
- Compliance restrito a roles específicas
- Chatbot valida permissões antes de retornar dados

### Performance
- Audit logs com índices em `user_id`, `entidade`, `created_at`
- Versões limitadas a últimas 50 na listagem
- Paginação em todas as listagens grandes
- Cache de traduções no localStorage

### LGPD/Compliance
- Audit trail atende requisitos de rastreabilidade
- Logs incluem IP e user agent para investigação
- Retenção de logs configurável (sugestão: 2 anos)
- Registro de atividades de tratamento

