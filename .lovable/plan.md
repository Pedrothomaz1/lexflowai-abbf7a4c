# Análise IA: processamento em background + realtime

## Contexto
A edge function `analisar-contrato-ia` já aceita `async: true` e usa `EdgeRuntime.waitUntil` para processar em background, retornando HTTP 200 imediatamente. Mas o frontend ainda chama no modo síncrono (sem `async: true`) e implementa um polling complexo que tenta corrida entre invoke + query — fonte do erro "signal aborted" quando a conexão cai antes da resposta.

Esta task fecha o ciclo:

## Mudanças

### 1. `supabase/functions/analisar-contrato-ia/index.ts`
Antes de disparar a análise em background, gravar um registro de status `processing` em `contract_analysis` (ou em coluna nova `analise_status` na própria tabela `contratos`) para que o frontend saiba que está em andamento e mostre o estado correto mesmo após F5. Ao final, marcar como `done` ou `failed` com a mensagem de erro.

Opção escolhida: adicionar coluna `analise_status` (`idle|processing|done|failed`) + `analise_error` em `contratos`. Mais simples que poluir `contract_analysis` com linhas vazias.

### 2. Migração SQL
- `ALTER TABLE contratos ADD COLUMN analise_status text DEFAULT 'idle'`
- `ALTER TABLE contratos ADD COLUMN analise_error text`
- `ALTER TABLE contratos ADD COLUMN analise_iniciada_em timestamptz`
- Habilitar realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE contratos` (caso ainda não esteja).

### 3. `src/pages/ContratoDetalhes.tsx` — `handleAnalisarIA`
Reescrever de forma simples:
1. Chamar `invoke("analisar-contrato-ia", { body: { ..., async: true } })` — retorna em < 1s.
2. Marcar UI como `isAnalyzing = true` (já vem do realtime, mas iniciar otimista).
3. Remover o loop manual de polling (`while`, `Promise.race`).
4. Adicionar um `useEffect` com canal Supabase Realtime escutando `postgres_changes` em `contratos` filtrando pelo `id`. Quando `analise_status` virar `done`, recarregar `analise` via `fetchAnalise()`; quando `failed`, mostrar toast de erro com `analise_error`.
5. Fallback de segurança: ao montar, se `contrato.analise_status === 'processing'`, deixar `isAnalyzing=true` e aguardar realtime (cobre o caso de o usuário sair e voltar).

### 4. Botão "Analisar contrato"
Ficar desabilitado enquanto `analise_status === 'processing'`, exibindo "Analisando…" — assim o usuário não dispara múltiplas vezes.

## Fora do escopo
- Não mexer nas skills/prompts nem no modelo (`gemini-2.5-flash` continua).
- Não criar tabela nova de jobs — `contratos.analise_status` é suficiente.
- Não tocar no gate validator nem em outras edge functions.

## Resultado esperado
- Clicar em "Analisar contrato" retorna em < 1s; UI mostra "Analisando…".
- O usuário pode navegar, dar F5 ou fechar a aba: a análise continua na edge.
- Quando termina, o card de análise aparece sozinho (via realtime). Se falhar, toast com erro real.
- Fim do erro "signal aborted" / "Failed to send a request to the Edge Function".
