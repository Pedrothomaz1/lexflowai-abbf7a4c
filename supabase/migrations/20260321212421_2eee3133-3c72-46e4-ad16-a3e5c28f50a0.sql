
-- =============================================================
-- SECURITY RLS FIXES — 6 vulnerabilities (FIX 5 skipped)
-- =============================================================

-- ===================== FIX 1: organization_invites =====================
-- Drop dangerous anon policy that leaks all invites
DROP POLICY IF EXISTS "Anyone can view invites" ON organization_invites;
-- Drop duplicate authenticated policies
DROP POLICY IF EXISTS "Authenticated users can view invites" ON organization_invites;
DROP POLICY IF EXISTS "Authenticated users can view invites by token" ON organization_invites;

-- Anon: only view invite if they provide the correct token via header
CREATE POLICY "anon_view_invite_by_token" ON organization_invites
  FOR SELECT TO anon
  USING (token = current_setting('request.headers.x-invite-token', true));

-- Authenticated: view invites for own org OR by matching token
CREATE POLICY "authenticated_view_invites" ON organization_invites
  FOR SELECT TO authenticated
  USING (
    organization_id = current_user_org()
    OR token = current_setting('request.headers.x-invite-token', true)
  );

-- ===================== FIX 2: incident_playbooks =====================
-- Add organization_id column
ALTER TABLE incident_playbooks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill existing rows with default org
UPDATE incident_playbooks SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Set NOT NULL
ALTER TABLE incident_playbooks ALTER COLUMN organization_id SET NOT NULL;

-- Drop old policies (no org filter)
DROP POLICY IF EXISTS "authorized_view_playbooks" ON incident_playbooks;
DROP POLICY IF EXISTS "admins_manage_playbooks" ON incident_playbooks;

-- Recreate with org filter
CREATE POLICY "authorized_view_playbooks" ON incident_playbooks
  FOR SELECT TO public
  USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
  );

CREATE POLICY "admins_manage_playbooks" ON incident_playbooks
  FOR ALL TO public
  USING (
    organization_id = current_user_org()
    AND has_role(auth.uid(), 'administrador'::app_role)
  );

-- ===================== FIX 3: solicitacoes_compras INSERT =====================
DROP POLICY IF EXISTS "mt_solicitacoes_compras_insert" ON solicitacoes_compras;

CREATE POLICY "mt_solicitacoes_compras_insert" ON solicitacoes_compras
  FOR INSERT TO public
  WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'administrador'::app_role])
  );

-- ===================== FIX 4: contract_requests INSERT =====================
DROP POLICY IF EXISTS "mt_contract_requests_insert" ON contract_requests;

CREATE POLICY "mt_contract_requests_insert" ON contract_requests
  FOR INSERT TO public
  WITH CHECK (
    (
      organization_id = current_user_org()
      AND has_any_role(auth.uid(), ARRAY[
        'analista_juridico'::app_role,
        'consultoria_juridica'::app_role,
        'administrador'::app_role
      ])
    )
    OR (current_setting('request.jwt.claim.role', true) = 'service_role')
  );

-- ===================== FIX 6: mfa_requirements SELECT =====================
-- Add organization_id column
ALTER TABLE mfa_requirements ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill existing rows with default org
UPDATE mfa_requirements SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Set NOT NULL
ALTER TABLE mfa_requirements ALTER COLUMN organization_id SET NOT NULL;

-- Drop old SELECT policy (no org filter)
DROP POLICY IF EXISTS "Authenticated users can view mfa_requirements" ON mfa_requirements;

-- Recreate with org filter
CREATE POLICY "Authenticated users can view mfa_requirements" ON mfa_requirements
  FOR SELECT TO public
  USING (
    auth.uid() IS NOT NULL
    AND organization_id = current_user_org()
  );

-- Also update admin ALL policy to include org filter
DROP POLICY IF EXISTS "Admins can manage mfa_requirements" ON mfa_requirements;

CREATE POLICY "Admins can manage mfa_requirements" ON mfa_requirements
  FOR ALL TO public
  USING (
    organization_id = current_user_org()
    AND has_role(auth.uid(), 'administrador'::app_role)
  );

-- ===================== FIX 7: permissions + role_permissions =====================
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;

CREATE POLICY "Admins can view permissions" ON permissions
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON role_permissions;

CREATE POLICY "Admins can view role_permissions" ON role_permissions
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'administrador'::app_role));
