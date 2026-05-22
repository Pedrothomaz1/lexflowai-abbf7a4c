# Auth Tests — src/__tests__/auth/

Cobertura completa de testes para `src/pages/Auth.tsx` com foco em autenticação, 2FA, session management e error handling.

## Arquivos

- **Auth.test.tsx** — Testes principais (AC 1-5)
- **auth.fixtures.ts** — Mocks de Supabase, Router, Toast
- **README.md** — Esta documentação

## Executar Testes

```bash
# Rodar apenas testes de Auth
npm run test -- src/__tests__/auth/

# Rodar com coverage
npm run test:coverage -- src/__tests__/auth/

# Watch mode
npm run test:watch -- src/__tests__/auth/
```

## Padrão de Testes: Arrange-Act-Assert (AAA)

Todos os testes seguem este padrão:

```typescript
it('descrição do teste', async () => {
  // Arrange: Setup inicial
  const mockSupabase = createMockSupabaseClient();

  // Act: Executar ação
  const { container } = render(<Auth />);

  // Assert: Validar resultado
  expect(container).toBeTruthy();
});
```

## Mocks Disponíveis

### Supabase Auth
```typescript
mockSupabase.auth.signInWithOAuth()      // OAuth2 login
mockSupabase.auth.signInWithPassword()   // Email/password login
mockSupabase.auth.signUp()               // Signup
mockSupabase.auth.signOut()              // Logout
mockSupabase.auth.getSession()           // Get current session
mockSupabase.auth.verifyOtp()            // Verify TOTP
mockSupabase.auth.refreshSession()       // Refresh access token
```

### Dados de Teste
```typescript
testCredentials.valid        // Email/password válidos
testCredentials.invalid      // Email/password inválidos
testCredentials.signup       // Dados para signup
sessionTestData.validSession // Session válida
sessionTestData.expiredSession // Session expirada
totpTestData.validToken      // TOTP válido
authErrors.*                 // Erros de auth
```

## Cobertura Alvo

- **AC 1**: OAuth2 login, email/password login, password validation — 90%
- **AC 2**: TOTP generation, validation, expiration, invalid codes — 85%
- **AC 3**: Session creation, token storage, expiration, refresh — 75%
- **AC 4**: Logout, token removal — 90%
- **AC 5**: Network errors, server errors, credential errors — 85%

**Total Target**: 85% line coverage de Auth.tsx

## Fluxos de Teste

### 1. Login via OAuth2 (Google)
1. Usuário aceita termos
2. Clica "Login com Google"
3. Supabase retorna token
4. Session é criada
5. User redirecionado para /auth/callback

### 2. Login via Email/Password
1. Preencher email e password
2. Aceitar termos
3. Submeter form
4. Validação de campos (password >= 8 chars)
5. Se válido: session criada, redirect
6. Se inválido: erro exibido

### 3. 2FA/TOTP Flow
1. User ativa 2FA
2. QR code é exibido
3. User scane com autenticador
4. TOTP token é gerado (válido por 30s)
5. User insere código no form
6. Se válido: auth completa
7. Se expirado/inválido: erro

### 4. Session Management
1. Session criada após login
2. Access token em httpOnly cookie (não localStorage)
3. Session expira após 24h
4. Refresh token permite renovação
5. getSession() retorna session atual

### 5. Logout
1. User clica logout
2. signOut() é chamado
3. Session é destruída
4. Tokens são removidos
5. User redirecionado para /

## Exemplo: Adicionar Novo Teste

```typescript
describe('AC X: Novo recurso', () => {
  it('descrição do teste', async () => {
    // Setup
    const mockSupabase = createMockSupabaseClient();

    // Mock resposta específica
    vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: 'test' }, session: sessionTestData.validSession },
      error: null,
    });

    // Render e act
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Assert
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });
});
```

## Troubleshooting

### Erro: "Cannot find module '@/hooks/use-toast'"
→ Certificar que hook está mockado em beforeEach

### Erro: "Container is not defined"
→ Usar `const { container } = render(...)` do React Testing Library

### Erro: "Timeout waiting for element"
→ Usar `waitFor()` para async operations, aumentar timeout se necessário

### Coverage < Target
→ Adicionar mais testes para casos não cobertos (use coverage report)

## Referências

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [TOTP Standards](https://datatracker.ietf.org/doc/html/rfc6238)
