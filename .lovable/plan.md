

# Plano: Teste de Autenticação HIBP + Configuração de URLs de Produção

## Visão Geral

Este plano cobre duas tarefas principais:
1. **Teste do fluxo de cadastro/login** para validar que a verificação HIBP (Have I Been Pwned) está funcionando
2. **Configuração das URLs de redirect** para o domínio de produção após publicação

---

## Parte 1: Teste do Fluxo de Autenticação com HIBP

### Cenários de Teste

#### Teste 1: Cadastro com Senha Vazada
1. Acesse a página `/auth` e selecione a aba **Cadastro**
2. Preencha os campos:
   - Nome: `Teste HIBP`
   - Email: use um email de teste válido
   - Senha: `password123` (senha comum e vazada)
3. Clique em **Criar conta**
4. **Resultado esperado**: Erro indicando que a senha foi comprometida

#### Teste 2: Cadastro com Senha Segura
1. Acesse a página `/auth` e selecione a aba **Cadastro**
2. Preencha os campos:
   - Nome: `Usuário Teste`
   - Email: email de teste válido
   - Senha: Senha forte e única (ex: `Lex$Flow2026!Secure`)
3. Clique em **Criar conta**
4. **Resultado esperado**: Conta criada com sucesso

#### Teste 3: Login com Google OAuth
1. Acesse `/auth` e clique em **Entrar com Google**
2. Complete o fluxo de autenticação do Google
3. **Resultado esperado**: Redirecionamento para `/auth/callback` e depois para o módulo correto

---

## Parte 2: Configuração de URLs de Redirect para Produção

### Situação Atual
- **Preview URL**: `https://id-preview--9b5e925d-516b-4c9a-8bf5-96cde5168edd.lovable.app`
- **Published URL**: Ainda não publicado

### Passos Após Publicação

Após publicar a aplicação, você terá uma URL de produção (exemplo: `https://lexflowai.lovable.app` ou domínio customizado). Para que a autenticação funcione corretamente em produção, será necessário:

#### 1. Adicionar URLs de Redirect no Backend

Abra o painel do backend (Cloud View > Users > Auth Settings) e adicione as seguintes URLs:

| Tipo | URL |
|------|-----|
| Site URL | `https://SEU-DOMINIO-PRODUCAO` |
| Redirect URLs | `https://SEU-DOMINIO-PRODUCAO/auth/callback` |

#### 2. Atualizar Google OAuth (se aplicável)

Se você usa login com Google, também precisa atualizar no **Google Cloud Console**:

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Vá em **APIs & Services > Credentials**
3. Edite o OAuth Client ID do projeto
4. Em **Authorized JavaScript Origins**, adicione:
   - `https://SEU-DOMINIO-PRODUCAO`
5. Em **Authorized Redirect URIs**, adicione:
   - `https://dxllojjazxizuylbmezc.supabase.co/auth/v1/callback`

### Fluxo de Autenticação Atual

```text
+------------------+     +-------------------+     +------------------+
|   /auth          | --> | Supabase Auth     | --> | /auth/callback   |
|   (Login/Signup) |     | (OAuth/Email)     |     | (Roteamento)     |
+------------------+     +-------------------+     +------------------+
                                                           |
                    +--------------------------------------+
                    |
     +--------------v--------------+
     |      Verifica Módulo        |
     |      (user_roles table)     |
     +-----------------------------+
                    |
       +------------+------------+
       |            |            |
       v            v            v
  /dashboard   /servicos   /seletor-modulo
  (contratos)  (serviços)  (ambos)
```

---

## Resumo de Ações

### Imediato (Teste HIBP)
- Testar cadastro com senha vazada (`password123`)
- Testar cadastro com senha segura
- Testar login com credenciais válidas

### Após Publicação
1. Anotar a URL de produção gerada
2. Adicionar URL de produção nas configurações de Auth do backend
3. Atualizar Google Cloud Console com as novas URLs (se usar Google OAuth)
4. Testar fluxo completo em produção

---

## Detalhes Técnicos

### Arquivos Relevantes de Autenticação

| Arquivo | Função |
|---------|--------|
| `src/pages/Auth.tsx` | Página de login/cadastro |
| `src/pages/AuthCallback.tsx` | Processa redirect após autenticação |
| `src/contexts/AuthContext.tsx` | Gerencia estado de sessão |
| `src/components/ProtectedRoute.tsx` | Guarda rotas + verificação 2FA |

### Callbacks de Autenticação Configurados

O código atual já usa `window.location.origin` para construir URLs dinâmicas:

```typescript
// Em Auth.tsx - Google OAuth
redirectTo: `${window.location.origin}/auth/callback`

// Em Auth.tsx - Email Sign Up
emailRedirectTo: `${window.location.origin}/auth/callback`
```

Isso significa que o código **já é compatível** com qualquer domínio, desde que as URLs estejam configuradas no backend.

