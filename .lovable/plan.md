## Problema

A tela `/onboarding` pisca e não avança porque há dois bugs interagindo:

1. **Loop de refresh em `useOnboarding`** — o `refresh` depende do objeto `organization` inteiro. O `OrganizationContext` recria essa referência a cada render, fazendo o `useCallback` mudar → `useEffect` reexecuta → `setLoading(true/false)` em loop → re-render constante.
2. **Redirect oportunista no `Onboarding.tsx`** — um `useEffect` observa `profileFlags?.onboarding_completed_at` e chama `navigate("/dashboard")`. Combinado com (1) e com a leitura paralela do mesmo campo pelo `ProtectedRoute`, qualquer race entre cargas faz a navegação disparar no meio do fluxo.

Resultado: enquanto o usuário preenche os campos, o componente remonta repetidamente e o redirect pode disparar antes da hora — daí o "pisca e não sai".

## Correções

### 1. Estabilizar dependências em `src/hooks/useOnboarding.ts`

Trocar `[user, organization]` por `[user?.id, organization?.id]` no `useCallback` do `refresh`. Strings primitivas têm igualdade referencial estável; o loop acaba.

### 2. Remover o redirect implícito em `src/pages/Onboarding.tsx`

Apagar o `useEffect` (linhas 50-54) que faz `navigate("/dashboard")` quando `profileFlags.onboarding_completed_at` está setado. Quem leva o usuário ao dashboard são apenas:
- `finishNow()` (botão "Ir para o dashboard" no passo 4)
- `handleSkip()` (botão "Pular por enquanto")
- O `ProtectedRoute`, que já redireciona usuários com onboarding concluído ANTES de montar o componente

Sem esse efeito, não há mais navegação no meio do fluxo.

### 3. Consolidar checagem de "onboarding feito" (opcional, mas recomendado)

Hoje `ProtectedRoute` faz um `SELECT onboarding_completed_at, onboarding_skipped` separado do `useOnboarding`. Para evitar divergência, fazer o `ProtectedRoute` reagir a mudanças após `finishNow()`:
- Adicionar refetch do `onboardingDone` quando a rota muda (já acontece naturalmente, pois cada rota cria novo `ProtectedRoute`).
- Nenhuma mudança extra é necessária se (1) e (2) forem feitas; cito aqui apenas para confirmar que não introduz regressão.

## Validação

1. Logar com usuário novo → ir para `/onboarding` direto após signup.
2. Preencher nome no passo 1 → clicar Continuar → deve ir para passo 2 sem flicker.
3. Preencher e-mails no passo 2 → Continuar → passo 3.
4. Preencher contrato no passo 3 → Continuar → passo 4.
5. Clicar "Ir para o dashboard" → deve cair em `/dashboard` uma única vez, sem voltar.
6. Recarregar `/onboarding` depois de completo → `ProtectedRoute` redireciona para `/dashboard` (comportamento esperado).

## Risco

Baixo. Mudanças são localizadas em 2 arquivos, não tocam RLS nem migrations, e o fluxo de pular/completar continua intacto.