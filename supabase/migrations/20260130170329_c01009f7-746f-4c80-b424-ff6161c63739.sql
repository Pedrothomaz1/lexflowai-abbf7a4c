-- Criar tabela contract_requests para requisições públicas
CREATE TABLE public.contract_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_requisicao TEXT NOT NULL UNIQUE,
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT NOT NULL,
  solicitante_telefone TEXT,
  departamento TEXT NOT NULL,
  tipo_contrato public.contract_type NOT NULL DEFAULT 'outro',
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  justificativa TEXT,
  valor_estimado NUMERIC,
  urgencia TEXT NOT NULL DEFAULT 'media' CHECK (urgencia IN ('baixa', 'media', 'alta', 'critica')),
  data_necessidade DATE,
  fornecedor_sugerido TEXT,
  anexo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado', 'convertido')),
  analisado_por UUID REFERENCES public.profiles(id),
  analisado_em TIMESTAMP WITH TIME ZONE,
  contrato_id UUID REFERENCES public.contratos(id),
  observacoes_analise TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode inserir (formulário público)
CREATE POLICY "Público pode inserir requisições"
ON public.contract_requests
FOR INSERT
WITH CHECK (true);

-- Política: Apenas usuários autenticados com roles apropriadas podem visualizar
CREATE POLICY "Usuários autenticados podem visualizar requisições"
ON public.contract_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_any_role(auth.uid(), ARRAY['analista_juridico'::app_role, 'consultoria_juridica'::app_role, 'administrador'::app_role])
);

-- Política: Apenas consultores e admins podem atualizar
CREATE POLICY "Consultores e admins podem atualizar requisições"
ON public.contract_requests
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['consultoria_juridica'::app_role, 'administrador'::app_role])
);

-- Política: Apenas admins podem deletar
CREATE POLICY "Admins podem deletar requisições"
ON public.contract_requests
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Criar índices para performance
CREATE INDEX idx_contract_requests_status ON public.contract_requests(status);
CREATE INDEX idx_contract_requests_urgencia ON public.contract_requests(urgencia);
CREATE INDEX idx_contract_requests_created_at ON public.contract_requests(created_at DESC);
CREATE INDEX idx_contract_requests_departamento ON public.contract_requests(departamento);

-- Criar sequência para número de requisição
CREATE SEQUENCE IF NOT EXISTS contract_requests_seq START 1;

-- Função para gerar número de requisição automaticamente
CREATE OR REPLACE FUNCTION public.generate_contract_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_requisicao IS NULL OR NEW.numero_requisicao = '' THEN
    NEW.numero_requisicao := 'REQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('contract_requests_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para gerar número automaticamente
CREATE TRIGGER trigger_generate_request_number
BEFORE INSERT ON public.contract_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_contract_request_number();