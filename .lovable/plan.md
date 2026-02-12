

## Plano: Adicionar Log de Debug para Verificar Envio do Token

### Problema Identificado

O codigo esta correto:
- A configuracao na base de dados tem `tipo_autenticacao = "bearer"` e `url_api = "https://gest10.com.br/api/v1/solicitacoes"`
- O codigo monta o header como `Authorization: Bearer <token>` (linha 293)
- A secret `COMPRAS_API_KEY` esta configurada
- Porem o Gest10 retorna `MISSING_TOKEN` em todas as tentativas

### O que vou fazer

1. **Adicionar logs temporarios de debug** na Edge Function `enviar-solicitacao-compras` para registrar:
   - Se a variavel `COMPRAS_API_KEY` esta preenchida (primeiros 8 caracteres apenas, por seguranca)
   - O valor do `tipo_autenticacao` lido da base de dados
   - Os headers que estao sendo enviados (mascarando o token)
   - Confirmar que o branch `bearer` esta sendo atingido

2. **Disparar um envio de teste** para gerar os logs

3. **Verificar os logs** para confirmar exatamente o que esta sendo enviado

4. **Remover os logs de debug** apos a verificacao

### Detalhes Tecnicos

A alteracao sera apenas em `supabase/functions/enviar-solicitacao-compras/index.ts`, adicionando `console.log` antes do `fetch`:

```typescript
// Debug temporario
console.log(`[DEBUG] COMPRAS_API_KEY exists: ${!!apiKey}, length: ${apiKey?.length}, starts: ${apiKey?.substring(0,8)}`);
console.log(`[DEBUG] tipo_autenticacao: ${config.tipo_autenticacao}`);
console.log(`[DEBUG] Authorization header: ${headers["Authorization"]?.substring(0, 20)}...`);
console.log(`[DEBUG] All header keys: ${Object.keys(headers).join(', ')}`);
```

Tambem verificarei se `headers_customizados` pode estar sobrescrevendo o header `Authorization` (linha 297-298), pois ele e aplicado DEPOIS da autenticacao com spread operator.

### Hipotese

Ha uma possibilidade de que o campo `headers_customizados` (que esta como `{}` vazio na base) esteja de alguma forma sobrescrevendo o `Authorization`. Ou ainda, que a secret `COMPRAS_API_KEY` esteja vazia/nula no ambiente de execucao da Edge Function mesmo apos o update.

