
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at DATE,
  ADD COLUMN IF NOT EXISTS proximo_vencimento DATE,
  ADD COLUMN IF NOT EXISTS ultimo_pagamento_em DATE,
  ADD COLUMN IF NOT EXISTS ciclo_cobranca TEXT NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS valor_mensal_centavos INTEGER,
  ADD COLUMN IF NOT EXISTS notas_cobranca TEXT;

CREATE TABLE IF NOT EXISTS public.billing_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  data_alvo DATE NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  destinatarios TEXT[] NOT NULL DEFAULT '{}',
  detalhes JSONB,
  UNIQUE (organization_id, tipo, data_alvo)
);

CREATE INDEX IF NOT EXISTS idx_billing_alerts_log_org ON public.billing_alerts_log(organization_id, enviado_em DESC);

ALTER TABLE public.billing_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admins read billing_alerts_log"
  ON public.billing_alerts_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "service role manages billing_alerts_log"
  ON public.billing_alerts_log FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- RPC para super admin atualizar billing de uma org
CREATE OR REPLACE FUNCTION public.super_admin_update_billing(
  _org_id UUID,
  _trial_ends_at DATE DEFAULT NULL,
  _proximo_vencimento DATE DEFAULT NULL,
  _ultimo_pagamento_em DATE DEFAULT NULL,
  _ciclo_cobranca TEXT DEFAULT NULL,
  _valor_mensal_centavos INTEGER DEFAULT NULL,
  _notas_cobranca TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  UPDATE public.organizations
  SET trial_ends_at = COALESCE(_trial_ends_at, trial_ends_at),
      proximo_vencimento = COALESCE(_proximo_vencimento, proximo_vencimento),
      ultimo_pagamento_em = COALESCE(_ultimo_pagamento_em, ultimo_pagamento_em),
      ciclo_cobranca = COALESCE(_ciclo_cobranca, ciclo_cobranca),
      valor_mensal_centavos = COALESCE(_valor_mensal_centavos, valor_mensal_centavos),
      notas_cobranca = COALESCE(_notas_cobranca, notas_cobranca)
  WHERE id = _org_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.super_admin_update_billing(UUID, DATE, DATE, DATE, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_update_billing(UUID, DATE, DATE, DATE, TEXT, INTEGER, TEXT) TO authenticated;
