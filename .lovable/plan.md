
# Plano: Corrigir Autenticacao de Dois Fatores (TOTP)

## Problemas Identificados

1. **Segredo com tamanho incorreto**: O segredo esta sendo gerado com 20 caracteres Base32 diretamente, mas deveria ser 20 bytes convertidos para Base32 (resultando em 32 caracteres)
2. **Counter de tempo incorreto**: O timestamp esta sendo colocado em apenas 4 bytes quando TOTP requer 8 bytes para o counter
3. **QR Code externo**: Usar API externa para QR code pode causar problemas de encoding

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/totp-auth/index.ts` | Modificar | Corrigir geracao de segredo e algoritmo TOTP |
| `src/pages/TwoFactorSettings.tsx` | Modificar | Gerar QR code localmente com biblioteca |

---

## Correcoes no Edge Function

### 1. Geracao de Segredo Corrigida

```text
Problema atual:
- Gera 20 caracteres Base32 diretamente
- Resultado: segredo muito curto (20 chars)

Correcao:
- Gerar 20 bytes aleatorios
- Converter para Base32 corretamente
- Resultado: segredo com 32 caracteres
```

### 2. Algoritmo TOTP Corrigido

```text
Problema atual:
- timeView.setUint32(4, time, false) - coloca apenas 4 bytes
- Timestamps grandes podem ser truncados

Correcao:
- Dividir o time em high e low 32-bit parts
- timeView.setUint32(0, Math.floor(time / 0x100000000), false)
- timeView.setUint32(4, time >>> 0, false)
```

### 3. Codigo Corrigido para Edge Function

```typescript
// Gerar segredo de 20 bytes que resulta em 32 chars Base32
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// Encode bytes para Base32
function base32Encode(data: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of data) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
    }
  }

  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f];
  }

  return result;
}

// Counter de tempo corrigido (8 bytes completos)
async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // Usar BigInt para precisao em timestamps grandes
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);
  
  const hmac = await hmacSha1(key, new Uint8Array(buffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}
```

---

## Correcoes no Frontend

### Opcao 1: Usar biblioteca de QR Code local

Adicionar `qrcode` ou usar canvas para gerar o QR code localmente em vez de depender de API externa.

### Opcao 2: Melhorar encoding da URL

```typescript
// Garantir encoding correto
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`;
```

---

## Limpeza de Dados Antigos

Antes de testar novamente, limpar o registro de 2FA existente para gerar um novo segredo com o formato correto:

```sql
DELETE FROM user_2fa_settings WHERE user_id = 'b6b35ada-b410-4c40-97c4-5f947c866b89';
```

---

## Validacao do Formato otpauth URL

```text
Formato correto:
otpauth://totp/LexFlow:usuario@email.com?secret=ABCDEFGHIJ1234567890ABCDEFGHIJ12&issuer=LexFlow&algorithm=SHA1&digits=6&period=30

Verificacoes:
- Secret deve ter 32 caracteres Base32
- Email deve estar URL-encoded
- Issuer deve estar presente
```

---

## Resumo das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| `generateSecret()` | Gerar 20 bytes e converter para Base32 (32 chars) |
| `base32Encode()` | Nova funcao para encoding correto |
| `generateTOTP()` | Corrigir buffer de 8 bytes para counter |
| `verifyTOTP()` | Mesma correcao do counter |
| Frontend | Manter API externa mas com encoding melhorado |

---

## Teste Apos Correcao

1. Limpar registro 2FA existente
2. Clicar em "Configurar 2FA"
3. Verificar que o segredo tem 32 caracteres
4. Escanear QR code com Google Authenticator
5. Verificar que o codigo de 6 digitos funciona
