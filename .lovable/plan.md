
# Plano: Formulário Externo de Requisição de Contratos

## Resumo

Criar um formulário publicamente acessivel que permitira que usuarios externos (funcionarios, gestores de areas, etc.) possam enviar solicitacoes de contratos que serao recebidas e analisadas pela equipe juridica no modulo de Contratos do LexFlow.

## Fluxo Proposto

```text
+------------------------+        +----------------------------+        +------------------------+
|  USUARIO EXTERNO       |        |  BACKEND (Edge Function)   |        |  MODULO CONTRATOS      |
|  (sem login)           |        |                            |        |  (usuarios internos)   |
+------------------------+        +----------------------------+        +------------------------+
         |                                    |                                    |
         | 1. Acessa /requisicao              |                                    |
         |-------------------------------->   |                                    |
         |                                    |                                    |
         | 2. Preenche formulario             |                                    |
         |  - Nome solicitante                |                                    |
         |  - Email                           |                                    |
         |  - Departamento                    |                                    |
         |  - Tipo de contrato                |                                    |
         |  - Descricao da necessidade        |                                    |
         |  - Valor estimado                  |                                    |
         |  - Urgencia                        |                                    |
         |  - Fornecedor sugerido             |                                    |
         |                                    |                                    |
         | 3. Submete formulario              |                                    |
         |-------------------------------> 4. Valida dados                        |
         |                                    |                                    |
         |                                    | 5. Insere na tabela                |
         |                                    |    contract_requests               |
         |                                    |----------------------------------->|
         |                                    |                                    |
         |                                    | 6. Envia notificacao               |
         |                                    |    (opcional: email/WhatsApp)      |
         |                                    |                                    |
         | 7. Confirmacao                     |                                    |
         |<-------------------------------|  |                                    |
         |                                    |                                    |
         |                                    |         8. Equipe juridica         |
         |                                    |            visualiza e aprova      |
         |                                    |                                    |
         |                                    |         9. Converte em contrato    |
         |                                    |            (opcional)              |
+------------------------+        +----------------------------+        +------------------------+
```

## Componentes a Criar

### 1. Tabela no Banco de Dados

Nova tabela `contract_requests` para armazenar as solicitacoes:

- `id` (uuid, PK)
- `numero_requisicao` (text) - Numero sequencial gerado automaticamente
- `solicitante_nome` (text) - Nome de quem esta solicitando
- `solicitante_email` (text) - Email para contato
- `solicitante_telefone` (text, opcional)
- `departamento` (text) - Area/departamento solicitante
- `tipo_contrato` (contract_type enum)
- `titulo` (text) - Titulo/assunto da requisicao
- `descricao` (text) - Descricao detalhada da necessidade
- `justificativa` (text) - Por que e necessario
- `valor_estimado` (numeric, opcional)
- `urgencia` (text) - baixa/media/alta/critica
- `data_necessidade` (date, opcional) - Quando precisa estar pronto
- `fornecedor_sugerido` (text, opcional)
- `anexo_url` (text, opcional) - Link para documentos de apoio
- `status` (text) - pendente/em_analise/aprovado/rejeitado/convertido
- `analisado_por` (uuid, FK profiles)
- `analisado_em` (timestamp)
- `contrato_id` (uuid, FK contratos) - Se convertido em contrato
- `observacoes_analise` (text)
- `created_at` (timestamp)
- `ip_address` (text) - Para auditoria
- `user_agent` (text) - Para auditoria

**RLS Policies:**
- INSERT: Aberto ao publico (sem autenticacao)
- SELECT/UPDATE/DELETE: Apenas usuarios autenticados com roles apropriadas

### 2. Edge Function: `processar-requisicao-contrato`

Endpoint publico para receber e validar as requisicoes:

- Validacao de campos obrigatorios
- Rate limiting por IP
- Sanitizacao de inputs
- Geracao de numero de requisicao
- Insercao no banco
- Envio de email de confirmacao ao solicitante
- Notificacao opcional para equipe juridica

### 3. Pagina Publica: `/requisicao`

Formulario acessivel sem login contendo:

- Campos do formulario com validacao
- Captcha ou honeypot para evitar spam (opcional)
- Feedback visual de sucesso/erro
- Numero de protocolo para acompanhamento

### 4. Pagina Interna: `/requisicoes` (nova)

Dashboard para a equipe juridica visualizar e gerenciar requisicoes:

- Lista de requisicoes com filtros (status, urgencia, data)
- Visualizacao de detalhes
- Acoes: Aprovar, Rejeitar, Solicitar mais informacoes
- Botao "Converter em Contrato" que cria um rascunho pre-preenchido
- Historico de alteracoes

### 5. Atualizacoes no Sistema Existente

- Adicionar link para `/requisicoes` no menu lateral
- Badge de notificacao com contagem de requisicoes pendentes
- Opcao no formulario de novo contrato para vincular a uma requisicao

## Seguranca

1. **Rate Limiting**: Maximo 5 requisicoes por IP por hora
2. **Validacao de Input**: Usando Zod para validar todos os campos
3. **Sanitizacao**: Limpeza de HTML/scripts nos textos
4. **Captcha Invisivel**: Para evitar bots (opcional, pode usar honeypot)
5. **Logs de Auditoria**: Registro de IP e user-agent
6. **RLS**: Formulario publico so pode inserir, nunca ler ou modificar

## Detalhes Tecnicos

### Arquivos a Criar

1. `src/pages/RequisicaoPublica.tsx` - Formulario publico
2. `src/pages/Requisicoes.tsx` - Gerenciamento interno
3. `supabase/functions/processar-requisicao-contrato/index.ts` - Edge function
4. Atualizacao em `src/App.tsx` - Novas rotas
5. Atualizacao em `src/components/AppSidebar.tsx` - Link no menu
6. Migracao SQL - Nova tabela e politicas

### Integracao com Fluxo Existente

Quando uma requisicao for aprovada e convertida em contrato:

1. Cria novo registro em `contratos` com dados da requisicao
2. Atualiza `contract_requests.status` para "convertido"
3. Atualiza `contract_requests.contrato_id` com o ID do novo contrato
4. Registra em `audit_logs`

## Etapas de Implementacao

1. Criar tabela `contract_requests` com RLS
2. Criar edge function para processar requisicoes
3. Criar pagina publica `/requisicao`
4. Criar pagina interna `/requisicoes`
5. Integrar no menu e adicionar badge de notificacao
6. Adicionar funcionalidade de converter em contrato
7. Testar fluxo completo
