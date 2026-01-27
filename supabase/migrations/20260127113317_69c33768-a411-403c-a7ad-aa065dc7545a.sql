-- Tabela para redlining/markup de contratos
CREATE TABLE public.contract_redlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  conteudo_original text NOT NULL,
  conteudo_marcado text NOT NULL,
  alteracoes jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'accepted', 'rejected')),
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- Índices para performance
CREATE INDEX idx_contract_redlines_contrato ON public.contract_redlines(contrato_id);
CREATE INDEX idx_contract_redlines_status ON public.contract_redlines(status);
CREATE INDEX idx_contract_redlines_created_by ON public.contract_redlines(created_by);

-- Habilitar RLS
ALTER TABLE public.contract_redlines ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view redlines on accessible contracts"
ON public.contract_redlines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contratos 
    WHERE contratos.id = contract_redlines.contrato_id
  )
);

CREATE POLICY "Authorized users can create redlines"
ON public.contract_redlines
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
  AND auth.uid() = created_by
);

CREATE POLICY "Authors can update their own draft redlines"
ON public.contract_redlines
FOR UPDATE
USING (
  (created_by = auth.uid() AND status = 'draft')
  OR has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role])
);

CREATE POLICY "Admins can delete redlines"
ON public.contract_redlines
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
);