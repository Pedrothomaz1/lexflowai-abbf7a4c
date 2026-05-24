## Objetivo

Trocar o consumo da análise de contratos do **Lovable AI Gateway** (`ai.gateway.lovable.dev` + `LOVABLE_API_KEY`) para a **API direta do Google Gemini** (`generativelanguage.googleapis.com` + `GEMINI_API_KEY` da sua conta no Google AI Studio).

Isso elimina a dependência do AI balance do Lovable — o consumo passa a ser cobrado diretamente na sua conta Google, geralmente mais barato.

## Escopo

Apenas a edge function `analisar-contrato-ia` consome IA hoje. Frontend e schema do banco não mudam.

## Passos

### 1. Adicionar secret `GEMINI_API_KEY`
Vou pedir o secret via ferramenta segura. Você gera a key em https://aistudio.google.com/apikey (gratuito até certo limite, depois pay-as-you-go).

### 2. Reescrever `supabase/functions/analisar-contrato-ia/index.ts`
- Substituir a função `runSkill` para chamar o endpoint nativo do Gemini ao invés do gateway Lovable.
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_API_KEY`
- Adaptar payload: o Gemini usa formato próprio (`contents`, `systemInstruction`, `tools.functionDeclarations`, `toolConfig`) — diferente do formato OpenAI usado pelo gateway.
- Extrair o `functionCall.args` da resposta (estrutura: `candidates[0].content.parts[].functionCall.args`).
- Manter modelo `gemini-2.5-flash` (custo-eficiente, ~$0.075/M tokens input).
- Manter tratamento de erros 429 (rate limit) e adicionar 400/403 (key inválida).
- Preservar contagem de tokens (`usageMetadata.promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) para o registro em `uso_sistema`.

### 3. Manter inalterado
- Toda a lógica de skills (contract-review, nda-triage, risk-assessment, compliance).
- Os schemas das tool calls (apenas convertidos para o formato Gemini).
- Extração de texto de PDF/DOCX, persistência em `contract_analysis`, status em `contratos.analise_status`.
- Frontend (`ContratoDetalhes.tsx`) — chama a mesma edge function.

### 4. Deploy + teste
- Deploy automático da edge function.
- Testar com um contrato existente via UI.
- Validar logs da função para confirmar que a chamada vai pro endpoint Google e retorna tool call corretamente.

## Detalhes técnicos relevantes

**Diferenças de payload (Lovable Gateway → Gemini nativo):**

```text
Gateway (OpenAI-compat):           Gemini nativo:
- messages[{role,content}]         - contents[{role:'user',parts:[{text}]}]
- system role em messages          - systemInstruction:{parts:[{text}]}
- tools[{type:'function',          - tools:[{functionDeclarations:[
   function:{name,parameters}}]      {name,description,parameters}]}]
- tool_choice:{type:'function'}    - toolConfig:{functionCallingConfig:
                                       {mode:'ANY',allowedFunctionNames:[]}}
- choices[0].message.tool_calls    - candidates[0].content.parts[].functionCall
   [0].function.arguments (string)   .args (objeto JSON já parseado)
```

**Considerações:**
- Gemini não aceita `additionalProperties` em alguns lugares — pode precisar limpar os schemas se der erro.
- O parâmetro `enum` é suportado em `string`.
- Timeout do edge runtime continua sendo o gargalo principal — `gemini-2.5-flash` é rápido o suficiente.

## Fallback / Reversão

Se algo não funcionar, reverter é só recolocar a versão anterior da função (que usa `LOVABLE_API_KEY`). O secret `LOVABLE_API_KEY` continuará existindo no projeto.

## Custo esperado

- **Hoje (Lovable AI):** consumo do AI balance ($1 grátis/mês, depois pago).
- **Depois (Gemini direto):** `gemini-2.5-flash` custa ~$0.075/M tokens input + $0.30/M output. Uma análise típica de contrato (~10k tokens input + 2k output) ≈ **$0.0014 por análise** (cobrado direto no Google Cloud).

---

Posso seguir? Ao aprovar, vou pedir a `GEMINI_API_KEY` e reescrever a edge function.