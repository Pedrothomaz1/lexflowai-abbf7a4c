

# Atualizar Token da API de Compras (COMPRAS_API_KEY)

## O que sera feito
- Atualizar o secret `COMPRAS_API_KEY` com o novo token fornecido pelo time do Gest10
- Apos a atualizacao, executar um teste de conexao para validar que o novo token funciona

## Etapas

### 1. Atualizar o secret
- Solicitar que voce insira o novo token de forma segura (o valor nao fica visivel no chat)

### 2. Testar a conexao
- Chamar a funcao de teste de conexao para verificar se o servidor Gest10 aceita o novo token
- Verificar se o erro `MISSING_TOKEN` foi resolvido

### 3. Testar envio real (opcional)
- Disparar o envio de uma solicitacao de compras para confirmar o fluxo completo
- Verificar o resultado na tabela `solicitacoes_compras`

