
## Plano: Implementar Melhorias do Resend conforme Documentação Oficial

### Resumo
Atualizar as Edge Functions de envio de email para seguir as melhores práticas da API do Resend, incluindo proteção contra rate limiting, envio em lote, idempotência e atualização do SDK.

---

### 1. Atualizar SDK do Resend

**Situação atual**: Usando `resend@2.0.0`  
**Ação**: Atualizar para `resend@4.0.0` em ambas as funções

---

### 2. Implementar Batch Sending na função `enviar-notificacao-email`

**Problema atual**: Loop sequencial enviando email por email pode atingir o limite de 2 requisições/segundo do Resend.

**Solução**: Usar a API de Batch do Resend (`resend.batch.send()`) que permite enviar até 100 emails em uma única requisição.

```text
Antes:                          Depois:
┌─────────────────────┐         ┌─────────────────────┐
│ for (user of users) │         │ resend.batch.send() │
│   → send email      │   →     │   → [email1,        │
│   → wait response   │         │       email2,       │
│   → next user       │         │       email3...]    │
└─────────────────────┘         └─────────────────────┘
    (N requisições)                 (1 requisição)
```

---

### 3. Adicionar Idempotency-Key

**Problema**: Reenvios acidentais podem duplicar emails.

**Solução**: Adicionar cabeçalho `Idempotency-Key` baseado no `alertaId` para garantir que o mesmo alerta não gere emails duplicados.

```typescript
headers: {
  "Idempotency-Key": `alert-${alertaId}-${Date.now()}`
}
```

---

### 4. Adicionar versão texto plano

**Problema**: Alguns clientes de email bloqueiam HTML ou preferem texto.

**Solução**: Adicionar campo `text` com versão simplificada do conteúdo.

```typescript
{
  html: emailHtml,
  text: `Alerta: ${titulo}\nContrato: ${numeroContrato}\nVencimento: ${dataVencimento}`
}
```

---

### 5. Adicionar campo Reply-To

**Solução**: Configurar um email para respostas (mesmo que seja o genérico):

```typescript
replyTo: "suporte@veridianaquirino.com.br"
```

---

### 6. Melhorar tratamento de erros

**Problema**: Erros genéricos dificultam debugging.

**Solução**: Tratar códigos de erro específicos do Resend:
- `rate_limit_exceeded`: Aguardar e tentar novamente
- `validation_error`: Logar detalhes e pular email
- `missing_required_field`: Logar campo faltante

---

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/enviar-notificacao-email/index.ts` | SDK v4, batch.send(), idempotency, text, reply-to, error handling |
| `supabase/functions/enviar-notificacao-financeiro/index.ts` | SDK v4, idempotency, text, reply-to |

---

### Seção Técnica

**Estrutura do Batch Send**:
```typescript
const { data, error } = await resend.batch.send(
  uniqueEmails.map(user => ({
    from: "LexFlow <alertas@veridianaquirino.com.br>",
    to: [user.email],
    subject: subject,
    html: html,
    text: textVersion,
    reply_to: "suporte@veridianaquirino.com.br",
    headers: {
      "X-Alert-Id": alertaId,
    }
  }))
);
```

**Rate Limit Handling**:
```typescript
if (error?.name === 'rate_limit_exceeded') {
  await new Promise(r => setTimeout(r, 1000));
  // Retry logic
}
```

---

### Resultado Esperado

- Emails enviados de forma mais eficiente (1 request vs N requests)
- Proteção contra duplicatas via idempotency
- Melhor compatibilidade com clientes de email (versão texto)
- Logs mais detalhados para debugging
- Compliance total com as melhores práticas do Resend
