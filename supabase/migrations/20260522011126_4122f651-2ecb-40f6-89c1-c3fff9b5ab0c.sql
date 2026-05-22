
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.signature_envelope_status AS ENUM (
    'rascunho','enviado','parcialmente_assinado','concluido','recusado','cancelado','expirado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.signature_signer_lado AS ENUM ('empresa','contraparte','testemunha');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.signature_signer_status AS ENUM ('pendente','visualizado','assinado','recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ ENVELOPES ============
CREATE TABLE public.signature_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  provedor TEXT NOT NULL DEFAULT 'zapsign',
  provedor_envelope_id TEXT,
  status public.signature_envelope_status NOT NULL DEFAULT 'rascunho',
  assunto TEXT,
  mensagem TEXT,
  signed_file_url TEXT,
  original_file_url TEXT,
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sig_env_org ON public.signature_envelopes(organization_id);
CREATE INDEX idx_sig_env_contrato ON public.signature_envelopes(contrato_id);
CREATE INDEX idx_sig_env_status ON public.signature_envelopes(status);
CREATE INDEX idx_sig_env_provedor_id ON public.signature_envelopes(provedor_envelope_id);

ALTER TABLE public.signature_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envelopes_select_org" ON public.signature_envelopes
  FOR SELECT USING (organization_id = current_user_org());

CREATE POLICY "envelopes_insert_org" ON public.signature_envelopes
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['administrador','analista_juridico']::app_role[])
  );

CREATE POLICY "envelopes_update_org" ON public.signature_envelopes
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['administrador','analista_juridico']::app_role[])
  );

CREATE POLICY "envelopes_service_role" ON public.signature_envelopes
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER trg_sig_env_updated_at
  BEFORE UPDATE ON public.signature_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sig_env_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.signature_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============ SIGNERS ============
CREATE TABLE public.signature_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  envelope_id UUID NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE CASCADE,
  provedor_signer_id TEXT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  lado public.signature_signer_lado NOT NULL DEFAULT 'contraparte',
  ordem INT NOT NULL DEFAULT 1,
  status public.signature_signer_status NOT NULL DEFAULT 'pendente',
  signed_at TIMESTAMPTZ,
  sign_url TEXT,
  ip_address TEXT,
  geolocation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sig_signers_env ON public.signature_signers(envelope_id);
CREATE INDEX idx_sig_signers_org ON public.signature_signers(organization_id);
CREATE INDEX idx_sig_signers_provedor ON public.signature_signers(provedor_signer_id);

ALTER TABLE public.signature_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signers_select_org" ON public.signature_signers
  FOR SELECT USING (organization_id = current_user_org());

CREATE POLICY "signers_insert_org" ON public.signature_signers
  FOR INSERT WITH CHECK (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['administrador','analista_juridico']::app_role[])
  );

CREATE POLICY "signers_update_org" ON public.signature_signers
  FOR UPDATE USING (
    organization_id = current_user_org()
    AND has_any_role(auth.uid(), ARRAY['administrador','analista_juridico']::app_role[])
  );

CREATE POLICY "signers_service_role" ON public.signature_signers
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER trg_sig_signers_updated_at
  BEFORE UPDATE ON public.signature_signers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EVENTS ============
CREATE TABLE public.signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  envelope_id UUID NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.signature_signers(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sig_events_env ON public.signature_events(envelope_id);
CREATE INDEX idx_sig_events_org ON public.signature_events(organization_id);
CREATE INDEX idx_sig_events_created ON public.signature_events(created_at DESC);

ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_org" ON public.signature_events
  FOR SELECT USING (organization_id = current_user_org());

CREATE POLICY "events_service_role" ON public.signature_events
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
