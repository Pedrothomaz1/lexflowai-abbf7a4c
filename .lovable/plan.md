
# Plano: Popup de Notificacao ao Financeiro

## Visao Geral

Implementar um popup/modal que aparece automaticamente quando um contrato ou servico e finalizado/aprovado, permitindo ao usuario preencher o email do financeiro e enviar as informacoes de pagamento.

## Componentes a Criar

### 1. FinanceNotificationModal

Novo componente de dialog que exibe:

```text
+--------------------------------------------------+
|  Enviar Notificacao ao Financeiro                |
+--------------------------------------------------+
|                                                   |
|  Email do Financeiro *                           |
|  [financeiro@empresa.com.br              ]       |
|                                                   |
|  Emails Adicionais (separados por virgula)       |
|  [                                       ]       |
|                                                   |
|  --- Resumo do Contrato ---                      |
|  Numero: CNT-2024-001                            |
|  Titulo: Manutencao Predial                      |
|  Fornecedor: ABC Servicos Ltda                   |
|  Valor Total: R$ 50.000,00                       |
|                                                   |
|  --- Parcelas/Obrigacoes de Pagamento ---        |
|  | Parcela | Vencimento | Valor      |          |
|  |---------|------------|------------|          |
|  | 1/3     | 15/02/2026 | R$ 16.666  |          |
|  | 2/3     | 15/03/2026 | R$ 16.666  |          |
|  | 3/3     | 15/04/2026 | R$ 16.668  |          |
|                                                   |
|  --- Dados para Pagamento ---                    |
|  Banco: 001 - Banco do Brasil                    |
|  Agencia: 1234-5                                 |
|  Conta: 12345-6                                  |
|  PIX: 12.345.678/0001-90                         |
|                                                   |
|  Observacoes Adicionais                          |
|  [                                       ]       |
|                                                   |
|  [Cancelar]               [Enviar ao Financeiro] |
+--------------------------------------------------+
```

### 2. Campos do Modal

- **Email do Financeiro** (obrigatorio)
- **Emails Adicionais** (opcional, separados por virgula)
- **Resumo automatico**: numero, titulo, fornecedor, valor total
- **Parcelas**: listagem das obrigacoes do tipo "pagamento" do contrato
- **Dados bancarios do fornecedor** (se disponiveis)
- **Observacoes adicionais** (campo de texto livre)

## Alteracoes no Codigo

### 1. Novo Componente: `src/components/FinanceNotificationModal.tsx`

Dialog reutilizavel para contratos e servicos contendo:
- Formulario com validacao (zod)
- Preview das informacoes a serem enviadas
- Loading state durante envio
- Feedback de sucesso/erro

### 2. Modificar: `src/pages/ContratoDetalhes.tsx`

Adicionar estado para controlar o modal:
- Quando `handleAddAprovacao` aprovar um contrato (status = "vigente")
- Abrir automaticamente o modal de notificacao ao financeiro
- Permitir que o usuario pule ou envie

### 3. Modificar: `src/pages/Servicos.tsx`

Adicionar estado para controlar o modal:
- Quando `handleRenovar` for executado com sucesso
- Abrir automaticamente o modal de notificacao ao financeiro
- Incluir dados do servico, valor estimado e fornecedor preferencial

### 4. Nova Edge Function: `supabase/functions/enviar-notificacao-financeiro/index.ts`

Funcao dedicada para notificacoes financeiras:
- Recebe dados do contrato/servico
- Email personalizado com layout profissional
- Tabela de parcelas e vencimentos
- Dados bancarios do fornecedor
- Link para visualizar o contrato no sistema

## Modelo do Email

