-- Corrigir politica RLS: apenas consultores e admins podem ver análises
-- ou o criador do contrato relacionado

DROP POLICY IF EXISTS "Authenticated users can view analysis" ON contract_analysis;

CREATE POLICY "Authorized users can view analysis"
ON contract_analysis
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role])
  OR EXISTS (
    SELECT 1 FROM contratos 
    WHERE contratos.id = contract_analysis.contrato_id 
    AND contratos.created_by = auth.uid()
  )
);