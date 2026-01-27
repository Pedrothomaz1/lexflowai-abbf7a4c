
## Diagnóstico (o que provavelmente está acontecendo)
Pelo que você descreveu e pelos logs que temos, existem dois problemas possíveis (e eles podem estar acontecendo juntos):

1) **Erro 403 do próprio Google (“Você não tem acesso a esta página…”)**
   - Isso costuma acontecer quando, no Google Cloud, a **Tela de consentimento OAuth** está como **“Interno”** (só contas do Workspace da empresa) ou está em **modo “Testing”** sem o seu Gmail cadastrado como **usuário de teste**.
   - Como você está tentando com **Gmail pessoal**, se o app estiver “Interno” ou restrito, o Google bloqueia com 403.

2) **Mesmo quando o OAuth redireciona, o app não finaliza a sessão de forma consistente**
   - Hoje não existe um “callback route” dedicado (ex.: `/auth/callback`) para completar o login do OAuth.
   - Além disso, páginas com `DashboardLayout` disparam consultas no header/sidebar antes de confirmar a sessão, o que pode gerar erros 401/403 no app e dar a sensação de “não logou”.

A solução mais robusta é: **corrigir a configuração no Google Cloud** + **ajustar o app para ter fluxo de callback e proteção de rotas centralizada**.

---

## Parte A — Checklist de configuração (sem mexer em código)
### A1) Conferir a Tela de consentimento OAuth (Google Cloud)
No Google Cloud Console → “OAuth consent screen”:

- **User Type**:
  - Deve ser **External** (para permitir Gmail pessoal).
  - Se estiver **Internal**, Gmail pessoal vai dar 403 “Você não tem acesso…”.

- **Publishing status**:
  - Se estiver **Testing**, adicione seu Gmail em **Test users**.
  - Se estiver **In production**, não precisa de test users (mas precisa que a tela esteja corretamente publicada).

> Resultado esperado: ao clicar em “Entrar com Google”, você deve conseguir chegar na tela de escolha de conta/permissão sem bloqueio 403.

### A2) Conferir Credenciais OAuth (Google Cloud)
No OAuth Client ID (Web):

- **Authorized JavaScript origins**: incluir o domínio onde você está clicando o botão (ex.: o domínio `...lovableproject.com`).
- **Authorized redirect URIs**: confirmar que está usando exatamente a URL de callback do seu backend (a que o backend mostra para Google OAuth).

---

## Parte B — Ajustes no app (implementação)
### Objetivo
Garantir que:
- OAuth sempre finalize a sessão no retorno do Google (sem depender de “cair na página certa”).
- Páginas protegidas não renderizem sidebar/header (que fazem queries) antes de confirmar autenticação.
- Erros de autenticação fiquem claros (ex.: “login não concluído” vs “sem permissão”).

### Mudanças planejadas (arquitetura)
1) **Criar uma rota de callback dedicada para OAuth**
   - Nova página: `src/pages/AuthCallback.tsx` (ou similar).
   - Fluxo:
     - Ao carregar, detecta se há `code`/params no URL.
     - Chama `supabase.auth.exchangeCodeForSession(...)` (ou fluxo equivalente do SDK).
     - Em seguida, redireciona para o módulo correto (dashboard/serviços/seletor) usando a mesma lógica já existente.

2) **Alterar o Google login para redirecionar para `/auth/callback`**
   - Em `src/pages/Auth.tsx`, trocar:
     - `redirectTo: ${window.location.origin}/`
     - para:
     - `redirectTo: ${window.location.origin}/auth/callback`

3) **Centralizar o estado de autenticação (session/user)**
   - Criar um `AuthProvider` (ex.: `src/contexts/AuthContext.tsx`):
     - `session`, `user`, `loading`
     - `onAuthStateChange` para manter estado sincronizado
   - Assim o app inteiro sabe rapidamente se está logado, evitando consultas “anônimas” em páginas protegidas.

4) **Criar um guard de rotas protegidas**
   - Ex.: componente `ProtectedRoute`:
     - Se `loading`, mostra skeleton.
     - Se não tem sessão, navega para `/auth`.
     - Se tem sessão, renderiza o layout/página.

5) **Aplicar o guard nos caminhos que hoje usam DashboardLayout**
   - Ex.: `/dashboard`, `/settings`, `/contratos`, etc.
   - Isso evita que `AppSidebar` e `GlobalHeader` rodem queries enquanto ainda não há sessão.

6) **Remover chamadas Supabase dentro do callback do `onAuthStateChange` no Auth**
   - Hoje `Auth.tsx` chama `redirectByModule()` diretamente dentro do `onAuthStateChange`, e isso faz query no banco.
   - Vamos ajustar para:
     - No callback: só setar estado (sincrono) ou navegar simples
     - E deixar a busca de `user_roles` acontecer em um efeito separado (ou via callback page), evitando comportamentos instáveis.

---

## Parte C — Teste guiado (depois das mudanças)
1) Abrir o app e clicar “Entrar com Google”.
2) Confirmar que, após o Google, cai em `/auth/callback` e em seguida vai para:
   - `/dashboard` (contratos) ou `/servicos` ou `/seletor-modulo`, conforme perfil.
3) Confirmar que:
   - Não aparecem 403/401 no header/sidebar ao carregar.
   - `/settings` exige login e não carrega “meio logado”.

---

## Riscos e cuidados
- Se o 403 continuar aparecendo como página do Google mesmo após as mudanças no app, então é 100% configuração do Google Cloud (principalmente “Internal vs External” e “Testing + test users”).
- Vamos manter o fluxo atual de login por email/senha intacto.

---

## Arquivos que devem ser alterados/criados (na implementação)
- Alterar:
  - `src/pages/Auth.tsx` (redirectTo para `/auth/callback`, e ajustar lógica de onAuthStateChange)
  - `src/App.tsx` (adicionar rota `/auth/callback` e aplicar guard nas rotas protegidas)
  - `src/components/DashboardLayout.tsx` (se necessário, para depender do estado global de auth)
- Criar:
  - `src/pages/AuthCallback.tsx`
  - `src/contexts/AuthContext.tsx` (ou similar)
  - `src/components/ProtectedRoute.tsx` (ou similar)

---

## O que eu preciso de você (rápido, antes de eu implementar)
1) No Google Cloud, confirme se a “Tela de consentimento OAuth” está como **External** (não “Internal”).
2) Se estiver em **Testing**, adicione seu Gmail na lista de **Test users**.

Se isso estiver OK, a parte de código acima resolve o restante e deixa o login do Google estável no app.
