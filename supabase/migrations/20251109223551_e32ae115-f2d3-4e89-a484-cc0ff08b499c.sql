-- Criar tabela de assinaturas eletrônicas
CREATE TABLE public.contract_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('docusign', 'clicksign', 'd4sign', 'custom')),
  external_id TEXT NOT NULL,
  signers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'completed', 'declined', 'expired', 'cancelled')),
  document_url TEXT,
  signed_document_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_contract_signatures_contrato ON public.contract_signatures(contrato_id);
CREATE INDEX idx_contract_signatures_status ON public.contract_signatures(status);
CREATE INDEX idx_contract_signatures_external ON public.contract_signatures(external_id);
CREATE INDEX idx_contract_signatures_provider ON public.contract_signatures(provider);

-- Habilitar RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem visualizar assinaturas"
ON public.contract_signatures
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem criar assinaturas"
ON public.contract_signatures
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Sistema pode atualizar assinaturas via webhook"
ON public.contract_signatures
FOR UPDATE
USING (true);

CREATE POLICY "Admins podem deletar assinaturas"
ON public.contract_signatures
FOR DELETE
USING (has_role(auth.uid(), 'administrador'));

-- Trigger para updated_at
CREATE TRIGGER update_contract_signatures_updated_at
BEFORE UPDATE ON public.contract_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_signatures;