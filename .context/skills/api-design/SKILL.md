---
type: skill
name: Api Design
description: Design RESTful APIs following best practices
skillSlug: api-design
phases: [P, R]
generated: 2026-05-23
status: filled
scaffoldVersion: "2.0.0"
---

# API Design

## When to Use

Ativar ao projetar novas edge functions, RPCs do Supabase ou endpoints de integração no LexFlow.

## Instructions

1. **Definir o endpoint**:
   - **Edge Function** (`supabase/functions/nome/`): Para lógica complexa, integrações externas, processamento assíncrono
   - **RPC** (`supabase.rpc('nome')`): Para queries complexas que não cabem em simples SELECT/INSERT
   - **PostgREST** (direto via client): Para CRUD simples com RLS

2. **Seguir padrão de resposta do LexFlow**:
   ```typescript
   // Sucesso
   { success: true, data: T }

   // Erro de validação (HTTP 200 — não quebra fluxo do cliente)
   { success: false, error: "Descrição do erro" }

   // Erro excepcional (HTTP 4xx/5xx — apenas erros realmente excepcionais)
   new Response(JSON.stringify({ error: "msg" }), { status: 500 })
   ```

3. **Autenticação e autorização**:
   - Edge functions recebem Bearer token via header `Authorization`
   - Usar `createClient(url, key, { headers: { Authorization } })` para contexto de usuário
   - Para operações internas: usar `service_role` key
   - Validar permissões com `has_role()` ou `has_permission()`

4. **Input validation**:
   ```typescript
   const { campo1, campo2 } = await req.json();
   if (!campo1 || typeof campo1 !== 'string') {
     return new Response(
       JSON.stringify({ success: false, error: "campo1 é obrigatório" }),
       { headers: { "Content-Type": "application/json" } }
     );
   }
   ```

5. **Naming conventions**:
   - Edge functions: kebab-case (`gerar-documento`, `ia-extrair-campos`)
   - RPCs: snake_case (`dash_kpi_contratos`, `approve_organization`)
   - Prefixos: `dash_` (dashboard), `ia_` (IA), `super_admin_` (admin)

6. **Documentar**:
   ```markdown
   ### `nome-da-funcao`
   - **Método**: POST
   - **Auth**: Bearer token / service_role
   - **Input**: `{ campo: tipo }`
   - **Output**: `{ success: boolean, data?: T }`
   - **Erros**: Listagem de erros possíveis
   ```

## Examples

### Edge function
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { campo1 } = await req.json();
    // ... lógica
    return new Response(
      JSON.stringify({ success: true, data: resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### RPC
```sql
CREATE OR REPLACE FUNCTION dash_kpi_contratos(org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'ativos', COUNT(*) FILTER (WHERE status = 'ativo')
    )
    FROM contratos
    WHERE organization_id = org_id
  );
END;
$$;
```
