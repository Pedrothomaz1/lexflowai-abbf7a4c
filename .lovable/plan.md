

# Security RLS Fixes - Migration Plan

## Summary
7 security vulnerabilities identified. After investigation, here is the adjusted plan accounting for actual database state.

## Current State Findings
- **incident_playbooks**: Has NO `organization_id` column — must add it before applying org-scoped policies
- **mfa_requirements**: Has NO `organization_id` column — must add it before applying org-scoped policies
- **on_auth_user_created trigger**: Already exists — FIX 5 is NOT needed
- **organization_invites**: The old "Anyone can view invites" anon policy STILL exists, plus there are duplicate authenticated policies
- All other tables confirmed to have the expected structure

## Migration Plan (single migration file)

### FIX 1 — organization_invites (anon exposure)
- Drop "Anyone can view invites" (anon SELECT with `true`)
- Drop duplicate "Authenticated users can view invites" 
- Drop duplicate "Authenticated users can view invites by token"
- Create `anon_view_invite_by_token` for anon using header-based token lookup
- Keep the "Org admins can manage invites" policy unchanged
- Create a single authenticated policy scoped to org membership OR token match

### FIX 2 — incident_playbooks (missing org_id)
- Add `organization_id UUID` column (nullable initially, with FK to organizations)
- Backfill existing rows with the default org `00000000-0000-0000-0000-000000000001`
- Set column to NOT NULL after backfill
- Drop both existing policies
- Recreate with `organization_id = current_user_org()` filter

### FIX 3 — solicitacoes_compras INSERT (no role check)
- Drop existing INSERT policy
- Recreate with `has_any_role` check for `analista_juridico` and `administrador`

### FIX 4 — contract_requests INSERT (no role check)
- Drop existing INSERT policy
- Recreate with role restriction (analista_juridico, consultoria_juridica, administrador) plus service_role bypass

### FIX 5 — profiles INSERT trigger
- **SKIP** — trigger `on_auth_user_created` already exists on `auth.users`

### FIX 6 — mfa_requirements SELECT (no org filter)
- Add `organization_id UUID` column (nullable initially, with FK to organizations)
- Backfill existing rows with default org
- Set column to NOT NULL after backfill
- Drop existing SELECT policy
- Recreate with `organization_id = current_user_org()` filter
- Update the admin ALL policy to also include org filter

### FIX 7 — permissions + role_permissions (open reconnaissance)
- Drop both SELECT policies
- Recreate restricted to `administrador` role only

## Technical Details

```text
Migration file: supabase/migrations/<timestamp>_security_rls_fixes.sql

Tables affected:
  - organization_invites  (policy changes only)
  - incident_playbooks    (add column + policy changes)
  - solicitacoes_compras  (policy change only)
  - contract_requests     (policy change only)
  - mfa_requirements      (add column + policy changes)
  - permissions           (policy change only)
  - role_permissions      (policy change only)

No application code changes needed.
```

## Risk Notes
- Adding `organization_id` to `incident_playbooks` and `mfa_requirements` requires backfilling existing data. Using the legacy default org UUID for consistency with the project's established migration pattern.
- FIX 7 restricts permissions/role_permissions to admins only. The `usePermissions` hook will need admin role to function — this is the intended security posture per the audit.

