

# Plano: Testar Integração com API de Compras

## Situação Atual
- A integração com `gest10.com.br` esta cadastrada mas **desativada** (`is_active = false`)
- Autenticacao configurada como `bearer` (usando o secret `COMPRAS_API_KEY`)
- Existe 1 servico cadastrado na organizacao (status `dentro_prazo`)
- Ja existem Edge Functions prontas: `testar-conexao-compras` e `enviar-solicitacao-compras`

## Etapas

### 1. Ativar a integracao
- Atualizar o registro em `integracao_config` para `is_active = true`

### 2. Testar a conexao
- Chamar a Edge Function `testar-conexao-compras` com a URL configurada para verificar se o servidor responde
- Analisar o resultado (status HTTP, mensagem)

### 3. Adicionar botao "Enviar para Compras" na pagina de servicos
- Adicionar um botao na listagem de servicos que permite disparar manualmente o envio de uma solicitacao para a API
- O botao chamara a Edge Function `enviar-solicitacao-compras` passando o `servicoId`
- Mostrar feedback visual (toast) com o resultado: sucesso, erro ou pendente

### 4. Monitorar resultado
- Verificar na tabela `solicitacoes_compras` se o registro foi criado com o payload, resposta da API e status

## Detalhes Tecnicos

### Botao na pagina Servicos (`src/pages/Servicos.tsx`)
- Novo botao `Send` / `ShoppingCart` ao lado de cada servico na listagem
- Ao clicar, chama `supabase.functions.invoke('enviar-solicitacao-compras', { body: { servicoId } })` com o header de autorizacao `CRON_SECRET`
- Como o `CRON_SECRET` e um secret do backend, o botao na verdade deve chamar via uma abordagem diferente: criar um wrapper no frontend que usa o token do usuario, e ajustar a Edge Function para aceitar tambem tokens de usuario autenticado (alem do CRON_SECRET)

### Alternativa mais simples (recomendada)
- Testar diretamente via as ferramentas de desenvolvimento, chamando a Edge Function `testar-conexao-compras` e `enviar-solicitacao-compras` para validar a integracao sem precisar alterar codigo
- Depois, adicionar o botao manual na UI

### Sequencia do teste
1. Ativar integracao no banco
2. Chamar `testar-conexao-compras` para verificar conectividade
3. Chamar `enviar-solicitacao-compras` com o servico existente
4. Verificar resultado em `solicitacoes_compras`

