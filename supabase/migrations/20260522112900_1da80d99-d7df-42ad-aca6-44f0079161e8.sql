CREATE TABLE public.sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  empresa TEXT,
  cnpj TEXT,
  usuarios_estimados INTEGER,
  plano_interesse TEXT,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_created_at ON public.sales_leads(created_at DESC);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anon/authenticated) pode criar um lead via página pública
CREATE POLICY "Public can insert leads"
ON public.sales_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Apenas super admins podem ler
CREATE POLICY "Super admins can read leads"
ON public.sales_leads FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Apenas super admins podem atualizar
CREATE POLICY "Super admins can update leads"
ON public.sales_leads FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Apenas super admins podem deletar
CREATE POLICY "Super admins can delete leads"
ON public.sales_leads FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Service role bypassa via JWT claim
CREATE POLICY "Service role full access"
ON public.sales_leads FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER trg_sales_leads_updated_at
BEFORE UPDATE ON public.sales_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();