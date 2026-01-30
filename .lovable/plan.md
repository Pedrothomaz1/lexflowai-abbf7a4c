
## Plano: Corrigir Acesso Público aos Avatares

### Diagnóstico

A foto foi enviada corretamente, mas não aparece porque:

1. O bucket `contratos-documentos` está configurado como **privado** (`public: false`)
2. A URL salva usa o caminho `/object/public/...` que requer bucket público
3. Resultado: Erro 404 "Bucket not found" ao tentar exibir a imagem

### Solução

Alterar o bucket para **público** (`public: true`). Isso é seguro porque:
- Já existem políticas RLS que controlam quem pode fazer upload/deletar
- A política "Avatar images are publicly accessible" já permite leitura pública dos avatares
- Apenas a **leitura** de arquivos públicos será liberada (outras operações continuam protegidas)

### Alteração Necessária

```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'contratos-documentos';
```

### Comportamento Após a Correção

```text
Antes:
┌─────────────────────────────────────────────────────────┐
│ GET /object/public/contratos-documentos/.../avatar.jpg  │
│                     ↓                                    │
│              404 - Bucket not found                      │
└─────────────────────────────────────────────────────────┘

Depois:
┌─────────────────────────────────────────────────────────┐
│ GET /object/public/contratos-documentos/.../avatar.jpg  │
│                     ↓                                    │
│              ✅ Imagem carregada                         │
└─────────────────────────────────────────────────────────┘
```

### Segurança

A mudança não compromete a segurança porque:
- **Upload**: Continua exigindo autenticação + pasta do próprio usuário
- **Delete**: Continua restrito ao dono do arquivo ou admin
- **Leitura**: Já era permitida pela política RLS existente

### Seção Técnica

**Arquivos afetados**: Nenhum arquivo de código precisa ser alterado

**Migração SQL**:
```sql
-- Tornar o bucket público para permitir acesso via URL pública
UPDATE storage.buckets 
SET public = true 
WHERE id = 'contratos-documentos';
```

### Resultado Esperado

- Sua foto de perfil aparecerá imediatamente no header
- Avatares de outros usuários também funcionarão
- Demais documentos do bucket continuam protegidos por RLS
