

## Fix: Invite Edge Function CORS Blocking Production Requests

### Problem
The `enviar-convite-organizacao` edge function has a hardcoded `ALLOWED_ORIGINS` list that only includes `localhost` URLs. Requests from the published app (`lexflowai.lovable.app`) and the preview (`id-preview--...lovable.app`) are rejected with a 403 "Origin not allowed" before any logic runs.

### Solution
Replace the restrictive CORS origin list with the standard `Access-Control-Allow-Origin: '*'` pattern used by all other edge functions in the project. Since the function already validates the user via the `Authorization` header (JWT), origin-based CORS restrictions add no meaningful security.

### Changes

**1. Update `supabase/functions/enviar-convite-organizacao/index.ts`**
- Remove the `ALLOWED_ORIGINS` array and `getCorsHeaders()` function
- Replace with the standard `corsHeaders` object (`'Access-Control-Allow-Origin': '*'`)
- Update all response headers to use the simplified `corsHeaders`
- Remove the 403 origin-check block

**2. Redeploy the edge function**
- Deploy via `deploy_edge_functions` so the fix takes effect immediately

### Technical Detail
The current restrictive CORS list:
```
localhost:8080, localhost:5173, localhost:3000, ALLOWED_ORIGIN env var
```
None of these match `lexflowai.lovable.app` or the preview domain, so every production request is blocked before reaching the invite logic.

