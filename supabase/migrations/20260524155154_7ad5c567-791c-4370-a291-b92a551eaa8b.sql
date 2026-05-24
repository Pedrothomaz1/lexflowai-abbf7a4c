CREATE OR REPLACE FUNCTION public.check_gate2_completo(_contrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  v_faltantes text[] := ARRAY[]::text[];
  v_revisao_aprovada boolean;
  v_compliance_pendente int;
BEGIN
  SELECT * INTO c FROM public.contratos WHERE id = _contrato_id;
  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Contrato não encontrado');
  END IF;

  IF NOT (public.check_gate1_completo(_contrato_id) ->> 'ok')::boolean THEN
    v_faltantes := array_append(v_faltantes, 'gate1_incompleto');
  END IF;

  IF c.nivel_risco IS NULL THEN v_faltantes := array_append(v_faltantes, 'nivel_risco'); END IF;
  IF c.nivel_confidencialidade IS NULL THEN v_faltantes := array_append(v_faltantes, 'nivel_confidencialidade'); END IF;

  IF c.nivel_risco IN ('alto','critico') THEN
    IF c.due_diligence_status IS DISTINCT FROM 'aprovada'::due_diligence_enum
       AND c.due_diligence_status IS DISTINCT FROM 'dispensada'::due_diligence_enum THEN
      v_faltantes := array_append(v_faltantes, 'due_diligence_aprovada');
    END IF;
    IF c.sanction_check_status IS DISTINCT FROM 'limpo'::sanction_check_enum THEN
      v_faltantes := array_append(v_faltantes, 'sanction_check_limpo');
    END IF;
  END IF;

  SELECT (decisao IN ('aprovado','aprovado_com_ressalvas')) INTO v_revisao_aprovada
  FROM public.intake_legal_reviews
  WHERE contrato_id = _contrato_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_revisao_aprovada IS NOT TRUE THEN
    v_faltantes := array_append(v_faltantes, 'revisao_legal_aprovada');
  END IF;

  SELECT COUNT(*) INTO v_compliance_pendente
  FROM public.contract_compliance_status ccs
  JOIN public.compliance_items ci ON ci.id = ccs.item_id
  WHERE ccs.contrato_id = _contrato_id
    AND ci.obrigatorio = true
    AND ccs.status = 'pendente';
  IF v_compliance_pendente > 0 THEN
    v_faltantes := array_append(v_faltantes, 'compliance_obrigatorio_pendente');
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_faltantes, 1) IS NULL,
    'faltantes', v_faltantes
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_gate2_completo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_gate2_completo(uuid) TO authenticated;