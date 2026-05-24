
-- =========== #14 IA APLICADA ===========
CREATE TABLE public.contract_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('resumo_executivo','sugestao_clausulas','redline','risco_pontual')),
  conteudo JSONB NOT NULL,
  model TEXT,
  tokens_usados INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_insights_contrato ON public.contract_ai_insights(contrato_id, tipo);
ALTER TABLE public.contract_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_select_org" ON public.contract_ai_insights
  FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "ai_insights_insert_org" ON public.contract_ai_insights
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());

CREATE POLICY "ai_insights_service_role" ON public.contract_ai_insights
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =========== #15 PORTAL EXTERNO ===========
CREATE TABLE public.portal_externo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  contraparte_email TEXT NOT NULL,
  contraparte_nome TEXT,
  escopo TEXT NOT NULL DEFAULT 'view' CHECK (escopo IN ('view','comment','sign')),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  access_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_tokens_org ON public.portal_externo_tokens(organization_id);
CREATE INDEX idx_portal_tokens_contrato ON public.portal_externo_tokens(contrato_id);
ALTER TABLE public.portal_externo_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_tokens_select_org" ON public.portal_externo_tokens
  FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "portal_tokens_admin_manage" ON public.portal_externo_tokens
  FOR ALL TO authenticated
  USING (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (organization_id = current_user_org() AND has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "portal_tokens_service_role" ON public.portal_externo_tokens
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE public.portal_externo_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  token_id UUID NOT NULL REFERENCES public.portal_externo_tokens(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL,
  acao TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_eventos_token ON public.portal_externo_eventos(token_id);
ALTER TABLE public.portal_externo_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_eventos_select_org" ON public.portal_externo_eventos
  FOR SELECT TO authenticated
  USING (organization_id = current_user_org());

CREATE POLICY "portal_eventos_service_role" ON public.portal_externo_eventos
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
