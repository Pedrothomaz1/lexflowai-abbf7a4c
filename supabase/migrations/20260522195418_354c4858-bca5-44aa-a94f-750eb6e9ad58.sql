
-- ============================================================
-- FASE C: Funções de Gate 1, Gate 2 e release_intake_to_approval
-- ============================================================

-- Gate 1: Campos mínimos preenchidos para sair de "em_preenchimento" e ir para "revisao_legal"
CREATE OR REPLACE FUNCTION public.check_gate1_completo(_contrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  v_faltantes text[] := ARRAY[]::text[];
  v_tem_original boolean;
BEGIN
  SELECT * INTO c FROM public.contratos WHERE id = _contrato_id;
  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Contrato não encontrado');
  END IF;

  IF c.titulo IS NULL OR length(trim(c.titulo)) = 0 THEN v_faltantes := v_faltantes || 'titulo'; END IF;
  IF c.tipo IS NULL THEN v_faltantes := v_faltantes || 'tipo'; END IF;
  IF c.fornecedor_id IS NULL THEN v_faltantes := v_faltantes || 'fornecedor_id'; END IF;
  IF c.data_inicio IS NULL THEN v_faltantes := v_faltantes || 'data_inicio'; END IF;
  IF c.data_fim IS NULL THEN v_faltantes := v_faltantes || 'data_fim'; END IF;
  IF c.valor_total IS NULL THEN v_faltantes := v_faltantes || 'valor_total'; END IF;
  IF c.departamento_responsavel IS NULL OR length(trim(c.departamento_responsavel)) = 0 THEN
    v_faltantes := v_faltantes || 'departamento_responsavel';
  END IF;
  IF c.centro_custo IS NULL OR length(trim(c.centro_custo)) = 0 THEN
    v_faltantes := v_faltantes || 'centro_custo';
  END IF;
  IF c.renovacao_automatica = true AND (c.dias_aviso_nao_renovacao IS NULL OR c.dias_aviso_nao_renovacao <= 0) THEN
    v_faltantes := v_faltantes || 'dias_aviso_nao_renovacao';
  END IF;

  -- Pelo menos um anexo original
  SELECT EXISTS(
    SELECT 1 FROM public.contract_attachments
    WHERE contrato_id = _contrato_id AND is_original = true
  ) INTO v_tem_original;
  IF NOT v_tem_original THEN
    v_faltantes := v_faltantes || 'anexo_original';
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_faltantes, 1) IS NULL,
    'faltantes', v_faltantes
  );
END;
$$;

-- Gate 2: Revisão legal + compliance + due diligence completos para liberar para aprovação
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

  -- Gate 1 também precisa estar OK
  IF NOT (public.check_gate1_completo(_contrato_id) ->> 'ok')::boolean THEN
    v_faltantes := v_faltantes || 'gate1_incompleto';
  END IF;

  IF c.nivel_risco IS NULL THEN v_faltantes := v_faltantes || 'nivel_risco'; END IF;
  IF c.nivel_confidencialidade IS NULL THEN v_faltantes := v_faltantes || 'nivel_confidencialidade'; END IF;

  -- Due diligence obrigatória para nível alto/crítico
  IF c.nivel_risco IN ('alto','critico') THEN
    IF c.due_diligence_realizada IS NOT TRUE THEN
      v_faltantes := v_faltantes || 'due_diligence_realizada';
    END IF;
    IF c.sanction_check_realizado IS NOT TRUE THEN
      v_faltantes := v_faltantes || 'sanction_check_realizado';
    END IF;
  END IF;

  -- Revisão legal aprovada (append-only, pegar a mais recente)
  SELECT (decisao = 'aprovado') INTO v_revisao_aprovada
  FROM public.intake_legal_reviews
  WHERE contrato_id = _contrato_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_revisao_aprovada IS NOT TRUE THEN
    v_faltantes := v_faltantes || 'revisao_legal_aprovada';
  END IF;

  -- Compliance: nenhum item obrigatório com status 'pendente' ou 'reprovado'
  SELECT COUNT(*) INTO v_compliance_pendente
  FROM public.contract_compliance_status ccs
  JOIN public.compliance_items ci ON ci.id = ccs.compliance_item_id
  WHERE ccs.contrato_id = _contrato_id
    AND ci.obrigatorio = true
    AND ccs.status IN ('pendente','reprovado');
  IF v_compliance_pendente > 0 THEN
    v_faltantes := v_faltantes || 'compliance_obrigatorio_pendente';
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(v_faltantes, 1) IS NULL,
    'faltantes', v_faltantes
  );
END;
$$;

-- Libera o contrato do intake para o fluxo de aprovação
CREATE OR REPLACE FUNCTION public.release_intake_to_approval(_contrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  v_gate jsonb;
  v_org uuid := current_user_org();
BEGIN
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem organização ativa');
  END IF;

  SELECT * INTO c FROM public.contratos WHERE id = _contrato_id AND organization_id = v_org;
  IF c IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato não encontrado nesta organização');
  END IF;

  IF c.intake_status = 'liberado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato já liberado');
  END IF;

  v_gate := public.check_gate2_completo(_contrato_id);
  IF NOT (v_gate ->> 'ok')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gate 2 incompleto',
      'faltantes', v_gate -> 'faltantes'
    );
  END IF;

  UPDATE public.contratos
  SET intake_status = 'liberado',
      status = CASE WHEN status = 'rascunho' THEN 'em_analise'::contract_status ELSE status END,
      updated_at = now()
  WHERE id = _contrato_id;

  PERFORM notify_org_members(
    v_org,
    'intake',
    'Contrato liberado para aprovação: ' || c.titulo,
    'O contrato ' || c.numero_contrato || ' passou pelos gates de intake e está pronto para aprovação.',
    _contrato_id,
    'contrato'
  );

  RETURN jsonb_build_object('success', true, 'contrato_id', _contrato_id);
END;
$$;
