-- Helper: avaliar regras condicionais de um stage com base no contrato
CREATE OR REPLACE FUNCTION public.evaluate_stage_rules(_stage_id uuid, _contrato_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regras jsonb;
  v_rule jsonb;
  v_campo text;
  v_op text;
  v_valor jsonb;
  v_jump int;
  v_contrato_valor numeric;
  v_contrato_tipo text;
  v_contrato_area text;
  v_match boolean;
BEGIN
  SELECT regras INTO v_regras FROM workflow_stages WHERE id = _stage_id;
  IF v_regras IS NULL OR jsonb_typeof(v_regras->'rules') <> 'array' THEN
    RETURN NULL;
  END IF;

  SELECT valor_total, tipo::text, COALESCE(departamento_responsavel, '')
    INTO v_contrato_valor, v_contrato_tipo, v_contrato_area
    FROM contratos WHERE id = _contrato_id;

  FOR v_rule IN SELECT * FROM jsonb_array_elements(v_regras->'rules')
  LOOP
    v_campo := v_rule->>'campo';
    v_op := v_rule->>'op';
    v_valor := v_rule->'valor';
    v_jump := NULLIF(v_rule->>'jump_to_ordem','')::int;
    v_match := false;

    IF v_campo = 'valor_total' AND v_contrato_valor IS NOT NULL THEN
      v_match := CASE v_op
        WHEN 'gt'  THEN v_contrato_valor >  (v_valor#>>'{}')::numeric
        WHEN 'gte' THEN v_contrato_valor >= (v_valor#>>'{}')::numeric
        WHEN 'lt'  THEN v_contrato_valor <  (v_valor#>>'{}')::numeric
        WHEN 'lte' THEN v_contrato_valor <= (v_valor#>>'{}')::numeric
        WHEN 'eq'  THEN v_contrato_valor =  (v_valor#>>'{}')::numeric
        ELSE false
      END;
    ELSIF v_campo = 'tipo_contrato' THEN
      v_match := CASE v_op
        WHEN 'eq' THEN v_contrato_tipo = (v_valor#>>'{}')
        WHEN 'in' THEN v_valor ? v_contrato_tipo
        ELSE false
      END;
    ELSIF v_campo = 'area' THEN
      v_match := CASE v_op
        WHEN 'eq' THEN v_contrato_area = (v_valor#>>'{}')
        WHEN 'in' THEN v_valor ? v_contrato_area
        ELSE false
      END;
    END IF;

    IF v_match AND v_jump IS NOT NULL THEN
      RETURN v_jump;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evaluate_stage_rules(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_stage_rules(uuid, uuid) TO service_role;

-- Bootstrap: cria workflow_run automaticamente para um contrato novo
CREATE OR REPLACE FUNCTION public.bootstrap_workflow_run_for_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def_id uuid;
  v_first_stage record;
  v_run_id uuid;
BEGIN
  -- Escolhe a definição ativa mais específica que combina com o contrato
  SELECT d.id INTO v_def_id
  FROM workflow_definitions d
  WHERE d.organization_id = NEW.organization_id
    AND d.is_active = true
    AND (d.escopo_tipo IS NULL OR d.escopo_tipo = NEW.tipo)
    AND (d.escopo_area IS NULL OR d.escopo_area = COALESCE(NEW.departamento_responsavel, ''))
    AND (d.escopo_valor_min IS NULL OR NEW.valor_total >= d.escopo_valor_min)
    AND (d.escopo_valor_max IS NULL OR NEW.valor_total <= d.escopo_valor_max)
    AND EXISTS (SELECT 1 FROM workflow_stages s WHERE s.workflow_definition_id = d.id)
  ORDER BY
    (d.escopo_tipo IS NOT NULL)::int DESC,
    (d.escopo_area IS NOT NULL)::int DESC,
    (d.escopo_valor_min IS NOT NULL OR d.escopo_valor_max IS NOT NULL)::int DESC,
    d.created_at DESC
  LIMIT 1;

  IF v_def_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Primeira etapa
  SELECT id, ordem, sla_horas
    INTO v_first_stage
    FROM workflow_stages
    WHERE workflow_definition_id = v_def_id
    ORDER BY ordem ASC
    LIMIT 1;

  IF v_first_stage IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO workflow_runs (
    organization_id, workflow_definition_id, contrato_id,
    status, current_stage_ordem, created_by
  ) VALUES (
    NEW.organization_id, v_def_id, NEW.id,
    'em_andamento', v_first_stage.ordem, NEW.created_by
  ) RETURNING id INTO v_run_id;

  INSERT INTO workflow_run_stages (
    organization_id, workflow_run_id, stage_id, ordem, status, due_at
  ) VALUES (
    NEW.organization_id, v_run_id, v_first_stage.id, v_first_stage.ordem,
    'pendente',
    CASE WHEN v_first_stage.sla_horas IS NOT NULL
      THEN now() + (v_first_stage.sla_horas || ' hours')::interval
      ELSE NULL END
  );

  -- Notifica organização
  PERFORM notify_org_members(
    NEW.organization_id,
    'workflow',
    'Workflow iniciado: ' || NEW.titulo,
    'Etapa atual: ordem ' || v_first_stage.ordem,
    NEW.id, 'contrato'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear criação do contrato por falha no workflow
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_workflow_run_for_contrato() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_bootstrap_workflow_run ON public.contratos;
CREATE TRIGGER trg_bootstrap_workflow_run
AFTER INSERT ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.bootstrap_workflow_run_for_contrato();

-- Habilita realtime nas tabelas de workflow
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_run_stages;