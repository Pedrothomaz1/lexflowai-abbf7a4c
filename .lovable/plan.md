
# Plano: Tela de Autenticação B2B com Conformidade LGPD

## Visão Geral
Aprimorar a tela de autenticação existente (`/auth`) para incluir requisitos de conformidade LGPD enterprise, criar a página de Termos de Uso (`/termos`), e implementar o backend para registro de aceite.

---

## Arquitetura do Fluxo

```text
+-------------------+     +---------------------+     +-------------------+
|   Tela /auth      |     |  Aceite LGPD        |     |  compliance_logs  |
|                   |     |                     |     |                   |
| [x] Checkbox      | --> |  Validar marcado    | --> |  INSERT log       |
|     obrigatório   |     |  antes de submit    |     |  com IP, versões  |
|                   |     |                     |     |                   |
| [ Entrar ]        |     |  Após signup/login  |     |                   |
| (desabilitado)    |     |  sucesso: log       |     |                   |
+-------------------+     +---------------------+     +-------------------+
```

---

## Mudanças Necessárias

### 1. Criar página de Termos de Uso (`/termos`)
**Arquivo:** `src/pages/TermosDeUso.tsx`

- Layout idêntico à página `/privacidade` existente
- Conteúdo completo dos termos conforme especificado
- Badge de versão: "v1.0" + data de atualização
- Navegação lateral com seções clicáveis

### 2. Atualizar página de Privacidade (`/privacidade`)
**Arquivo:** `src/pages/Privacidade.tsx`

- Atualizar conteúdo para o novo texto "LEXFLOW AI"
- Adicionar badge de versão para rastreamento

### 3. Atualizar tela de autenticação (`/auth`)
**Arquivo:** `src/pages/Auth.tsx`

Mudanças na interface:
- Adicionar checkbox obrigatório com label LGPD
- Links clicáveis para `/termos` e `/privacidade`
- Botões "Entrar" e "Criar conta" desabilitados até checkbox marcado
- Texto legal completo abaixo do formulário

Mudanças na lógica:
- Estado `termsAccepted` controlando habilitação do botão
- Após login/signup bem-sucedido, registrar aceite no backend

### 4. Criar edge function para log de aceite
**Arquivo:** `supabase/functions/registrar-aceite-lgpd/index.ts`

Responsabilidades:
- Receber user_id após autenticação
- Capturar IP do request
- Registrar em `compliance_logs`:
  - `tipo_evento`: 'consent_given'
  - `entidade`: 'termos_e_privacidade'
  - `user_id`: ID do usuário
  - `ip_address`: IP capturado
  - `dados_afetados`: { versao_termos, versao_privacidade, timestamp }
  - `base_legal`: 'LGPD Art. 7º, I - Consentimento'

### 5. Atualizar rotas em App.tsx
**Arquivo:** `src/App.tsx`

- Adicionar rota `/termos` → `<TermosDeUso />`

---

## Detalhes Técnicos

### Interface do Checkbox

```typescript
// Estado
const [termsAccepted, setTermsAccepted] = useState(false);

// Checkbox
<Checkbox 
  id="terms-checkbox"
  checked={termsAccepted}
  onCheckedChange={setTermsAccepted}
/>
<Label htmlFor="terms-checkbox">
  Declaro que li e concordo com os{" "}
  <Link to="/termos">Termos de Uso</Link>{" "}
  e estou ciente da{" "}
  <Link to="/privacidade">Política de Privacidade</Link>.
</Label>

// Botão desabilitado
<Button disabled={loading || !termsAccepted}>
  Entrar
</Button>
```

### Registro de Aceite

```typescript
// Após login/signup bem-sucedido
const registrarAceiteLGPD = async (userId: string) => {
  await supabase.functions.invoke('registrar-aceite-lgpd', {
    body: {
      user_id: userId,
      versao_termos: '1.0',
      versao_privacidade: '1.0',
    }
  });
};
```

### Edge Function

```typescript
// registrar-aceite-lgpd/index.ts
Deno.serve(async (req) => {
  const { user_id, versao_termos, versao_privacidade } = await req.json();
  
  // Capturar IP
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // Inserir em compliance_logs
  await supabaseAdmin.from('compliance_logs').insert({
    tipo_evento: 'consent_given',
    entidade: 'termos_e_privacidade',
    user_id,
    ip_address: ip,
    organization_id: // será preenchido após onboarding
    dados_afetados: {
      versao_termos,
      versao_privacidade,
      aceite_em: new Date().toISOString(),
    },
    base_legal: 'LGPD Art. 7º, I - Consentimento do titular',
  });
  
  return new Response(JSON.stringify({ success: true }));
});
```

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   ├── Auth.tsx              (modificar - adicionar checkbox LGPD)
│   ├── TermosDeUso.tsx       (criar - nova página)
│   └── Privacidade.tsx       (modificar - atualizar conteúdo)
├── App.tsx                   (modificar - adicionar rota /termos)

supabase/
├── functions/
│   └── registrar-aceite-lgpd/
│       └── index.ts          (criar - edge function)
└── config.toml               (modificar - adicionar função)
```

---

## Pontos de Conformidade LGPD

| Requisito | Implementação |
|-----------|---------------|
| Consentimento expresso | Checkbox obrigatório antes de prosseguir |
| Transparência | Links visíveis para Termos e Privacidade |
| Registro para auditoria | Log em `compliance_logs` com IP e versões |
| Revogabilidade | Versões rastreáveis permitem gestão de mudanças |
| Base legal documentada | Campo `base_legal` no registro |

---

## Considerações de Segurança

1. **RLS em compliance_logs**: Já configurado - INSERT permitido para todos, SELECT restrito a administradores
2. **Edge function**: Usará service role key para inserir logs independente do estado de autenticação do usuário
3. **Versionamento**: Termos e Privacidade terão badges de versão para rastreabilidade
4. **IP Address**: Capturado via headers do request na edge function

---

## Resultado Esperado

- Botão de login/cadastro permanece desabilitado até checkbox marcado
- Após autenticação, log de aceite registrado automaticamente
- Páginas de Termos e Privacidade acessíveis publicamente
- Sistema pronto para auditoria enterprise LGPD
