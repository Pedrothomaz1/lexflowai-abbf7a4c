-- FIX: contract_approvals INSERT — restrict to appropriate roles
DROP POLICY IF EXISTS "mt_contract_approvals_insert" ON public.contract_approvals;

CREATE POLICY "mt_contract_approvals_insert"
ON public.contract_approvals
FOR INSERT
TO public
WITH CHECK (
  organization_id = current_user_org()
  AND auth.uid() = aprovador_id
  AND has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'consultoria_juridica'::app_role])
);

-- FIX: user_roles INSERT — only administrador can manage roles (remove org admin escalation)
DROP POLICY IF EXISTS "mt_user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "mt_user_roles_update" ON public.user_roles;

CREATE POLICY "mt_user_roles_insert"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  organization_id = current_user_org()
  AND has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "mt_user_roles_update"
ON public.user_roles
FOR UPDATE
TO public
USING (
  organization_id = current_user_org()
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- FIX: contract_requests anonymous — require organization_id (remove orphaned PII)
DROP POLICY IF EXISTS "mt_contract_requests_insert" ON public.contract_requests;

CREATE POLICY "mt_contract_requests_insert"
ON public.contract_requests
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() IS NOT NULL AND organization_id = current_user_org())
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);