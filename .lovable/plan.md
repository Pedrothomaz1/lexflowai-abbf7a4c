## Objetivo

Migrar as 4 edge functions restantes que ainda usam `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` para a **API direta do Google Gemini** (`generativelanguage.googleapis.com` + `GEMINI_API_KEY`), eliminando totalmente a dependência do AI balance do Lovable.

A `analisar-contrato-ia` já foi migrada e validada (funcionou nesta sessão). O mesmo padrão será replicado.

## Escopo

### Funções a migrar
1. **`ia-resumo-executivo`** — gera resumo executivo (JSON simples via prompt). Modelo: `gemini-2.5-flash`.
2. **`ia-sugerir-clausulas`** — sugere cláusulas (JSON simples via prompt). Modelo: `gemini-2.5-flash`.
3. **`ia-extrair-campos`** — extrai campos estruturados via **tool calling** (`registrar_analise_estruturada`). Modelo: `gemini-2.5-flash`.
4. **`ia-redline-sugerir`** — gera redline com JSON. Modelo: `gemini-2.5-pro` (mantém Pro porque é tarefa de raciocínio mais pesado).

### Fora de escopo
- Frontend (não muda).
- Schema do banco (não muda).
- Função `analisar-contrato-ia` (já migrada).

## Padrão de migração (já validado)

Para cada função, aplicar o mesmo template usado em `analisar-contrato-ia`:

**Antes (Lovable Gateway, OpenAI-compat):**
```text
POST https://ai.gateway.lovable.dev/v1/chat/completions
Authorization: Bearer LOVABLE_API_KEY
body: { model:"google/gemini-2.5-flash", messages:[...], tools:[...], tool_choice:{...} }
```

**Depois (Gemini nativo):**
```text
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_API_KEY
body: {
  systemInstruction: { parts: [{ text: <system>}] },
  contents: [{ role:"user", parts:[{ text: <user>}] }],
  tools: [{ functionDeclarations: [{ name, description, parameters }] }],   // só p/ tool calling
  toolConfig: { functionCallingConfig: { mode:"ANY", allowedFunctionNames:[...] } },
  generationConfig: { temperature: 0.3 }
}
```

**Extração da resposta:**
- JSON simples (resumo/sugestoes/redline): `candidates[0].content.parts[].text`
- Tool calling (extrair-campos): `candidates[0].content.parts[].functionCall.args` (já vem como objeto, não precisa `JSON.parse`)
- Tokens: `usageMetadata.totalTokenCount`

**Schema cleanup (só para `ia-extrair-campos`):** remover `additionalProperties` recursivamente do schema, pois Gemini não aceita esse campo.

**Tratamento de erros (alinhado ao padrão da função já migrada):**
- 429 → "Limite excedido, tente novamente"
- 403 → "GEMINI_API_KEY inválida ou sem permissão"
- 400 → "Requisição inválida ao Gemini"
- 402 não aplica (Google não usa esse código)

## Passos

1. Reescrever `supabase/functions/ia-resumo-executivo/index.ts` (estrutura simples, JSON via prompt).
2. Reescrever `supabase/functions/ia-sugerir-clausulas/index.ts` (igual ao item 1, prompt diferente).
3. Reescrever `supabase/functions/ia-extrair-campos/index.ts` (tool calling com schema convertido + cleanup `additionalProperties`).
4. Reescrever `supabase/functions/ia-redline-sugerir/index.ts` (JSON via prompt + `gemini-2.5-pro`).
5. Deploy automático (Lovable faz no save).
6. Validar: chamar cada função pela UI do contrato `3339de89-cd79-417a-86c8-78bbe68b6328` e checar logs.

## Considerações

- O `gemini-2.5-pro` na função `ia-redline-sugerir` é mais caro (~$1.25/M input + $5/M output), mas o uso é eventual e a qualidade compensa. Se quiser cortar custo, posso trocar para `flash` também — me avisa.
- O secret `LOVABLE_API_KEY` continua existindo no projeto (não vou removê-lo); fica como fallback caso precise reverter.
- Custo total esperado por contrato analisado completo (todas as funções rodando): **~$0.005–0.015**, cobrado direto na sua conta Google.

## Reversão

Se algo falhar, basta restaurar a versão anterior do arquivo (que usa `LOVABLE_API_KEY`).

---

Posso seguir com a migração das 4 funções?