```text
+--------------------------------------------------+
|  [Logo LexFlow]                                  |
|  COMUNICADO AO SETOR FINANCEIRO                  |
+--------------------------------------------------+
|                                                   |
|  Informamos que o contrato abaixo foi aprovado   |
|  e requer providencias de pagamento:             |
|                                                   |
|  DADOS DO CONTRATO                               |
|  ------------------------------------------------|
|  Numero: CNT-2024-001                            |
|  Titulo: Manutencao Predial Anual                |
|  Fornecedor: ABC Servicos Ltda                   |
|  CNPJ: 12.345.678/0001-90                        |
|  Valor Total: R$ 50.000,00                       |
|  Vigencia: 01/02/2026 a 31/01/2027               |
|                                                   |
|  CRONOGRAMA DE PAGAMENTOS                        |
|  ------------------------------------------------|
|  | Parcela | Vencimento | Valor       | Status  |
|  |---------|------------|-------------|---------|
|  | 1/3     | 15/02/2026 | R$ 16.666   | Pendente|
|  | 2/3     | 15/03/2026 | R$ 16.666   | Pendente|
|  | 3/3     | 15/04/2026 | R$ 16.668   | Pendente|
|                                                   |
|  DADOS BANCARIOS DO FORNECEDOR                   |
|  ------------------------------------------------|
|  Banco: 001 - Banco do Brasil                    |
|  Agencia: 1234-5                                 |
|  Conta Corrente: 12345-6                         |
|  PIX (CNPJ): 12.345.678/0001-90                  |
|                                                   |
|  Observacoes:                                    |
|  Favor processar conforme cronograma acima.      |
|                                                   |
|          [VER CONTRATO NO SISTEMA]               |
|                                                   |
|  ---                                             |
|  LexFlow - Sistema de Gestao de Contratos        |
|  Email automatico. Nao responda.                 |
+--------------------------------------------------+
```

## Fluxo de Funcionamento

```text
Usuario aprova contrato
        |
        v
Status muda para "vigente"
        |
        v
Modal abre automaticamente
        |
        +---> [Pular] ---> Fecha modal, contrato continua vigente
        |
        v
Usuario preenche email do financeiro
        |
        v
Sistema busca obrigacoes de pagamento
        |
        v
Preview das informacoes exibido
        |
        v
Usuario clica "Enviar"
        |
        v
Edge function envia email
        |
        v
Toast de sucesso + Modal fecha
```

## Banco de Dados

Sera necessario adicionar campos de dados bancarios na tabela `fornecedores`:

```sql
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS agencia TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS conta TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pix TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS titular_conta TEXT;
```

## Secao Tecnica

### Arquivos a Criar

1. `src/components/FinanceNotificationModal.tsx`
   - Props: isOpen, onClose, contratoId?, servicoId?, tipo ('contrato' | 'servico')
   - Usa react-hook-form + zod para validacao
   - Busca dados do contrato/servico e obrigacoes
   - Chama edge function para envio

2. `supabase/functions/enviar-notificacao-financeiro/index.ts`
   - Recebe: contratoId ou servicoId, destinatarios[], observacoes
   - Busca dados completos (contrato, fornecedor, obrigacoes)
   - Gera HTML do email com tabela de parcelas
   - Envia via Resend
   - Registra em uso_sistema

### Arquivos a Modificar

1. `src/pages/ContratoDetalhes.tsx`
   - Importar FinanceNotificationModal
   - Estado: showFinanceModal
   - No handleAddAprovacao, apos aprovar: setShowFinanceModal(true)
   - Renderizar modal no final do componente

2. `src/pages/Servicos.tsx`
   - Importar FinanceNotificationModal
   - Estado: showFinanceModal, selectedServiceForNotification
   - No handleRenovar, apos sucesso: abrir modal
   - Renderizar modal no final do componente

3. `supabase/config.toml`
   - Adicionar nova funcao enviar-notificacao-financeiro

### Migracao de Banco

```sql
-- Adicionar dados bancarios aos fornecedores
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS agencia TEXT,
ADD COLUMN IF NOT EXISTS conta TEXT,
ADD COLUMN IF NOT EXISTS pix TEXT,
ADD COLUMN IF NOT EXISTS titular_conta TEXT;
```

### Validacao do Formulario (Zod)

```typescript
const financeNotificationSchema = z.object({
  emailFinanceiro: z.string()
    .trim()
    .email({ message: "Email invalido" })
    .max(255),
  emailsAdicionais: z.string()
    .max(500)
    .optional(),
  observacoes: z.string()
    .max(1000)
    .optional(),
});
```

## Consideracoes de Seguranca

- Validacao de email no frontend e backend
- Rate limiting na edge function (via uso_sistema)
- Apenas usuarios autenticados podem enviar
- Validacao de permissao: apenas quem pode aprovar contratos pode enviar notificacoes

## Resultado Esperado

Ao aprovar um contrato ou renovar um servico, o usuario vera automaticamente um popup perguntando se deseja notificar o financeiro. Se confirmar, um email profissional sera enviado contendo todas as informacoes necessarias para o processamento dos pagamentos.
