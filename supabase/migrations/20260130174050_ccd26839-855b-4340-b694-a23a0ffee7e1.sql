-- Tabela principal de franquias
CREATE TABLE public.franquias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  cnpj text,
  regime_tributario text,
  status_contrato text NOT NULL DEFAULT 'pendente_assinatura',
  data_assinatura date,
  data_termino date,
  status_vigencia text DEFAULT 'ativo',
  
  -- Workflow de renovação (4 etapas)
  consultora_informada boolean DEFAULT false,
  renovacao_aceita boolean DEFAULT false,
  novo_contrato_enviado boolean DEFAULT false,
  contrato_novo_assinado boolean DEFAULT false,
  
  -- Controle de NF
  data_emissao_nf date,
  numero_nf text,
  
  observacoes text,
  responsavel_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para busca por CNPJ
CREATE INDEX idx_franquias_cnpj ON public.franquias(cnpj);

-- Índice para filtro por status
CREATE INDEX idx_franquias_status_vigencia ON public.franquias(status_vigencia);

-- Enable RLS
ALTER TABLE public.franquias ENABLE ROW LEVEL SECURITY;

-- Política de visualização: usuários autenticados podem ver
CREATE POLICY "Authenticated users can view franquias"
  ON public.franquias FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de inserção: roles autorizadas
CREATE POLICY "Authorized users can insert franquias"
  ON public.franquias FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

-- Política de atualização: roles autorizadas
CREATE POLICY "Authorized users can update franquias"
  ON public.franquias FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['analista_juridico','consultoria_juridica','administrador']::app_role[]));

-- Política de exclusão: apenas administradores
CREATE POLICY "Admins can delete franquias"
  ON public.franquias FOR DELETE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_franquias_updated_at
  BEFORE UPDATE ON public.franquias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();