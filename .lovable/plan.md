
# Plano: Alterar Email Remetente do Financeiro

## Objetivo
Atualizar o email remetente das notificações financeiras de `onboarding@resend.dev` para `pedro@porveri.com.br`.

## Alteração Necessária

### Arquivo: `supabase/functions/enviar-notificacao-financeiro/index.ts`

**Linha 211**: Alterar o campo `from` no envio de email

```typescript
// Antes
from: "LexFlow <onboarding@resend.dev>",

// Depois
from: "LexFlow <pedro@porveri.com.br>",
```

## Pré-requisito Importante

Para que o envio funcione corretamente com `pedro@porveri.com.br`, o domínio `porveri.com.br` precisa estar verificado no Resend. Caso ainda não esteja:

1. Acesse https://resend.com/domains
2. Adicione o domínio `porveri.com.br` (se ainda não adicionado)
3. Configure os registros DNS (SPF, DKIM, DMARC) conforme instruções do Resend
4. Aguarde a verificação (geralmente alguns minutos)

Se o domínio já estiver verificado, a alteração funcionará imediatamente após o deploy.

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/enviar-notificacao-financeiro/index.ts` | Linha 211: alterar remetente para pedro@porveri.com.br |
