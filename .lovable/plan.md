

# Plano: Corrigir Upload de Avatar (Erro de RLS)

## Problema Identificado

O erro "new row violates row-level security policy" ocorre porque a politica de INSERT do bucket de storage exige que o **primeiro nivel da pasta** seja o UUID do usuario autenticado.

### Politica atual do Storage

```sql
-- Politica de INSERT no bucket "contratos-documentos"
with_check: (storage.foldername(name))[1] = auth.uid()::text
```

### Codigo atual (incorreto)

```typescript
const fileName = `avatars/${userId}/avatar-${Date.now()}.${fileExt}`;
// Resultado: avatars/b6b35ada-b410-4c40.../avatar-123456.jpg
// O primeiro nivel e "avatars", nao o UUID do usuario
```

### Codigo corrigido

```typescript
const fileName = `${userId}/avatars/avatar-${Date.now()}.${fileExt}`;
// Resultado: b6b35ada-b410-4c40.../avatars/avatar-123456.jpg
// O primeiro nivel e o UUID do usuario - CORRETO!
```

---

## Arquivo a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/Settings/AvatarUpload.tsx` | Modificar | Corrigir o caminho do arquivo para seguir a estrutura `{userId}/avatars/...` |

---

## Alteracao Detalhada

### Antes (linha 68)

```typescript
const fileName = `avatars/${userId}/avatar-${Date.now()}.${fileExt}`;
```

### Depois

```typescript
const fileName = `${userId}/avatars/avatar-${Date.now()}.${fileExt}`;
```

---

## Por que funciona

A politica RLS do storage usa a funcao `storage.foldername(name)` que retorna um array com os niveis do caminho:

```text
Caminho: "b6b35ada-b410-4c40/avatars/avatar.jpg"
foldername()[1] = "b6b35ada-b410-4c40"  <-- Primeiro nivel

Verificacao: foldername()[1] = auth.uid()::text
Se o usuario autenticado tem o mesmo UUID, o upload e permitido.
```

---

## Resumo

Uma unica alteracao de linha que inverte a ordem do caminho de `avatars/{userId}/` para `{userId}/avatars/` resolve o problema de RLS, mantendo a organizacao logica dos arquivos e respeitando a politica de seguranca existente.

