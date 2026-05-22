
-- plan_pricing
CREATE TABLE public.plan_pricing (
  plano TEXT PRIMARY KEY,
  nome_exibicao TEXT NOT NULL,
  preco_mensal_centavos INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de preços para autenticados"
  ON public.plan_pricing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia preços"
  ON public.plan_pricing FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_plan_pricing_updated
  BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_pricing (plano, nome_exibicao, preco_mensal_centavos) VALUES
  ('free', 'Free', 0),
  ('pro', 'Pro', 49700),
  ('enterprise', 'Enterprise', 149700);

-- onboarding_email_log
CREATE TABLE public.onboarding_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  step SMALLINT NOT NULL CHECK (step IN (0,1,3,5,7)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  UNIQUE (organization_id, step)
);
ALTER TABLE public.onboarding_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin lê onboarding log"
  ON public.onboarding_email_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Service role gerencia onboarding log"
  ON public.onboarding_email_log FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX idx_onboarding_log_org ON public.onboarding_email_log(organization_id);
CREATE INDEX idx_onboarding_log_sent ON public.onboarding_email_log(sent_at DESC);

-- onboarding_settings
CREATE TABLE public.onboarding_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin gerencia onboarding settings"
  ON public.onboarding_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.onboarding_settings (id, enabled) VALUES (1, true);

-- calculate_mrr()
CREATE OR REPLACE FUNCTION public.calculate_mrr()
RETURNS TABLE(
  mrr_total_centavos BIGINT,
  por_plano JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breakdown JSONB;
  v_total BIGINT;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COALESCE(SUM(p.preco_mensal_centavos * c.cnt), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'plano', p.plano,
      'nome', p.nome_exibicao,
      'preco_centavos', p.preco_mensal_centavos,
      'clientes', c.cnt,
      'mrr_centavos', p.preco_mensal_centavos * c.cnt
    ) ORDER BY p.preco_mensal_centavos DESC), '[]'::jsonb)
  INTO v_total, v_breakdown
  FROM public.plan_pricing p
  LEFT JOIN (
    SELECT plano, COUNT(*)::BIGINT AS cnt
    FROM public.organizations
    WHERE status = 'ativa'
    GROUP BY plano
  ) c ON c.plano = p.plano;

  RETURN QUERY SELECT v_total, v_breakdown;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_mrr() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_mrr() TO authenticated;
