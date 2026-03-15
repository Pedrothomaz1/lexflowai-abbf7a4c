-- Drop the existing update policy and recreate with explicit WITH CHECK
DROP POLICY IF EXISTS "mt_contratos_update" ON public.contratos;

CREATE POLICY "mt_contratos_update"
ON public.contratos FOR UPDATE
TO public
USING (
  (organization_id = current_user_org()) 
  AND (
    has_role(auth.uid(), 'administrador'::app_role) 
    OR has_role(auth.uid(), 'consultoria_juridica'::app_role) 
    OR (
      has_role(auth.uid(), 'analista_juridico'::app_role) 
      AND (status = 'rascunho'::contract_status) 
      AND (created_by = auth.uid())
    )
  )
)
WITH CHECK (
  (organization_id = current_user_org()) 
  AND (
    has_role(auth.uid(), 'administrador'::app_role) 
    OR has_role(auth.uid(), 'consultoria_juridica'::app_role) 
    OR (
      has_role(auth.uid(), 'analista_juridico'::app_role) 
      AND (status = 'rascunho'::contract_status) 
      AND (created_by = auth.uid())
    )
  )
);