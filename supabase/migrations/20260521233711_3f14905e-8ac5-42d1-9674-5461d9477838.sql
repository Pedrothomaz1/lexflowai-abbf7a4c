
-- ============================================================
-- TABELA: dashboard_saved_views
-- ============================================================
CREATE TABLE public.dashboard_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_saved_views_org_user ON public.dashboard_saved_views(organization_id, user_id);

ALTER TABLE public.dashboard_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_dashboard_saved_views_select ON public.dashboard_saved_views
  FOR SELECT USING (
    organization_id = current_user_org()
    AND (user_id = auth.uid() OR is_shared = true)
  );

CREATE POLICY mt_dashboard_saved_views_insert ON public.dashboard_saved_views
  FOR INSERT WITH CHECK (
    organization_id = current_user_org() AND user_id = auth.uid()
  );

CREATE POLICY mt_dashboard_saved_views_update ON public.dashboard_saved_views
  FOR UPDATE USING (
    organization_id = current_user_org() AND user_id = auth.uid()
  );

CREATE POLICY mt_dashboard_saved_views_delete ON public.dashboard_saved_views
  FOR DELETE USING (
    organization_id = current_user_org() AND user_id = auth.uid()
  );

CREATE TRIGGER trg_dashboard_saved_views_updated_at
  BEFORE UPDATE ON public.dashboard_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABELA: product_events
-- ============================================================
CREATE TABLE public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_events_org_event ON public.product_events(organization_id, event_name, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY mt_product_events_insert ON public.product_events
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND organization_id = current_user_org())
    OR ((auth.jwt() ->> 'role') = 'service_role')
  );

CREATE POLICY mt_product_events_select ON public.product_events
  FOR SELECT USING (
    organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role)
  );

