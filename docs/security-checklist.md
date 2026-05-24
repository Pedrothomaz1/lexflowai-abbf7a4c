# Checklist de Segurança — Padrão LexFlow

Template obrigatório para todos os projetos criados no Lovable.

---

## 5 Regras Obrigatórias

### 1. RLS Habilitado em Todas as Tabelas

Toda tabela criada **deve** ter Row Level Security ativado.

```sql
ALTER TABLE public.nome_tabela ENABLE ROW LEVEL SECURITY;
```

**Verificação rápida:**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

> Se retornar linhas, corrija imediatamente.

---

### 2. Políticas com `auth.uid()` e `organization_id`

Todas as policies devem usar isolamento multi-tenant:

```sql
-- Padrão SELECT
CREATE POLICY "Org members can view"
ON public.nome_tabela FOR SELECT
TO authenticated
USING (organization_id = current_user_org());

-- Padrão INSERT
CREATE POLICY "Org members can insert"
ON public.nome_tabela FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = current_user_org()
  AND has_any_role(auth.uid(), ARRAY['administrador', 'analista_juridico']::app_role[])
);
```

**Verificação rápida:**

```sql
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
```

---

### 3. `service_role` Apenas no Backend

A chave `SUPABASE_SERVICE_ROLE_KEY` **nunca** deve aparecer no frontend.

```typescript
// ❌ PROIBIDO em src/
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ PERMITIDO apenas em Edge Functions
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```

**Verificação rápida:**

```bash
grep -r "service_role\|SERVICE_ROLE" src/ --include="*.ts" --include="*.tsx"
```

> Se retornar resultados, remova imediatamente.

---

### 4. Storage Privado por Padrão

Buckets devem ser criados com `is_public: false`. Acesso via URLs assinadas.

```typescript
// ✅ Criar URL assinada (expira em 1h)
const { data } = await supabase.storage
  .from("bucket-privado")
  .createSignedUrl("caminho/arquivo.pdf", 3600);

// ❌ NUNCA usar getPublicUrl para dados sensíveis
```

---

### 5. MCP sem `service_role` em Produção

Conectores MCP **nunca** devem usar a chave de serviço em ambientes de produção. Use apenas a `anon key` com RLS ativo.

---

## Padrões de Código

### Função `SECURITY DEFINER` para Permissões

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Insert com `organization_id` Obrigatório

```typescript
const { error } = await supabase
  .from("nome_tabela")
  .insert({
    ...dados,
    organization_id: currentOrganizationId, // SEMPRE incluir
  });
```

---

## Como Usar em Novos Projetos

No chat do novo projeto no Lovable:

```
@LexFlow aplique o checklist de segurança de docs/security-checklist.md neste projeto
```

---

*Última atualização: 2026-04-09*
