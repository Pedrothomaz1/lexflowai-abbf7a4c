

## Problem

When changing a contract's status (or any field), the database trigger `create_contract_version()` fires to save a version snapshot. However, it does **not** include the `organization_id` column in the INSERT statement, causing the error:

> "null value in column 'organization_id' of relation 'contract_versions' violates not-null constraint"

This blocks all contract updates (status changes, edits, approvals, etc.).

## Root Cause

The trigger function `create_contract_version()` inserts into `contract_versions` with these columns: `contrato_id`, `versao`, `snapshot`, `alteracoes`, `created_by` -- but omits `organization_id`.

Since `contract_versions.organization_id` is `NOT NULL`, the insert fails.

## Fix

A single database migration to update the `create_contract_version()` function, adding `NEW.organization_id` to the INSERT statement:

```sql
-- Add organization_id to the INSERT in create_contract_version()
INSERT INTO public.contract_versions (
  contrato_id,
  versao,
  snapshot,
  alteracoes,
  created_by,
  organization_id  -- ADD THIS
) VALUES (
  NEW.id,
  NEW.versao,
  ...,
  changes,
  auth.uid(),
  NEW.organization_id  -- ADD THIS
);
```

No frontend code changes are needed -- the trigger runs server-side automatically.

## Impact

Once applied, all contract modifications (status changes, field edits, approvals) will work again without errors.