-- ============================================================
-- KPI RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.dash_kpi_contratos_ativos(
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL,
  p_tipo contract_type[] DEFAULT NULL,
  p_status contract_status[] DEFAULT NULL,
  p_responsavel UUID[] DEFAULT NULL,
  p_fornecedor UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_atual INT;
  v_anterior INT;
  v_inicio DATE := COALESCE(p_periodo_inicio, CURRENT_DATE - INTERVAL '30 days');
  v_fim DATE := COALESCE(p_periodo_fim, CURRENT_DATE);
  v_periodo_dias INT;
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  v_periodo_dias := GREATEST(1, v_fim - v_inicio);

  SELECT COUNT(*) INTO v_atual FROM contratos c
  WHERE c.organization_id = v_org
    AND c.status IN ('vigente','assinado','aprovado')
    AND (p_tipo IS NULL OR c.tipo = ANY(p_tipo))
    AND (p_status IS NULL OR c.status = ANY(p_status))
    AND (p_responsavel IS NULL OR c.created_by = ANY(p_responsavel))
    AND (p_fornecedor IS NULL OR c.fornecedor_id = ANY(p_fornecedor));

  SELECT COUNT(*) INTO v_anterior FROM contratos c
  WHERE c.organization_id = v_org
    AND c.status IN ('vigente','assinado','aprovado')
    AND c.created_at < v_inicio
    AND (p_tipo IS NULL OR c.tipo = ANY(p_tipo));

  RETURN jsonb_build_object(
    'valor', v_atual,
    'delta_pct', CASE WHEN v_anterior > 0 THEN ROUND(((v_atual - v_anterior)::numeric / v_anterior) * 100, 1) ELSE 0 END
  );
END $$;

CREATE OR REPLACE FUNCTION public.dash_kpi_requisicoes_abertas(
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL,
  p_area TEXT[] DEFAULT NULL,
  p_tipo contract_type[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_atual INT;
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  SELECT COUNT(*) INTO v_atual FROM contract_requests r
  WHERE r.organization_id = v_org
    AND r.status IN ('pendente','em_analise')
    AND (p_area IS NULL OR r.departamento = ANY(p_area))
    AND (p_tipo IS NULL OR r.tipo_contrato = ANY(p_tipo));
  RETURN jsonb_build_object('valor', v_atual, 'delta_pct', 0);
END $$;

CREATE OR REPLACE FUNCTION public.dash_kpi_aprovacoes_pendentes(
  p_responsavel UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_atual INT;
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  SELECT COUNT(*) INTO v_atual FROM contract_approvals a
  WHERE a.organization_id = v_org
    AND a.status = 'pendente'
    AND (p_responsavel IS NULL OR a.aprovador_id = ANY(p_responsavel));
  RETURN jsonb_build_object('valor', v_atual, 'delta_pct', 0);
END $$;

CREATE OR REPLACE FUNCTION public.dash_kpi_obrigacoes_atraso(
  p_responsavel UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_atual INT;
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  SELECT COUNT(*) INTO v_atual FROM contract_obligations o
  WHERE o.organization_id = v_org
    AND o.data_vencimento < CURRENT_DATE
    AND COALESCE(o.status,'pendente') <> 'concluido'
    AND (p_responsavel IS NULL OR o.responsavel_id = ANY(p_responsavel));
  RETURN jsonb_build_object('valor', v_atual, 'delta_pct', 0);
END $$;

CREATE OR REPLACE FUNCTION public.dash_kpi_renovacoes_30d(
  p_tipo contract_type[] DEFAULT NULL,
  p_fornecedor UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_atual INT;
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  SELECT COUNT(*) INTO v_atual FROM contratos c
  WHERE c.organization_id = v_org
    AND c.data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND c.status IN ('vigente','assinado','aprovado')
    AND (p_tipo IS NULL OR c.tipo = ANY(p_tipo))
    AND (p_fornecedor IS NULL OR c.fornecedor_id = ANY(p_fornecedor));
  RETURN jsonb_build_object('valor', v_atual, 'delta_pct', 0);
END $$;

CREATE OR REPLACE FUNCTION public.dash_kpi_tempo_medio_assinatura(
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL,
  p_tipo contract_type[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
  v_dias NUMERIC;
  v_inicio DATE := COALESCE(p_periodo_inicio, CURRENT_DATE - INTERVAL '90 days');
  v_fim DATE := COALESCE(p_periodo_fim, CURRENT_DATE);
BEGIN
  IF v_org IS NULL THEN RETURN jsonb_build_object('valor', 0, 'delta_pct', 0); END IF;
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (c.data_assinatura::timestamp - c.created_at)) / 86400.0), 0)
  INTO v_dias FROM contratos c
  WHERE c.organization_id = v_org
    AND c.data_assinatura IS NOT NULL
    AND c.data_assinatura BETWEEN v_inicio AND v_fim
    AND (p_tipo IS NULL OR c.tipo = ANY(p_tipo));
  RETURN jsonb_build_object('valor', ROUND(v_dias, 1), 'delta_pct', 0, 'unidade', 'dias');
END $$;

-- ============================================================
-- SEÇÕES RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.dash_pipeline_contratual(
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL,
  p_tipo contract_type[] DEFAULT NULL
) RETURNS TABLE(status TEXT, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.status::text, COUNT(*)::bigint
  FROM contratos c
  WHERE c.organization_id = current_user_org()
    AND (p_periodo_inicio IS NULL OR c.created_at >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR c.created_at <= p_periodo_fim + INTERVAL '1 day')
    AND (p_tipo IS NULL OR c.tipo = ANY(p_tipo))
  GROUP BY c.status
  ORDER BY c.status;
$$;

CREATE OR REPLACE FUNCTION public.dash_prazos_criticos(
  p_limite INT DEFAULT 10
) RETURNS TABLE(
  id UUID, tipo_registro TEXT, titulo TEXT, data_vencimento DATE,
  dias_restantes INT, status TEXT, contrato_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, 'contrato'::text, titulo, data_fim,
    (data_fim - CURRENT_DATE)::int, status::text, id
  FROM contratos
  WHERE organization_id = current_user_org()
    AND data_fim IS NOT NULL
    AND data_fim BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '60 days'
    AND status NOT IN ('cancelado','encerrado')
  UNION ALL
  SELECT id, 'obrigacao'::text, titulo, data_vencimento,
    (data_vencimento - CURRENT_DATE)::int, COALESCE(status,'pendente'), contrato_id
  FROM contract_obligations
  WHERE organization_id = current_user_org()
    AND data_vencimento BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '60 days'
    AND COALESCE(status,'pendente') <> 'concluido'
  ORDER BY 4 ASC
  LIMIT p_limite;
$$;

CREATE OR REPLACE FUNCTION public.dash_contratos_risco(
  p_limite INT DEFAULT 10
) RETURNS TABLE(
  contrato_id UUID, titulo TEXT, numero_contrato TEXT, score_risco NUMERIC,
  status TEXT, fornecedor_nome TEXT, analisado_em TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.titulo, c.numero_contrato, ca.score_risco,
    c.status::text, f.nome, ca.analisado_em
  FROM contract_analysis ca
  JOIN contratos c ON c.id = ca.contrato_id
  LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
  WHERE ca.organization_id = current_user_org()
    AND ca.score_risco IS NOT NULL
  ORDER BY ca.score_risco DESC NULLS LAST, ca.analisado_em DESC
  LIMIT p_limite;
$$;

CREATE OR REPLACE FUNCTION public.dash_demandas_por_area(
  p_periodo_inicio DATE DEFAULT NULL,
  p_periodo_fim DATE DEFAULT NULL
) RETURNS TABLE(departamento TEXT, total BIGINT, abertas BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT departamento,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status IN ('pendente','em_analise'))::bigint
  FROM contract_requests
  WHERE organization_id = current_user_org()
    AND (p_periodo_inicio IS NULL OR created_at >= p_periodo_inicio)
    AND (p_periodo_fim IS NULL OR created_at <= p_periodo_fim + INTERVAL '1 day')
  GROUP BY departamento
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.dash_aprovacoes_acao(
  p_apenas_meus BOOLEAN DEFAULT false,
  p_limite INT DEFAULT 20
) RETURNS TABLE(
  aprovacao_id UUID, contrato_id UUID, titulo TEXT, numero_contrato TEXT,
  aprovador_id UUID, created_at TIMESTAMPTZ, comentario TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, c.id, c.titulo, c.numero_contrato,
    a.aprovador_id, a.created_at, a.comentario
  FROM contract_approvals a
  JOIN contratos c ON c.id = a.contrato_id
  WHERE a.organization_id = current_user_org()
    AND a.status = 'pendente'
    AND (NOT p_apenas_meus OR a.aprovador_id = auth.uid())
  ORDER BY a.created_at ASC
  LIMIT p_limite;
$$;

CREATE OR REPLACE FUNCTION public.dash_obrigacoes_vencidas(
  p_limite INT DEFAULT 20
) RETURNS TABLE(
  id UUID, contrato_id UUID, titulo TEXT, data_vencimento DATE,
  dias_atraso INT, valor NUMERIC, status TEXT, responsavel_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, contrato_id, titulo, data_vencimento,
    (CURRENT_DATE - data_vencimento)::int, valor,
    COALESCE(status,'pendente'), responsavel_id
  FROM contract_obligations
  WHERE organization_id = current_user_org()
    AND COALESCE(status,'pendente') <> 'concluido'
    AND data_vencimento BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE + INTERVAL '7 days'
  ORDER BY data_vencimento ASC
  LIMIT p_limite;
$$;

CREATE OR REPLACE FUNCTION public.dash_evolucao_temporal(
  p_metrica TEXT DEFAULT 'contratos_criados',
  p_meses INT DEFAULT 6
) RETURNS TABLE(periodo TEXT, valor BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := current_user_org();
BEGIN
  IF v_org IS NULL THEN RETURN; END IF;
  IF p_metrica = 'requisicoes' THEN
    RETURN QUERY
    SELECT TO_CHAR(date_trunc('month', r.created_at), 'YYYY-MM'),
      COUNT(*)::bigint
    FROM contract_requests r
    WHERE r.organization_id = v_org
      AND r.created_at >= date_trunc('month', CURRENT_DATE) - (p_meses || ' months')::interval
    GROUP BY 1 ORDER BY 1;
  ELSIF p_metrica = 'assinaturas' THEN
    RETURN QUERY
    SELECT TO_CHAR(date_trunc('month', c.data_assinatura), 'YYYY-MM'),
      COUNT(*)::bigint
    FROM contratos c
    WHERE c.organization_id = v_org
      AND c.data_assinatura IS NOT NULL
      AND c.data_assinatura >= (date_trunc('month', CURRENT_DATE) - (p_meses || ' months')::interval)::date
    GROUP BY 1 ORDER BY 1;
  ELSE
    RETURN QUERY
    SELECT TO_CHAR(date_trunc('month', c.created_at), 'YYYY-MM'),
      COUNT(*)::bigint
    FROM contratos c
    WHERE c.organization_id = v_org
      AND c.created_at >= date_trunc('month', CURRENT_DATE) - (p_meses || ' months')::interval
    GROUP BY 1 ORDER BY 1;
  END IF;
END $$;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_obligations;
